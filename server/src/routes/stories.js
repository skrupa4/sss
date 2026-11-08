const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isPremiumUser } = require('../services/users');
const { checkAchievements } = require('../services/achievements');
const { broadcast } = require('../services/realtime');
const { HttpError } = require('../utils/errors');
const { str } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

const IMAGE_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 700 * 1024;
const MAX_ACTIVE = 10;
const TTL_HOURS = 24;

// Кольца над лентой: мои сторис + сторис тех, на кого я подписан.
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.username, u.avatar_version, u.is_verified, u.nick_color,
            (u.id = $1) AS is_me,
            COUNT(s.id)::int AS count,
            MAX(s.created_at) AS latest_at,
            BOOL_OR(NOT EXISTS (SELECT 1 FROM story_views v WHERE v.story_id = s.id AND v.user_id = $1)) AS has_unseen
     FROM stories s
     JOIN users u ON u.id = s.user_id
     WHERE s.expires_at > NOW()
       AND (s.user_id = $1 OR u.username IN (SELECT following_username FROM follows WHERE follower_username = $2))
     GROUP BY u.id
     ORDER BY (u.id = $1) DESC, has_unseen DESC, latest_at DESC`,
    [req.user.id, req.user.username]
  );
  res.json(rows);
});

router.get('/user/:username', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.caption, s.created_at, s.expires_at, (u.id = $1) AS is_mine,
            EXISTS (SELECT 1 FROM story_views v WHERE v.story_id = s.id AND v.user_id = $1) AS seen,
            CASE WHEN u.id = $1 THEN (SELECT COUNT(*)::int FROM story_views v WHERE v.story_id = s.id) END AS views
     FROM stories s JOIN users u ON u.id = s.user_id
     WHERE u.username = $2 AND s.expires_at > NOW()
     ORDER BY s.created_at ASC`,
    [req.user.id, req.params.username]
  );
  res.json(rows);
});

// Картинка отдаётся только авторизованным: клиент забирает её через fetch с токеном.
router.get('/:id/image', async (req, res) => {
  const { rows } = await pool.query('SELECT image, image_type FROM stories WHERE id = $1 AND expires_at > NOW()', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).end();
  res.set('Content-Type', rows[0].image_type);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(rows[0].image);
});

router.post('/', async (req, res) => {
  if (!(await isPremiumUser(pool, req.user.id))) throw new HttpError(403, 'Сторис доступны с Premium');

  const match = IMAGE_RE.exec(typeof req.body.image === 'string' ? req.body.image : '');
  if (!match) throw new HttpError(400, 'Нужна картинка PNG, JPEG или WebP');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'Картинка слишком большая (максимум 700 КБ)');
  const caption = str(req.body.caption);
  if (caption.length > 120) throw new HttpError(400, 'Подпись: максимум 120 символов');

  const active = await pool.query('SELECT COUNT(*)::int AS n FROM stories WHERE user_id = $1 AND expires_at > NOW()', [req.user.id]);
  if (active.rows[0].n >= MAX_ACTIVE) throw new HttpError(400, `Одновременно можно держать не больше ${MAX_ACTIVE} сторис`);

  const { rows } = await pool.query(
    `INSERT INTO stories (user_id, image, image_type, caption, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval) RETURNING id, caption, created_at, expires_at`,
    [req.user.id, buffer, match[1], caption, String(TTL_HOURS)]
  );
  broadcast('story:new', { username: req.user.username });
  await checkAchievements(req.user.id);
  res.json(rows[0]);
});

router.post('/:id/view', async (req, res) => {
  await pool.query(
    `INSERT INTO story_views (story_id, user_id)
     SELECT s.id, $2::int FROM stories s WHERE s.id = $1 AND s.user_id <> $2::int
     ON CONFLICT DO NOTHING`,
    [Number(req.params.id), req.user.id]
  );
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM stories WHERE id = $1 AND (user_id = $2 OR $3)',
    [Number(req.params.id), req.user.id, Boolean(req.user.is_admin)]
  );
  if (!rowCount) throw new HttpError(404, 'Сторис не найдена');
  broadcast('story:removed', { id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
