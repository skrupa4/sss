const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { getSettings, saveSettings } = require('../services/settings');
const { checkAchievements } = require('../services/achievements');
const { broadcast } = require('../services/realtime');
const { addCoins } = require('../services/coins');
const { createNotification } = require('../services/notifications');
const { sendPushToUsername } = require('../services/push');
const { HttpError } = require('../utils/errors');
const { str, validateText } = require('../utils/validate');

const router = express.Router();
router.use(requireAdmin);

const likePattern = (q) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

// ---------- Обзор ----------
router.get('/stats', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users)::int AS users,
       (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_users_week,
       (SELECT COUNT(*) FROM users WHERE is_admin OR (premium_until IS NOT NULL AND premium_until > NOW()))::int AS premium_users,
       (SELECT COUNT(*) FROM users WHERE is_banned)::int AS banned_users,
       (SELECT COUNT(*) FROM posts)::int AS posts,
       (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '1 day')::int AS posts_today,
       (SELECT COUNT(*) FROM comments)::int AS comments,
       (SELECT COUNT(*) FROM messages)::int AS messages,
       (SELECT COUNT(*) FROM clans)::int AS clans,
       (SELECT COUNT(*) FROM stories WHERE expires_at > NOW())::int AS active_stories,
       (SELECT COUNT(*) FROM verification_requests WHERE status = 'pending')::int AS pending_verifications,
       (SELECT COALESCE(SUM(amount_rub), 0) FROM coin_orders WHERE status = 'paid')::int AS revenue_rub,
       (SELECT COALESCE(SUM(coins), 0) FROM coin_orders WHERE status = 'paid')::int AS coins_sold`
  );
  res.json(rows[0]);
});

// ---------- Пользователи ----------
router.get('/users', async (req, res) => {
  const q = str(req.query.q);
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.handle, u.email, u.created_at, u.avatar_version, u.is_verified, u.is_banned, u.is_admin, u.coins,
            u.premium_until, (u.premium_until IS NOT NULL AND u.premium_until > NOW()) AS premium_active,
            (SELECT COUNT(*)::int FROM posts p WHERE p.username = u.username) AS posts
     FROM users u
     WHERE $1 = '' OR u.username ILIKE $2 OR u.handle ILIKE $2 OR u.email ILIKE $2
     ORDER BY u.created_at DESC, u.id DESC LIMIT 100`,
    [q, likePattern(q)]
  );
  res.json(rows);
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT id, username, is_admin FROM users WHERE id = $1', [id]);
  if (!rows.length) throw new HttpError(404, 'Пользователь не найден');
  const target = rows[0];
  const { is_verified, is_banned, premium_days, revoke_premium, coins_delta } = req.body;

  if (typeof is_banned === 'boolean') {
    if (target.id === req.user.id || target.is_admin) throw new HttpError(400, 'Администратора заблокировать нельзя');
    await pool.query('UPDATE users SET is_banned = $1 WHERE id = $2', [is_banned, id]);
  }
  if (typeof is_verified === 'boolean') {
    await pool.query('UPDATE users SET is_verified = $1 WHERE id = $2', [is_verified, id]);
  }
  if (premium_days !== undefined) {
    const days = Number(premium_days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new HttpError(400, 'Срок Premium: от 1 до 3650 дней');
    await pool.query(
      `UPDATE users SET premium_until = GREATEST(NOW(), COALESCE(premium_until, NOW())) + ($2 || ' days')::interval WHERE id = $1`,
      [id, String(days)]
    );
  }
  if (coins_delta !== undefined) {
    const delta = Number(coins_delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) throw new HttpError(400, 'Количество монет: целое число, не больше 1 000 000');
    await addCoins(pool, id, delta);
  }
  if (revoke_premium === true) {
    await pool.query('UPDATE users SET premium_until = NULL, nick_color = NULL WHERE id = $1', [id]);
  }
  await checkAchievements(id);
  res.json({ success: true });
});

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const found = await pool.query('SELECT username, is_admin FROM users WHERE id = $1', [id]);
  if (!found.rows.length) throw new HttpError(404, 'Пользователь не найден');
  const { username, is_admin } = found.rows[0];
  if (id === req.user.id || is_admin) throw new HttpError(400, 'Администратора удалить нельзя');

  await withTransaction(async (db) => {
    // Запоминаем посты, чьи счётчики придётся пересчитать после удаления лайков/репостов/комментариев.
    const touched = await db.query(
      `SELECT post_id FROM post_likes WHERE username = $1
       UNION SELECT post_id FROM reposts WHERE username = $1
       UNION SELECT post_id FROM comments WHERE username = $1`,
      [username]
    );
    // Кланы удаляемого: власть переходит старейшему участнику, пустой клан удаляется.
    const owned = await db.query('SELECT id FROM clans WHERE owner_id = $1', [id]);
    for (const clan of owned.rows) {
      const next = await db.query('SELECT user_id FROM clan_members WHERE clan_id = $1 AND user_id <> $2 ORDER BY joined_at LIMIT 1', [clan.id, id]);
      if (next.rows.length) {
        await db.query('UPDATE clans SET owner_id = $1 WHERE id = $2', [next.rows[0].user_id, clan.id]);
        await db.query("UPDATE clan_members SET role = 'owner' WHERE clan_id = $1 AND user_id = $2", [clan.id, next.rows[0].user_id]);
      } else {
        await db.query('DELETE FROM clans WHERE id = $1', [clan.id]);
      }
    }
    await db.query('UPDATE users SET followers = GREATEST(0, followers - 1) WHERE username IN (SELECT following_username FROM follows WHERE follower_username = $1)', [username]);
    await db.query('UPDATE users SET following = GREATEST(0, following - 1) WHERE username IN (SELECT follower_username FROM follows WHERE following_username = $1)', [username]);
    await db.query('DELETE FROM follows WHERE follower_username = $1 OR following_username = $1', [username]);
    await db.query('DELETE FROM post_likes WHERE username = $1', [username]);
    await db.query('DELETE FROM reposts WHERE username = $1', [username]);
    await db.query('DELETE FROM comments WHERE username = $1', [username]);
    await db.query('DELETE FROM posts WHERE username = $1', [username]);
    await db.query('DELETE FROM messages WHERE sender = $1 OR receiver = $1', [username]);
    await db.query('DELETE FROM notifications WHERE user_to = $1 OR user_from = $1', [username]);
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    const ids = touched.rows.map((r) => r.post_id);
    if (ids.length) {
      await db.query(
        `UPDATE posts p SET
           likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id),
           reposts = (SELECT COUNT(*) FROM reposts WHERE post_id = p.id),
           comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = p.id)
         WHERE p.id = ANY($1)`,
        [ids]
      );
    }
  });
  res.json({ success: true });
});

