const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { fetchUser } = require('../services/users');
const { HttpError } = require('../utils/errors');
const { str, validateUsername, validateEmail, validatePassword } = require('../utils/validate');
const { isReservedName } = require('../utils/reserved');
const { mailEnabled, sendCode } = require('../services/mailer');
const { emailCodesRequired } = require('../services/settings');
const challenges = require('../services/challenges');
const { makeCode, hashCode, codeMatches, TTL_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SEC, MAX_SENDS_PER_HOUR } = require('../services/codes');

const router = express.Router();

// Создаёт пользователя (общая часть для регистрации с кодом и без него).
async function createUser(username, email, hash) {
  // Имена админов зарезервированы: занять их можно, только пока администратора ещё нет.
  let becomesAdmin = false;
  if (isReservedName(username)) {
    const adminExists = await pool.query('SELECT 1 FROM users WHERE is_admin LIMIT 1');
    if (adminExists.rows.length) throw new HttpError(400, 'Это имя зарезервировано');
    becomesAdmin = true;
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password, handle) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hash, username.toLowerCase()]
    );
    if (becomesAdmin) await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [rows[0].id]);
    return rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'users_email_key') throw new HttpError(400, 'Эта почта уже занята');
      throw new HttpError(400, 'Такой никнейм уже занят');
    }
    throw err;
  }
}

const session = async (id) => ({ token: signToken(id), user: await fetchUser(pool, 'id', id, { withEmail: true }) });

// Нужно ли подтверждать почту кодом (зависит от того, настроена ли отправка писем).
router.get('/register/config', async (req, res) => res.json({ verify: await emailCodesRequired(), mail: mailEnabled() }));

router.post('/register', async (req, res) => {
  const username = validateUsername(req.body.username);
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const hash = await bcrypt.hash(password, 10);

  // Почта не настроена — регистрируем сразу, как раньше (сайт не должен «ломаться» без ключей).
  if (!(await emailCodesRequired())) {
    // created_at ставит сама БД (DEFAULT NOW()) — дата регистрации настоящая.
    return res.json(await session(await createUser(username, email, hash)));
  }

  const taken = await pool.query('SELECT username, LOWER(email) = $2 AS same_email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = $2 LIMIT 1', [username, email]);
  if (taken.rows.length) throw new HttpError(400, taken.rows[0].same_email ? 'Эта почта уже занята' : 'Такой никнейм уже занят');
  if (isReservedName(username) && (await pool.query('SELECT 1 FROM users WHERE is_admin LIMIT 1')).rows.length) {
    throw new HttpError(400, 'Это имя зарезервировано');
  }

  // Повторная заявка на ту же почту заменяет прежнюю, но лимит отправок за час сохраняется.
  const prev = (await pool.query('SELECT sent_count, window_start, last_sent_at FROM pending_registrations WHERE email = $1', [email])).rows[0];
  const windowFresh = prev && Date.now() - new Date(prev.window_start).getTime() < 3_600_000;
  if (prev && Date.now() - new Date(prev.last_sent_at).getTime() < RESEND_COOLDOWN_SEC * 1000) throw new HttpError(429, `Код уже отправлен. Повторить можно через ${RESEND_COOLDOWN_SEC} секунд`);
  if (windowFresh && prev.sent_count >= MAX_SENDS_PER_HOUR) throw new HttpError(429, 'Слишком много попыток. Попробуйте через час');

  const code = makeCode();
  await sendCode(email, code, 'register'); // если письмо не ушло — заявку не сохраняем
  await pool.query(
    `INSERT INTO pending_registrations (email, username, password_hash, code_hash, expires_at, sent_count, window_start, last_sent_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval, $6, $7, NOW())
     ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, code_hash = EXCLUDED.code_hash,
       expires_at = EXCLUDED.expires_at, attempts = 0, sent_count = EXCLUDED.sent_count, window_start = EXCLUDED.window_start, last_sent_at = NOW()`,
    [email, username, hash, hashCode(email, code), String(TTL_MINUTES), windowFresh ? prev.sent_count + 1 : 1, windowFresh ? prev.window_start : new Date()]
  );
  res.json({ needsCode: true, email });
});

