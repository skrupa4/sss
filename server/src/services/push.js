// Web Push без внешних библиотек (в окружении нет доступа к npm): подпись VAPID — встроенным crypto.
// Пуш отправляется БЕЗ тела; сам текст service worker забирает у сервера (POST /api/push/pending).
// Так не нужно шифровать полезную нагрузку, а подписка остаётся «секретом» только у браузера.
const crypto = require('crypto');
const { pool } = require('../db');

const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
// Принимаем только настоящие push-сервисы браузеров: иначе сервер можно заставить слать запросы куда угодно.
const ALLOWED_HOSTS = ['.googleapis.com', '.mozilla.com', '.push.apple.com', '.notify.windows.com', '.mozaws.net'];

const b64url = (buf) => Buffer.from(buf).toString('base64url');

let keysPromise = null;
function getKeys() {
  if (!keysPromise) keysPromise = loadKeys().catch((err) => { keysPromise = null; throw err; });
  return keysPromise;
}

async function loadKeys() {
  const read = async () => {
    const { rows } = await pool.query("SELECT key, value FROM app_settings WHERE key IN ('vapid_private', 'vapid_public')");
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return m.vapid_private && m.vapid_public ? m : null;
  };
  let stored = await read();
  if (!stored) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = publicKey.export({ format: 'jwk' });
    const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
    // Две копии сервера могут стартовать одновременно: выигрывает первая запись, остальные читают её.
    await pool.query("INSERT INTO app_settings (key, value) VALUES ('vapid_private', $1) ON CONFLICT DO NOTHING", [privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')]);
    await pool.query("INSERT INTO app_settings (key, value) VALUES ('vapid_public', $1) ON CONFLICT DO NOTHING", [b64url(raw)]);
    stored = await read();
  }
  return {
    publicKey: stored.vapid_public,
    privateKey: crypto.createPrivateKey({ key: Buffer.from(stored.vapid_private, 'base64'), format: 'der', type: 'pkcs8' }),
  };
}

function isAllowedEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && endpoint.length <= 1000 && ALLOWED_HOSTS.some((h) => url.hostname.endsWith(h));
  } catch {
    return false;
  }
}

function vapidHeader(endpoint, keys) {
  const aud = new URL(endpoint).origin;
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64url(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: keys.privateKey, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${keys.publicKey}`;
}

async function wake(sub, keys) {
  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: vapidHeader(sub.endpoint, keys), TTL: '86400', Urgency: 'high' },
      signal: AbortSignal.timeout(10_000),
    });
    // Подписка отозвана или устарела — удаляем, чтобы не слать в пустоту.
    if (res.status === 404 || res.status === 410) await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
    else if (!res.ok) console.warn(`Push: ${new URL(sub.endpoint).hostname} ответил ${res.status}`);
  } catch (err) {
    console.warn('Push: не удалось отправить:', err.message);
  }
}

// Кладём текст в очередь каждого устройства пользователя и «будим» его service worker.
async function sendPushToUsername(username, { title, body, url }) {
  try {
    const { rows: subs } = await pool.query(
      'SELECT s.id, s.endpoint FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE u.username = $1',
      [username]
    );
    if (!subs.length) return;
    const keys = await getKeys();
    const payload = JSON.stringify({ title: String(title).slice(0, 80), body: String(body || '').slice(0, 200), url: url || '#/notifications' });
    await Promise.all(subs.map(async (sub) => {
      await pool.query('INSERT INTO push_outbox (sub_id, payload) VALUES ($1, $2)', [sub.id, payload]);
      // Очередь не растёт бесконечно, если устройство давно не заходило.
      await pool.query(
        'DELETE FROM push_outbox WHERE sub_id = $1 AND (created_at < NOW() - INTERVAL \'2 days\' OR id NOT IN (SELECT id FROM push_outbox WHERE sub_id = $1 ORDER BY id DESC LIMIT 20))',
        [sub.id]
      );
      await wake(sub, keys);
    }));
  } catch (err) {
    console.error('Ошибка push:', err.message);
  }
}

// Один пуш = одно сообщение из очереди.
async function popPending(endpoint) {
  const { rows } = await pool.query(
    `DELETE FROM push_outbox WHERE id = (
       SELECT o.id FROM push_outbox o JOIN push_subscriptions s ON s.id = o.sub_id
       WHERE s.endpoint = $1 ORDER BY o.id LIMIT 1 FOR UPDATE OF o SKIP LOCKED
     ) RETURNING payload`,
    [endpoint]
  );
  return rows[0] ? JSON.parse(rows[0].payload) : null;
}

const NOTIFICATION_TEXT = {
  follow: () => 'подписался на вас',
  like: () => 'оценил ваш пост',
  comment: (n) => `прокомментировал: «${(n.content || '').slice(0, 80)}»`,
  repost: () => 'сделал репост вашего поста',
  clan_join: (n) => `вступил в ваш клан «${n.content || ''}»`,
  achievement: (n) => `Новое достижение: ${n.content}`,
  announcement: (n) => n.content,
  gift: (n) => `подарил вам подарок «${n.content}»`,
  gift_anon: (n) => `Вам подарили «${n.content}» 🎁`,
  verification_request: () => 'отправил заявку на галочку',
  verification_approved: () => 'Заявка одобрена — ваш аккаунт подтверждён ✅',
  verification_rejected: (n) => (n.content ? `Заявка на галочку отклонена: ${n.content}` : 'Заявка на галочку отклонена'),
};
const SYSTEM_TYPES = new Set(['achievement', 'announcement', 'gift_anon', 'verification_approved', 'verification_rejected']);

function pushForNotification(n) {
  const text = (NOTIFICATION_TEXT[n.type] || (() => 'новое уведомление'))(n);
  const profile = ['follow', 'clan_join', 'gift'].includes(n.type) ? `#/profile/${encodeURIComponent(n.user_from)}` : null;
  return {
    title: SYSTEM_TYPES.has(n.type) ? 'SSS' : `@${n.user_from}`,
    body: text,
    url: n.type === 'verification_request' ? '#/admin' : profile || '#/notifications',
  };
}

module.exports = { sendPushToUsername, popPending, getKeys, isAllowedEndpoint, pushForNotification, vapidHeader };