// ---------- Контент ----------
router.get('/posts', async (req, res) => {
  const q = str(req.query.q);
  const { rows } = await pool.query(
    `SELECT id, username, content, likes, comments_count, reposts, created_at
     FROM posts WHERE $1 = '' OR content ILIKE $2 OR username ILIKE $2
     ORDER BY created_at DESC, id DESC LIMIT 50`,
    [q, likePattern(q)]
  );
  res.json(rows);
});

router.delete('/posts/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Пост не найден');
  broadcast('post:deleted', { id });
  res.json({ success: true });
});

// ---------- Кланы ----------
router.get('/clans', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.tag, c.description, c.created_at, c.avatar_version, ou.username AS owner_username,
            (SELECT COUNT(*)::int FROM clan_members m WHERE m.clan_id = c.id) AS members_count
     FROM clans c LEFT JOIN users ou ON ou.id = c.owner_id
     ORDER BY c.created_at DESC LIMIT 100`
  );
  res.json(rows);
});

router.delete('/clans/:id/avatar', async (req, res) => {
  await pool.query('UPDATE clans SET avatar = NULL, avatar_type = NULL, avatar_version = 0 WHERE id = $1', [Number(req.params.id)]);
  res.json({ success: true });
});

router.delete('/clans/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM clans WHERE id = $1', [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Клан не найден');
  res.json({ success: true });
});

// ---------- Заявки на галочку ----------
router.get('/verifications', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
  const { rows } = await pool.query(
    `SELECT v.id, v.status, v.reason, v.admin_note, v.created_at, v.reviewed_at,
            u.id AS user_id, u.username, u.handle, u.avatar_version, u.followers, u.created_at AS user_created_at, u.is_verified
     FROM verification_requests v JOIN users u ON u.id = v.user_id
     WHERE ($1::text IS NULL OR v.status = $1)
     ORDER BY (v.status = 'pending') DESC, v.created_at DESC LIMIT 100`,
    [status]
  );
  res.json(rows);
});

// Фото отдаётся только админу; клиент забирает его через fetch с токеном.
router.get('/verifications/:id/photo', async (req, res) => {
  const { rows } = await pool.query('SELECT photo, photo_type FROM verification_requests WHERE id = $1', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).end();
  res.set('Content-Type', rows[0].photo_type);
  res.set('Cache-Control', 'private, max-age=600');
  res.send(rows[0].photo);
});

router.post('/verifications/:id/:action', async (req, res) => {
  const approve = req.params.action === 'approve';
  if (!approve && req.params.action !== 'reject') throw new HttpError(404, 'Маршрут не найден');
  const note = str(req.body.note);
  if (note.length > 200) throw new HttpError(400, 'Комментарий: максимум 200 символов');

  const userId = await withTransaction(async (db) => {
    const found = await db.query('SELECT user_id, status FROM verification_requests WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
    if (!found.rows.length) throw new HttpError(404, 'Заявка не найдена');
    if (found.rows[0].status !== 'pending') throw new HttpError(400, 'Заявка уже рассмотрена');
    await db.query(
      'UPDATE verification_requests SET status = $1, admin_note = $2, reviewed_at = NOW(), reviewed_by = $3 WHERE id = $4',
      [approve ? 'approved' : 'rejected', note, req.user.id, Number(req.params.id)]
    );
    if (approve) await db.query('UPDATE users SET is_verified = true WHERE id = $1', [found.rows[0].user_id]);
    return found.rows[0].user_id;
  });

  const u = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  await createNotification(u.rows[0].username, 'SSS', approve ? 'verification_approved' : 'verification_rejected', null, note || null);
  if (approve) await checkAchievements(userId);
  res.json({ success: true });
});

// ---------- Рассылка всем ----------
router.post('/announce', async (req, res) => {
  const text = validateText(req.body.text, { max: 200, field: 'Сообщение' });
  const { rowCount } = await pool.query(
    `INSERT INTO notifications (user_to, user_from, type, content)
     SELECT username, 'SSS', 'announcement', $1 FROM users WHERE NOT is_banned`,
    [text]
  );
  broadcast('announcement', { content: text });
  const devices = await pool.query('SELECT DISTINCT u.username FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE NOT u.is_banned');
  for (const d of devices.rows) sendPushToUsername(d.username, { title: 'SSS', body: text, url: '#/notifications' });
  res.json({ success: true, recipients: rowCount });
});

// ---------- Настройки сайта ----------
router.get('/settings', async (req, res) => {
  res.json(await getSettings());
});

router.put('/settings', async (req, res) => {
  const patch = {};
  if (typeof req.body.premium_trial_enabled === 'boolean') patch.premium_trial_enabled = req.body.premium_trial_enabled;
  if (typeof req.body.email_codes_enabled === 'boolean') patch.email_codes_enabled = req.body.email_codes_enabled;
  if (req.body.premium_trial_days !== undefined) {
    const days = Number(req.body.premium_trial_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new HttpError(400, 'Срок пробного периода: от 1 до 365 дней');
    patch.premium_trial_days = days;
  }
  res.json(await saveSettings(patch));
});

module.exports = router;
