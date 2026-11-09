// Коды на почту для входа (двухфакторная защита) и для её включения.
const crypto = require('crypto');
const { pool } = require('../db');
const { HttpError } = require('../utils/errors');
const { sendCode } = require('./mailer');
const { makeCode, hashCode, codeMatches, TTL_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SEC } = require('./codes');

const enableTicket = (userId) => `enable2fa:${userId}`;
const tooSoon = (at) => Date.now() - new Date(at).getTime() < RESEND_COOLDOWN_SEC * 1000;
const waitMsg = (at) => `Код уже отправлен. Повторить можно через ${Math.max(1, Math.ceil(RESEND_COOLDOWN_SEC - (Date.now() - new Date(at).getTime()) / 1000))} сек.`;

// Создаёт код и отправляет на почту. Возвращает «билет» — по нему клиент потом подтверждает код.
async function issue({ userId, email, purpose }) {
  const isEnable = purpose === 'twofa';
  const ticket = isEnable ? enableTicket(userId) : crypto.randomBytes(24).toString('hex');

  // Не даём заспамить владельца почты: один код в минуту на пользователя.
  const prev = await pool.query(
    'SELECT MAX(last_sent_at) AS at FROM login_challenges WHERE user_id = $1 AND (id LIKE \'enable2fa:%\') = $2',
    [userId, isEnable]
  );
  if (prev.rows[0].at && tooSoon(prev.rows[0].at)) throw new HttpError(429, waitMsg(prev.rows[0].at));

  const code = makeCode();
  await sendCode(email, code, purpose); // если письмо не ушло — ничего не сохраняем
  // Старые незавершённые входы пользователя и просроченные коды удаляем.
  await pool.query('DELETE FROM login_challenges WHERE expires_at < NOW() OR (user_id = $1 AND id <> $2 AND (id LIKE \'enable2fa:%\') = $3)', [userId, ticket, isEnable]);
  await pool.query(
    `INSERT INTO login_challenges (id, user_id, code_hash, expires_at, attempts, last_sent_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, 0, NOW())
     ON CONFLICT (id) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, last_sent_at = NOW()`,
    [ticket, userId, hashCode(ticket, code), String(TTL_MINUTES)]
  );
  return ticket;
}

// Проверяет код. Успешный код одноразовый. Возвращает id пользователя.
async function check(ticket, rawCode, { userId } = {}) {
  const code = String(rawCode ?? '').replace(/\s/g, '');
  const { rows } = await pool.query('SELECT * FROM login_challenges WHERE id = $1', [typeof ticket === 'string' ? ticket : '']);
  const row = rows[0];
  if (!row || (userId !== undefined && row.user_id !== userId)) throw new HttpError(400, 'Код недействителен. Начните заново');
  if (new Date(row.expires_at) < new Date()) throw new HttpError(400, 'Код истёк. Запросите новый');
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Слишком много неверных попыток. Запросите новый код');
  if (!/^\d{6}$/.test(code) || !codeMatches(ticket, code, row.code_hash)) {
    await pool.query('UPDATE login_challenges SET attempts = attempts + 1 WHERE id = $1', [ticket]);
    throw new HttpError(400, 'Неверный код');
  }
  await pool.query('DELETE FROM login_challenges WHERE id = $1', [ticket]);
  return row.user_id;
}

async function resend(ticket) {
  const { rows } = await pool.query(
    'SELECT c.*, u.email FROM login_challenges c JOIN users u ON u.id = c.user_id WHERE c.id = $1',
    [typeof ticket === 'string' ? ticket : '']
  );
  const row = rows[0];
  if (!row) throw new HttpError(400, 'Код недействителен. Начните заново');
  if (tooSoon(row.last_sent_at)) throw new HttpError(429, waitMsg(row.last_sent_at));
  const code = makeCode();
  await sendCode(row.email, code, ticket.startsWith('enable2fa:') ? 'twofa' : 'login');
  await pool.query(
    "UPDATE login_challenges SET code_hash = $2, expires_at = NOW() + ($3 || ' minutes')::interval, attempts = 0, last_sent_at = NOW() WHERE id = $1",
    [ticket, hashCode(ticket, code), String(TTL_MINUTES)]
  );
}

const maskEmail = (email) => {
  const [name, domain] = String(email).split('@');
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(2, Math.min(name.length - 1, 6)))}@${domain}`;
};

module.exports = { issue, check, resend, maskEmail };
