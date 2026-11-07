const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { HttpError } = require('../utils/errors');
const { str } = require('../utils/validate');

const router = express.Router();

const TAG_RE = /^[A-Za-zА-Яа-яЁё0-9]{2,5}$/;

function parseClanInput(body) {
  const name = str(body.name);
  const tag = str(body.tag).toUpperCase();
  const description = str(body.description);
  if (name.length < 3 || name.length > 32) throw new HttpError(400, 'Название клана: от 3 до 32 символов');
  if (!TAG_RE.test(tag)) throw new HttpError(400, 'Тег клана: 2–5 букв или цифр');
  if (description.length > 200) throw new HttpError(400, 'Описание клана: максимум 200 символов');
  return { name, tag, description };
}

const CLAN_SELECT = `
  SELECT c.id, c.name, c.tag, c.description, c.created_at, c.owner_id,
         ou.username AS owner_username,
         (SELECT COUNT(*)::int FROM clan_members m WHERE m.clan_id = c.id) AS members_count
  FROM clans c LEFT JOIN users ou ON ou.id = c.owner_id`;

async function getClan(db, id) {
  const { rows } = await db.query(`${CLAN_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function myMembership(db, userId) {
  const { rows } = await db.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// ---------- Список / поиск ----------
router.get('/', async (req, res) => {
  const q = str(req.query.q);
  const { rows } = await pool.query(
    `${CLAN_SELECT}
     WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.tag ILIKE '%' || $1 || '%'
     ORDER BY members_count DESC, c.created_at ASC LIMIT 50`,
    [q]
  );
  res.json(rows);
});

// ---------- Клан по id (с участниками) ----------
router.get('/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(404, 'Клан не найден');
  const clan = await getClan(pool, id);
  if (!clan) throw new HttpError(404, 'Клан не найден');

  const members = await pool.query(
    `SELECT u.id, u.username, u.handle, u.is_verified, u.avatar_version, u.rating, m.role, m.joined_at
     FROM clan_members m JOIN users u ON u.id = m.user_id
     WHERE m.clan_id = $1
     ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.joined_at ASC`,
    [id]
  );
  let myRole = null;
  if (req.user) {
    const mine = members.rows.find((m) => m.id === req.user.id);
    myRole = mine ? mine.role : null;
  }
  res.json({ ...clan, members: members.rows, my_role: myRole });
});

// ---------- Создание ----------
router.post('/', requireAuth, async (req, res) => {
  const { name, tag, description } = parseClanInput(req.body);
  try {
    const clanId = await withTransaction(async (db) => {
      if (await myMembership(db, req.user.id)) throw new HttpError(400, 'Сначала выйдите из текущего клана');
      const { rows } = await db.query(
        'INSERT INTO clans (name, tag, description, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, tag, description, req.user.id]
      );
      await db.query("INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'owner')", [rows[0].id, req.user.id]);
      return rows[0].id;
    });
    res.json(await getClan(pool, clanId));
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(400, err.constraint === 'clans_tag_key' ? 'Такой тег уже занят' : 'Клан с таким названием уже есть');
    }
    throw err;
  }
});

// ---------- Редактирование (только владелец) ----------
router.put('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, tag, description } = parseClanInput(req.body);
  const clan = await getClan(pool, id);
  if (!clan) throw new HttpError(404, 'Клан не найден');
  if (clan.owner_id !== req.user.id) throw new HttpError(403, 'Редактировать клан может только владелец');
  try {
    await pool.query('UPDATE clans SET name = $1, tag = $2, description = $3 WHERE id = $4', [name, tag, description, id]);
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(400, err.constraint === 'clans_tag_key' ? 'Такой тег уже занят' : 'Клан с таким названием уже есть');
    }
    throw err;
  }
  res.json(await getClan(pool, id));
});

// ---------- Вступление ----------
router.post('/:id/join', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const clan = await withTransaction(async (db) => {
    const found = await getClan(db, id);
    if (!found) throw new HttpError(404, 'Клан не найден');
    if (await myMembership(db, req.user.id)) throw new HttpError(400, 'Вы уже состоите в клане');
    await db.query("INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'member')", [id, req.user.id]);
    return found;
  });
  if (clan.owner_username) await createNotification(clan.owner_username, req.user.username, 'clan_join', null, clan.name);
  res.json(await getClan(pool, id));
});

// ---------- Выход ----------
router.post('/:id/leave', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const result = await withTransaction(async (db) => {
    const mine = await db.query('SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2', [id, req.user.id]);
    if (!mine.rows.length) throw new HttpError(400, 'Вы не состоите в этом клане');
    await db.query('DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2', [id, req.user.id]);

    if (mine.rows[0].role === 'owner') {
      // Владелец ушёл: власть переходит к самому старому участнику, а пустой клан удаляется.
      const next = await db.query('SELECT user_id FROM clan_members WHERE clan_id = $1 ORDER BY joined_at ASC LIMIT 1', [id]);
      if (next.rows.length) {
        await db.query("UPDATE clan_members SET role = 'owner' WHERE clan_id = $1 AND user_id = $2", [id, next.rows[0].user_id]);
        await db.query('UPDATE clans SET owner_id = $1 WHERE id = $2', [next.rows[0].user_id, id]);
      } else {
        await db.query('DELETE FROM clans WHERE id = $1', [id]);
        return { deleted: true };
      }
    }
    return { deleted: false };
  });
  res.json({ success: true, ...result });
});

// ---------- Исключить участника (владелец) ----------
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const targetId = Number(req.params.userId);
  const clan = await getClan(pool, id);
  if (!clan) throw new HttpError(404, 'Клан не найден');
  if (clan.owner_id !== req.user.id) throw new HttpError(403, 'Исключать участников может только владелец');
  if (targetId === req.user.id) throw new HttpError(400, 'Себя исключить нельзя — используйте «Выйти»');
  await pool.query('DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2', [id, targetId]);
  res.json({ success: true });
});

// ---------- Распустить клан (владелец) ----------
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const clan = await getClan(pool, id);
  if (!clan) throw new HttpError(404, 'Клан не найден');
  if (clan.owner_id !== req.user.id) throw new HttpError(403, 'Распустить клан может только владелец');
  await pool.query('DELETE FROM clans WHERE id = $1', [id]);
  res.json({ success: true });
});

module.exports = router;