router.post('/register/verify', async (req, res) => {
  const email = validateEmail(req.body.email);
  const code = str(req.body.code).replace(/\s/g, '');
  const { rows } = await pool.query('SELECT * FROM pending_registrations WHERE email = $1', [email]);
  const pending = rows[0];
  if (!pending) throw new HttpError(400, 'Заявка не найдена. Начните регистрацию заново');
  if (new Date(pending.expires_at) < new Date()) throw new HttpError(400, 'Код истёк. Запросите новый');
  if (pending.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Слишком много неверных попыток. Запросите новый код');
  if (!/^\d{6}$/.test(code) || !codeMatches(email, code, pending.code_hash)) {
    await pool.query('UPDATE pending_registrations SET attempts = attempts + 1 WHERE email = $1', [email]);
    throw new HttpError(400, 'Неверный код');
  }
  const id = await createUser(pending.username, email, pending.password_hash);
  await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
  res.json(await session(id));
});

router.post('/register/resend', async (req, res) => {
  const email = validateEmail(req.body.email);
  const { rows } = await pool.query('SELECT * FROM pending_registrations WHERE email = $1', [email]);
  const pending = rows[0];
  if (!pending) throw new HttpError(400, 'Заявка не найдена. Начните регистрацию заново');
  const since = (Date.now() - new Date(pending.last_sent_at).getTime()) / 1000;
  if (since < RESEND_COOLDOWN_SEC) throw new HttpError(429, `Подождите ${Math.ceil(RESEND_COOLDOWN_SEC - since)} сек. перед повторной отправкой`);
  const windowFresh = Date.now() - new Date(pending.window_start).getTime() < 3_600_000;
  if (windowFresh && pending.sent_count >= MAX_SENDS_PER_HOUR) throw new HttpError(429, 'Слишком много попыток. Попробуйте через час');

  const code = makeCode();
  await sendCode(email, code, 'register');
  await pool.query(
    `UPDATE pending_registrations SET code_hash = $2, expires_at = NOW() + ($3 || ' minutes')::interval, attempts = 0, last_sent_at = NOW(),
       sent_count = $4, window_start = $5 WHERE email = $1`,
    [email, hashCode(email, code), String(TTL_MINUTES), windowFresh ? pending.sent_count + 1 : 1, windowFresh ? pending.window_start : new Date()]
  );
  res.json({ success: true });
});

router.post('/login', async (req, res) => {
  const login = str(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!login || !password) throw new HttpError(400, 'Введите никнейм и пароль');

  const { rows } = await pool.query(
    'SELECT id, password, is_banned, two_factor, email FROM users WHERE username = $1 OR LOWER(email) = LOWER($1) LIMIT 1',
    [login]
  );
  if (!rows.length) throw new HttpError(401, 'Пользователь не найден');
  if (!(await bcrypt.compare(password, rows[0].password))) throw new HttpError(401, 'Неверный пароль');

  if (rows[0].is_banned) throw new HttpError(403, 'Аккаунт заблокирован администратором');

  if (rows[0].two_factor) {
    if (mailEnabled()) {
      // Пароль верен, но вход завершается только после кода из письма.
      const ticket = await challenges.issue({ userId: rows[0].id, email: rows[0].email, purpose: 'login' });
      return res.json({ needs2fa: true, ticket, email: challenges.maskEmail(rows[0].email) });
    }
    // Почта на сервере отключена — не запираем людей снаружи собственного аккаунта.
    console.warn(`2FA пропущена для user ${rows[0].id}: отправка почты не настроена`);
  }
  res.json(await session(rows[0].id));
});

router.post('/login/2fa', async (req, res) => {
  const userId = await challenges.check(req.body.ticket, req.body.code);
  const banned = await pool.query('SELECT is_banned FROM users WHERE id = $1', [userId]);
  if (!banned.rows.length || banned.rows[0].is_banned) throw new HttpError(403, 'Аккаунт заблокирован администратором');
  res.json(await session(userId));
});

router.post('/login/2fa/resend', async (req, res) => {
  await challenges.resend(req.body.ticket);
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json(await fetchUser(pool, 'id', req.user.id, { withEmail: true }));
});

module.exports = router;
