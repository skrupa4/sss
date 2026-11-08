const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { fetchUser } = require('../services/users');
const { createNotification } = require('../services/notifications');
const { HttpError } = require('../utils/errors');
const { isReservedName } = require('../utils/reserved');
const { getAchievements, checkAchievements } = require('../services/achievements');
const { validateUsername, validateHandle, validateBio } = require('../utils/validate');

const router = express.Router();

// Все таблицы, где пользователь хранится по имени.
const USERNAME_REFS = [
  ['posts', 'username'],
  ['comments', 'username'],
  ['post_likes', 'username'],
  ['reposts', 'username'],
  ['follows', 'follower_username'],
  ['follows', 'following_username'],
  ['messages', 'sender'],
  ['messages', 'receiver'],
  ['notifications', 'user_from'],
  ['notifications', 'user_to'],
];

const AVATAR_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_AVATAR_BYTES = 400 * 1024;

// ---------- Профиль текущего пользователя ----------
router.put('/me', requireAuth, async (req, res) => {
  const username = validateUsername(req.body.username);
  const handle = validateHandle(req.body.handle);
  const bio = validateBio(req.body.bio);
  const userId = req.user.id;
  if (!req.user.is_admin && (isReservedName(username) || isReservedName(handle))) {
    throw new HttpError(400, 'Это имя зарезервировано');
  }

  try {
    await withTransaction(async (db) => {
      const { rows } = await db.query('SELECT username, handle FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (!rows.length) throw new HttpError(404, 'Пользователь не найден');
      const current = rows[0];

      if (username !== current.username) {
        const taken = await db.query('SELECT 1 FROM users WHERE username = $1 AND id <> $2', [username, userId]);
        if (taken.rows.length) throw new HttpError(400, 'Пользователь с таким именем уже существует');
      }
      if (handle !== current.handle) {
        const taken = await db.query('SELECT 1 FROM users WHERE handle = $1 AND id <> $2', [handle, userId]);
        if (taken.rows.length) throw new HttpError(400, 'Такой хэндл уже занят');
      }

      await db.query('UPDATE users SET username = $1, handle = $2, bio = $3 WHERE id = $4', [username, handle, bio, userId]);

      if (username !== current.username) {
        for (const [table, column] of USERNAME_REFS) {
          await db.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [username, current.username]);
        }
      }
    });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(400, 'Никнейм или хэндл уже заняты');
    throw err;
  }

  await checkAchievements(userId);
  res.json(await fetchUser(pool, 'id', userId, { withEmail: true }));
});

// На кого я подписан (нужно ленте подписок для «живых» обновлений).
router.get('/me/following', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT following_username FROM follows WHERE follower_username = $1', [req.user.username]);
  res.json(rows.map((r) => r.following_username));
});

router.post('/me/avatar', requireAuth, async (req, res) => {
  const match = AVATAR_RE.exec(typeof req.body.image === 'string' ? req.body.image : '');
  if (!match) throw new HttpError(400, 'Нужна картинка PNG, JPEG или WebP');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_AVATAR_BYTES) {
    throw new HttpError(400, 'Картинка слишком большая (максимум 400 КБ)');
  }
  await pool.query(
    'UPDATE users SET avatar = $1, avatar_type = $2, avatar_version = COALESCE(avatar_version, 0) + 1 WHERE id = $3',
    [buffer, match[1], req.user.id]
  );
  await checkAchievements(req.user.id);
  res.json(await fetchUser(pool, 'id', req.user.id, { withEmail: true }));
});

router.delete('/me/avatar', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE users SET avatar = NULL, avatar_type = NULL, avatar_version = 0 WHERE id = $1',
    [req.user.id]
  );
  res.json(await fetchUser(pool, 'id', req.user.id, { withEmail: true }));
});

// ---------- Публичные данные ----------
router.get('/:username/avatar', async (req, res) => {
  const { rows } = await pool.query('SELECT avatar, avatar_type FROM users WHERE username = $1', [req.params.username]);
  if (!rows.length || !rows[0].avatar) return res.status(404).end();
  res.set('Content-Type', rows[0].avatar_type || 'image/jpeg');
  // Адрес содержит ?v=<версия>, поэтому кешировать можно «навсегда».
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(rows[0].avatar);
});

router.get('/:username/achievements', async (req, res) => {
  const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  if (!rows.length) throw new HttpError(404, 'Юзер не найден');
  const data = await getAchievements(rows[0].id);
  res.json({ unlocked: data.unlocked, total: data.total, items: data.items });
});

router.get('/:username', optionalAuth, async (req, res) => {
  const user = await fetchUser(pool, 'username', req.params.username);
  if (!user) throw new HttpError(404, 'Юзер не найден');
  user.is_subscribed = false;
  if (req.user) {
    const follow = await pool.query(
      'SELECT 1 FROM follows WHERE follower_username = $1 AND following_username = $2',
      [req.user.username, user.username]
    );
    user.is_subscribed = follow.rows.length > 0;
  }
  res.json(user);
});

// ---------- Подписки ----------
router.post('/:username/follow', requireAuth, async (req, res) => {
  const target = req.params.username;
  const follower = req.user.username;
  if (target === follower) throw new HttpError(400, 'Нельзя подписаться на себя');

  const created = await withTransaction(async (db) => {
    const exists = await db.query('SELECT 1 FROM users WHERE username = $1', [target]);
    if (!exists.rows.length) throw new HttpError(404, 'Пользователь не найден');

    const inserted = await db.query(
      `INSERT INTO follows (follower_username, following_username) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING 1`,
      [follower, target]
    );
    if (!inserted.rows.length) return false;
    await db.query('UPDATE users SET followers = followers + 1 WHERE username = $1', [target]);
    await db.query('UPDATE users SET following = following + 1 WHERE username = $1', [follower]);
    return true;
  });

  if (created) {
    await createNotification(target, follower, 'follow');
    await checkAchievements(req.user.id);
    const t = await pool.query('SELECT id FROM users WHERE username = $1', [target]);
    if (t.rows[0]) await checkAchievements(t.rows[0].id);
  }
  res.json({ success: true });
});

router.delete('/:username/follow', requireAuth, async (req, res) => {
  const target = req.params.username;
  const follower = req.user.username;
  await withTransaction(async (db) => {
    const removed = await db.query(
      'DELETE FROM follows WHERE follower_username = $1 AND following_username = $2',
      [follower, target]
    );
    if (removed.rowCount > 0) {
      await db.query('UPDATE users SET followers = GREATEST(0, followers - 1) WHERE username = $1', [target]);
      await db.query('UPDATE users SET following = GREATEST(0, following - 1) WHERE username = $1', [follower]);
    }
  });
  res.json({ success: true });
});

module.exports = router;
