const express = require('express');
const config = require('../config');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { COIN_PACKS } = require('../services/coins');
const payments = require('../services/payments');
const { HttpError } = require('../utils/errors');

const router = express.Router();

// Уведомление от ЮKassa. Тело не используется как источник истины: берём только id платежа
// и перепроверяем его через API (см. settleOrder), поэтому подделать зачисление нельзя.
router.post('/webhook', async (req, res) => {
  const paymentId = req.body?.object?.id;
  if (typeof paymentId === 'string' && payments.enabled()) {
    try {
      const { rows } = await pool.query('SELECT id FROM coin_orders WHERE provider_payment_id = $1', [paymentId]);
      if (rows[0]) await payments.settleOrder(rows[0].id);
    } catch (err) {
      console.error('Ошибка обработки webhook:', err.message);
    }
  }
  res.json({ ok: true });
});

router.use(requireAuth);

router.get('/packs', async (req, res) => {
  const { rows } = await pool.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);
  res.json({ enabled: payments.enabled(), coins: rows[0].coins, packs: COIN_PACKS });
});

router.get('/orders', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, coins, amount_rub, status, created_at, paid_at FROM coin_orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20',
    [req.user.id]
  );
  res.json(rows);
});

// Адрес возврата после оплаты разрешаем только на наши собственные сайты.
function safeReturnBase(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new HttpError(400, 'Некорректный адрес возврата'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new HttpError(400, 'Некорректный адрес возврата');
  if (Array.isArray(config.corsOrigin) && !config.corsOrigin.includes(url.origin)) throw new HttpError(400, 'Недопустимый адрес возврата');
  return `${url.origin}${url.pathname}`;
}

router.post('/orders', async (req, res) => {
  if (!payments.enabled()) throw new HttpError(503, 'Оплата пока не подключена. Загляните позже.');
  const pack = COIN_PACKS.find((p) => p.code === req.body.pack);
  if (!pack) throw new HttpError(400, 'Такого пакета нет');
  const base = safeReturnBase(req.body.returnUrl);

  // Защита от «залипших» кликов: не больше 5 неоплаченных заказов за час.
  const recent = await pool.query(
    "SELECT COUNT(*)::int AS n FROM coin_orders WHERE user_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '1 hour'",
    [req.user.id]
  );
  if (recent.rows[0].n >= 5) throw new HttpError(429, 'Слишком много неоплаченных заказов. Подождите немного.');

  const created = await pool.query(
    'INSERT INTO coin_orders (user_id, pack_code, coins, amount_rub) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, pack.code, pack.coins, pack.price_rub]
  );
  const order = created.rows[0];

  try {
    const payment = await payments.createPayment(order, `${base}#/coins?order=${order.id}`);
    await pool.query('UPDATE coin_orders SET provider_payment_id = $1 WHERE id = $2', [payment.id, order.id]);
    res.json({ order_id: order.id, confirmation_url: payment.confirmation?.confirmation_url });
  } catch (err) {
    await pool.query("UPDATE coin_orders SET status = 'failed' WHERE id = $1", [order.id]);
    throw err;
  }
});

// Клиент спрашивает статус после возврата с оплаты; заодно мы сами сверяем заказ с ЮKassa.
router.get('/orders/:id', async (req, res) => {
  const id = Number(req.params.id);
  const own = await pool.query('SELECT id FROM coin_orders WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  if (!own.rows.length) throw new HttpError(404, 'Заказ не найден');
  const order = await payments.settleOrder(id);
  const { rows } = await pool.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);
  res.json({ id: order.id, status: order.status, coins: order.coins, balance: rows[0].coins });
});

module.exports = router;
