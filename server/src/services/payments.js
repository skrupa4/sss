const config = require('../config');
const { pool, withTransaction } = require('../db');
const { addCoins } = require('./coins');
const { HttpError } = require('../utils/errors');

// Приём платежей через ЮKassa (https://yookassa.ru/developers). Нужны YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.
const API = config.yookassa.apiUrl; // по умолчанию боевой адрес; переопределяется только в тестах

const enabled = () => Boolean(config.yookassa.shopId && config.yookassa.secretKey);

function authHeader() {
  return `Basic ${Buffer.from(`${config.yookassa.shopId}:${config.yookassa.secretKey}`).toString('base64')}`;
}

async function call(method, path, body, idempotenceKey) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        ...(idempotenceKey ? { 'Idempotence-Key': idempotenceKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError(502, 'Платёжный сервис недоступен. Попробуйте позже.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('ЮKassa вернула ошибку:', res.status, JSON.stringify(data));
    throw new HttpError(502, 'Платёжный сервис отклонил запрос');
  }
  return data;
}

const rub = (n) => Number(n).toFixed(2);

async function createPayment(order, returnUrl) {
  return call(
    'POST',
    '/payments',
    {
      amount: { value: rub(order.amount_rub), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: returnUrl },
      description: `SSS: ${order.coins} монет (заказ №${order.id})`,
      metadata: { order_id: String(order.id) },
    },
    `sss-order-${order.id}`
  );
}

/**
 * Сверяет заказ с ЮKassa и зачисляет монеты ровно один раз.
 * Ничему из webhook-тела не верим: статус и сумму всегда перечитываем из API платёжной системы.
 */
async function settleOrder(orderId) {
  const found = await pool.query('SELECT * FROM coin_orders WHERE id = $1', [orderId]);
  const order = found.rows[0];
  if (!order || order.status !== 'pending' || !order.provider_payment_id || !enabled()) return order;

  const payment = await call('GET', `/payments/${encodeURIComponent(order.provider_payment_id)}`);
  const matches =
    payment.metadata?.order_id === String(order.id) &&
    payment.amount?.currency === 'RUB' &&
    Number(payment.amount?.value) === Number(order.amount_rub);
  if (!matches) {
    console.error('Платёж не совпал с заказом', order.id);
    return order;
  }

  if (payment.status === 'succeeded' && payment.paid) {
    return withTransaction(async (db) => {
      // status = 'pending' в условии делает зачисление идемпотентным: webhook и опрос не удвоят монеты.
      const paid = await db.query(
        "UPDATE coin_orders SET status = 'paid', paid_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *",
        [order.id]
      );
      if (paid.rows.length && paid.rows[0].user_id) await addCoins(db, paid.rows[0].user_id, paid.rows[0].coins);
      return paid.rows[0] || order;
    });
  }
  if (payment.status === 'canceled') {
    const canceled = await pool.query("UPDATE coin_orders SET status = 'canceled' WHERE id = $1 AND status = 'pending' RETURNING *", [order.id]);
    return canceled.rows[0] || order;
  }
  return order;
}

module.exports = { enabled, createPayment, settleOrder };
