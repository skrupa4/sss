const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getKeys, popPending, isAllowedEndpoint } = require('../services/push');
const { HttpError } = require('../utils/errors');

const router = express.Router();
const MAX_DEVICES = 10;

router.get('/key', async (req, res) => {
  res.json({ publicKey: (await getKeys()).publicKey });
});

// Service worker не знает токена входа: вместо него «паролем» служит адрес подписки,
// который выдан только этому браузеру. Забираем одно сообщение из очереди.
router.post('/pending', async (req, res) => {
  const endpoint = typeof req.body.endpoint === 'string' ? req.body.endpoint : '';
  res.json((await popPending(endpoint)) || { empty: true });
});

router.use(requireAuth);

router.post('/subscribe', async (req, res) => {
  const endpoint = typeof req.body.endpoint === 'string' ? req.body.endpoint : '';
  if (!isAllowedEndpoint(endpoint)) throw new HttpError(400, 'Недопустимая подписка');
  // Подписка «переезжает» к тому, кто вошёл в этом браузере последним.
  await pool.query(
    'INSERT INTO push_subscriptions (user_id, endpoint) VALUES ($1, $2) ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id',
    [req.user.id, endpoint]
  );
  await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND id NOT IN (SELECT id FROM push_subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT $2)',
    [req.user.id, MAX_DEVICES]
  );
  res.json({ success: true });
});

router.post('/unsubscribe', async (req, res) => {
  const endpoint = typeof req.body.endpoint === 'string' ? req.body.endpoint : '';
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [req.user.id, endpoint]);
  res.json({ success: true });
});

module.exports = router;
