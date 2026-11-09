const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/errors');
const { validateEmail, validatePassword, str } = require('../utils/validate');
const { mailEnabled, sendCode } = require('../services/mailer');
const { makeCode, hashCode, codeMatches, TTL_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SEC } = require('../services/codes');

const router = express.Router();
router.use(requireAuth);

async function checkPassword(userId, password) {
  const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (typeof password !== 'string' || !password || !(await bcrypt.compare(password, rows[0].password))) {
    throw new HttpError(400, 'Неверный текущий пароль');
  }
}

router.put('/password', async (req, res) => {
  await checkPassword(req.user.id, req.body.current);
  const next = validatePassword(req.body.next);
  if (next === req.body.current) throw new HttpError(400, 'Новый пароль совпадает со старым');
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(next, 10), req.user.id]);
  res.json({ success: true });
});

// Шаг 1: пароль + новый адрес. При настроенной почте на новый адрес уходит код.
router.post('/email', async (req, res) => {
  await checkPassword(req.user.id, req.body.password);
  const email = validateEmail(req.body.email);
  const current = await pool.query('SELECT LOWER(email) AS email FROM users WHERE id = $1', [req.user.id]);
  if (current.rows[0].email === email) throw new HttpError(400, 'Это уже ваша текущая почта');
  if ((await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email])).rows.length) throw new HttpError(400, 'Эта почта уже занята');

  if (!mailEnabled()) {
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
    return res.json({ changed: true, email });
  }

  const prev = (await pool.query('SELECT last_sent_at FROM email_changes WHERE user_id = $1', [req.user.id])).rows[0];
  if (prev && Date.now() - new Date(prev.last_sent_at).getTime() < RESEND_COOLDOWN_SEC * 1000) throw new HttpError(429, `Подождите ${RESEND_COOLDOWN_SEC} секунд перед повторной отправкой`);
  const code = makeCode();
  await sendCode(email, code, 'email');
  await pool.query(
    `INSERT INTO email_changes (user_id, new_email, code_hash, expires_at, attempts, last_sent_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, 0, NOW())
     ON CONFLICT (user_id) DO UPDATE SET new_email = EXCLUDED.new_email, code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, last_sent_at = NOW()`,
    [req.user.id, email, hashCode(email, code), String(TTL_MINUTES)]
  );
  res.json({ needsCode: true, email });
});

// Шаг 2: код из письма.
router.post('/email/confirm', async (req, res) => {
  const code = str(req.body.code).replace(/\s/g, '');
  const { rows } = await pool.query('SELECT * FROM email_changes WHERE user_id = $1', [req.user.id]);
  const change = rows[0];
  if (!change) throw new HttpError(400, 'Запрос на смену почты не найден');
  if (new Date(change.expires_at) < new Date()) throw new HttpError(400, 'Код истёк. Запросите новый');
  if (change.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Слишком много неверных попыток. Запросите новый код');
  if (!/^\d{6}$/.test(code) || !codeMatches(change.new_email, code, change.code_hash)) {
    await pool.query('UPDATE email_changes SET attempts = attempts + 1 WHERE user_id = $1', [req.user.id]);
    throw new HttpError(400, 'Неверный код');
  }
  try {
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [change.new_email, req.user.id]);
  } catch (err) {
    if (err.code === '23505') throw new HttpError(400, 'Эта почта уже занята');
    throw err;
  }
  await pool.query('DELETE FROM email_changes WHERE user_id = $1', [req.user.id]);
  res.json({ changed: true, email: change.new_email });
});

module.exports = router;
