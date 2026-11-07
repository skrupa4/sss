const { pool } = require('../db');
const { emitToUsername, pushCounters } = require('./realtime');

// Для этих типов повторное уведомление от того же человека не создаём (лайк-анлайк-лайк).
const UNIQUE_TYPES = new Set(['like', 'follow', 'repost', 'clan_join']);

async function createNotification(userTo, userFrom, type, postId = null, content = null) {
  if (!userTo || userTo === userFrom) return;
  try {
    if (UNIQUE_TYPES.has(type)) {
      const dup = await pool.query(
        `SELECT 1 FROM notifications
         WHERE user_to = $1 AND user_from = $2 AND type = $3 AND post_id IS NOT DISTINCT FROM $4::int`,
        [userTo, userFrom, type, postId]
      );
      if (dup.rows.length) return;
    }
    const inserted = await pool.query(
      `INSERT INTO notifications (user_to, user_from, type, post_id, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userTo, userFrom, type, postId, content]
    );
    const full = await pool.query(
      `SELECT n.*, u.is_verified AS from_verified, u.avatar_version AS from_avatar_version
       FROM notifications n LEFT JOIN users u ON u.username = n.user_from
       WHERE n.id = $1`,
      [inserted.rows[0].id]
    );
    await emitToUsername(userTo, 'notification:new', full.rows[0]);
    await pushCounters(userTo);
  } catch (err) {
    console.error('Ошибка создания уведомления:', err.message);
  }
}

module.exports = { createNotification };
