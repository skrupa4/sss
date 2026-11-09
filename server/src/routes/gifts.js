const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { addCoins } = require('../services/coins');
const { GIFTS, GIFT_BY_CODE } = require('../services/gifts');
const { createNotification } = require('../services/notifications');
const { emitToUsername } = require('../services/realtime');
const { checkAchievements } = require('../services/achievements');
const { HttpError } = require('../utils/errors');
const { str } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);
  res.json({ gifts: GIFTS, coins: rows[0].coins });
});

// Сколько монет возвращается за проданный подарок (доля от цены, за которую его купили).
const SELL_RATE = 0.5;
const sellPrice = (price) => Math.floor(price * SELL_RATE);

// Подарки, полученные пользователем (для блока в профиле).
// Проданные не показываем никому, скрытые — только их владельцу.
router.get('/user/:username', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.id, g.gift_code, g.price, g.message, g.is_anonymous, g.is_hidden, g.created_at,
            CASE WHEN g.is_anonymous THEN NULL ELSE s.username END AS from_username,
            CASE WHEN g.is_anonymous THEN 0 ELSE COALESCE(s.avatar_version, 0) END AS from_avatar_version
     FROM gifts_sent g
     JOIN users r ON r.id = g.to_user_id
     LEFT JOIN users s ON s.id = g.from_user_id
     WHERE r.username = $1 AND g.sold_at IS NULL AND (NOT g.is_hidden OR r.id = $2)
     ORDER BY g.created_at DESC, g.id DESC LIMIT 60`,
    [req.params.username, req.user.id]
  );
  const total = await pool.query(
    `SELECT COUNT(*)::int AS n FROM gifts_sent g JOIN users r ON r.id = g.to_user_id
     WHERE r.username = $1 AND g.sold_at IS NULL AND (NOT g.is_hidden OR r.id = $2)`,
    [req.params.username, req.user.id]
  );
  res.json({
    total: total.rows[0].n,
    items: rows.map((r) => ({ ...r, sell_price: sellPrice(r.price), ...(GIFT_BY_CODE.get(r.gift_code) || { title: 'Подарок', icon: '🎁' }) })),
  });
});

// Скрыть подарок из профиля (или вернуть). Владелец продолжает его видеть.
router.patch('/:id', async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw new HttpError(400, 'Укажите hidden: true или false');
  const { rowCount } = await pool.query(
    'UPDATE gifts_sent SET is_hidden = $1 WHERE id = $2 AND to_user_id = $3 AND sold_at IS NULL',
    [req.body.hidden, Number(req.params.id), req.user.id]
  );
  if (!rowCount) throw new HttpError(404, 'Подарок не найден');
  res.json({ success: true, hidden: req.body.hidden });
});

// Продать полученный подарок за часть его цены.
router.post('/:id/sell', async (req, res) => {
  const result = await withTransaction(async (db) => {
    // FOR UPDATE: два одновременных нажатия не продадут один подарок дважды.
    const found = await db.query(
      'SELECT id, price FROM gifts_sent WHERE id = $1 AND to_user_id = $2 AND sold_at IS NULL FOR UPDATE',
      [Number(req.params.id), req.user.id]
    );
    if (!found.rows.length) throw new HttpError(404, 'Подарок не найден или уже продан');
    const earned = sellPrice(found.rows[0].price);
    await db.query('UPDATE gifts_sent SET sold_at = NOW() WHERE id = $1', [found.rows[0].id]);
    return { earned, coins: await addCoins(db, req.user.id, earned) };
  });
  res.json({ success: true, ...result });
});

router.post('/send', async (req, res) => {
  const gift = GIFT_BY_CODE.get(req.body.gift);
  if (!gift) throw new HttpError(400, 'Такого подарка нет');
  const to = str(req.body.to);
  const message = str(req.body.message);
  if (message.length > 120) throw new HttpError(400, 'Подпись: максимум 120 символов');
  const anonymous = req.body.anonymous === true;

  const { coins, recipient } = await withTransaction(async (db) => {
    const target = await db.query('SELECT id, username, is_banned FROM users WHERE username = $1', [to]);
    if (!target.rows.length || target.rows[0].is_banned) throw new HttpError(404, 'Получатель не найден');
    if (target.rows[0].id === req.user.id) throw new HttpError(400, 'Нельзя подарить подарок самому себе');

    // Блокируем строку отправителя: два одновременных запроса не потратят одни и те же монеты дважды.
    const me = await db.query('SELECT coins FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (me.rows[0].coins < gift.price) throw new HttpError(400, 'Недостаточно монет');

    await db.query(
      `INSERT INTO gifts_sent (from_user_id, to_user_id, gift_code, price, message, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, target.rows[0].id, gift.code, gift.price, message, anonymous]
    );
    return { coins: await addCoins(db, req.user.id, -gift.price), recipient: target.rows[0] };
  });

  // Анонимный подарок приходит как системное уведомление — без имени отправителя.
  if (anonymous) await createNotification(recipient.username, 'SSS', 'gift_anon', null, gift.title);
  else await createNotification(recipient.username, req.user.username, 'gift', null, gift.title);
  await emitToUsername(recipient.username, 'gift:received', { gift: gift.code });

  await checkAchievements(req.user.id);
  await checkAchievements(recipient.id);
  res.json({ success: true, coins });
});

module.exports = router;
