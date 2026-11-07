const { pool } = require('../db');
const { getIO } = require('../socket');

async function emitToUsername(username, event, payload) {
  const io = getIO();
  if (!io || !username) return;
  const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (rows[0]) io.to(`user:${rows[0].id}`).emit(event, payload);
}

function broadcast(event, payload) {
  getIO()?.emit(event, payload);
}

async function getCounters(username) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE receiver = $1 AND is_read = false)::int AS messages,
       (SELECT COUNT(*) FROM notifications WHERE user_to = $1 AND is_read = false)::int AS notifications`,
    [username]
  );
  return rows[0];
}

// Отправляет пользователю актуальные счётчики для бейджей в меню.
async function pushCounters(username) {
  try {
    await emitToUsername(username, 'counters', await getCounters(username));
  } catch (err) {
    console.error('Ошибка отправки счётчиков:', err.message);
  }
}

module.exports = { emitToUsername, broadcast, getCounters, pushCounters };
