const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { emitToUsername, pushCounters } = require('../services/realtime');
const { HttpError } = require('../utils/errors');
const { validateText } = require('../utils/validate');
const { nickColumns } = require('../services/users');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const sender = req.user.username;
  const receiver = typeof req.body.receiver === 'string' ? req.body.receiver : '';
  const content = validateText(req.body.content, { max: 2000, field: 'Сообщение' });
  if (receiver === sender) throw new HttpError(400, 'Нельзя писать самому себе');

  const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', [receiver]);
  if (!exists.rows.length) throw new HttpError(404, 'Получатель не найден');

  const { rows } = await pool.query(
    'INSERT INTO messages (sender, receiver, content, is_read) VALUES ($1, $2, $3, false) RETURNING *',
    [sender, receiver, content]
  );
  const message = rows[0];

  // Получателю — мгновенно, отправителю — для его других вкладок/устройств.
  await emitToUsername(receiver, 'message:new', message);
  await emitToUsername(sender, 'message:new', message);
  await pushCounters(receiver);
  checkAchievements(req.user.id);
  res.json(message);
});

router.get('/history', async (req, res) => {
  const me = req.user.username;
  const other = typeof req.query.with === 'string' ? req.query.with : '';
  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
     ORDER BY created_at ASC, id ASC LIMIT 500`,
    [me, other]
  );
  res.json(rows);
});

router.get('/chats', async (req, res) => {
  const me = req.user.username;
  const { rows } = await pool.query(
    `WITH last_messages AS (
       SELECT DISTINCT ON (CASE WHEN sender = $1 THEN receiver ELSE sender END)
              CASE WHEN sender = $1 THEN receiver ELSE sender END AS chat_user,
              content, created_at
       FROM messages
       WHERE sender = $1 OR receiver = $1
       ORDER BY CASE WHEN sender = $1 THEN receiver ELSE sender END, created_at DESC, id DESC
     )
     SELECT lm.chat_user AS username, lm.content AS last_message, lm.created_at,
            u.handle, u.is_verified, u.avatar_version, ${nickColumns('u')},
            (SELECT COUNT(*)::int FROM messages m
               WHERE m.receiver = $1 AND m.sender = lm.chat_user AND m.is_read = false) AS unread
     FROM last_messages lm
     LEFT JOIN users u ON u.username = lm.chat_user
     ORDER BY lm.created_at DESC`,
    [me]
  );
  res.json(rows);
});

router.post('/read', async (req, res) => {
  const me = req.user.username;
  const chatUser = typeof req.body.chatUser === 'string' ? req.body.chatUser : '';
  await pool.query(
    'UPDATE messages SET is_read = true WHERE receiver = $1 AND sender = $2 AND is_read = false',
    [me, chatUser]
  );
  await pushCounters(me);
  res.json({ success: true });
});

module.exports = router;
