const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { HttpError } = require('../utils/errors');
const { str } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

const IMAGE_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_PHOTO_BYTES = 900 * 1024;

// Моё состояние: подтверждён ли аккаунт и что с последней заявкой.
router.get('/me', async (req, res) => {
  const u = await pool.query('SELECT is_verified FROM users WHERE id = $1', [req.user.id]);
  const r = await pool.query(
    `SELECT id, status, reason, admin_note, created_at, reviewed_at FROM verification_requests
     WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [req.user.id]
  );
  res.json({ verified: u.rows[0].is_verified, request: r.rows[0] || null });
});

router.post('/', async (req, res) => {
  const u = await pool.query('SELECT is_verified FROM users WHERE id = $1', [req.user.id]);
  if (u.rows[0].is_verified) throw new HttpError(400, 'Ваш аккаунт уже подтверждён');

  const reason = str(req.body.reason);
  if (reason.length < 20) throw new HttpError(400, 'Опишите подробнее, почему вам нужна галочка (минимум 20 символов)');
  if (reason.length > 600) throw new HttpError(400, 'Описание: максимум 600 символов');

  const match = IMAGE_RE.exec(typeof req.body.photo === 'string' ? req.body.photo : '');
  if (!match) throw new HttpError(400, 'Приложите фото (PNG, JPEG или WebP)');
  const photo = Buffer.from(match[2], 'base64');
  if (!photo.length || photo.length > MAX_PHOTO_BYTES) throw new HttpError(400, 'Фото слишком большое (максимум 900 КБ)');

  try {
    await pool.query(
      'INSERT INTO verification_requests (user_id, reason, photo, photo_type) VALUES ($1, $2, $3, $4)',
      [req.user.id, reason, photo, match[1]]
    );
  } catch (err) {
    // Частичный уникальный индекс: не больше одной заявки «на рассмотрении».
    if (err.code === '23505') throw new HttpError(400, 'Заявка уже на рассмотрении');
    throw err;
  }

  // Админам — уведомление, чтобы заявка не потерялась.
  const admins = await pool.query('SELECT username FROM users WHERE is_admin');
  for (const a of admins.rows) await createNotification(a.username, req.user.username, 'verification_request');

  res.json({ success: true });
});

module.exports = router;
