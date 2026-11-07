const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { pushCounters, getCounters } = require('../services/realtime');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT n.*, u.is_verified AS from_verified, u.avatar_version AS from_avatar_version
     FROM notifications n
     LEFT JOIN users u ON u.username = n.user_from
     WHERE n.user_to = $1
     ORDER BY n.created_at DESC, n.id DESC LIMIT 100`,
    [req.user.username]
  );
  res.json(rows);
});

router.get('/counters', async (req, res) => {
  res.json(await getCounters(req.user.username));
});

router.post('/read', async (req, res) => {
  const me = req.user.username;
  const id = Number(req.body.notificationId);
  if (Number.isInteger(id) && id > 0) {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_to = $2', [id, me]);
  } else {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_to = $1', [me]);
  }
  await pushCounters(me);
  res.json({ success: true });
});

router.delete('/', async (req, res) => {
  await pool.query('DELETE FROM notifications WHERE user_to = $1', [req.user.username]);
  await pushCounters(req.user.username);
  res.json({ success: true });
});

module.exports = router;
