// Шифрование сообщений «на диске»: в базе лежит только шифртекст AES-256-GCM.
// Это защита от утечки базы/бэкапа. Сервер при этом САМ расшифровывает переписку для участников чата,
// т.е. это не сквозное (end-to-end) шифрование.
//
// Ключ: переменная MESSAGE_ENCRYPTION_KEY (любая длинная случайная строка). Если её нет, сервер создаёт ключ
// сам и хранит его в таблице app_settings — это лучше, чем ничего, но настоящую защиту даёт ключ вне базы.
const crypto = require('crypto');
const { pool } = require('../db');

const PREFIX = 'enc1:';
const UNREADABLE = '🔒 Не удалось расшифровать сообщение';

const fromSecret = (secret) => crypto.createHash('sha256').update(`sss-messages-v1:${secret}`).digest();
const keyId = (key) => crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);

let keysPromise = null;
const getKeys = () => {
  if (!keysPromise) keysPromise = loadKeys().catch((err) => { keysPromise = null; throw err; });
  return keysPromise;
};

async function loadKeys() {
  const keys = new Map();
  let primary = null;
  if (process.env.MESSAGE_ENCRYPTION_KEY) {
    primary = fromSecret(process.env.MESSAGE_ENCRYPTION_KEY);
    keys.set(keyId(primary), primary);
  }
  const read = async () => (await pool.query("SELECT value FROM app_settings WHERE key = 'message_key'")).rows[0]?.value;
  let stored = await read();
  // Ключ из базы создаём только если ключа из окружения нет, но читать его всегда можем (для старых сообщений).
  if (!stored && !primary) {
    await pool.query("INSERT INTO app_settings (key, value) VALUES ('message_key', $1) ON CONFLICT DO NOTHING", [crypto.randomBytes(32).toString('base64')]);
    stored = await read();
  }
  if (stored) {
    const dbKey = Buffer.from(stored, 'base64');
    keys.set(keyId(dbKey), dbKey);
    if (!primary) primary = dbKey;
  }
  return { keys, primary };
}

async function encryptText(text) {
  const { primary } = await getKeys();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', primary, iv);
  const body = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return `${PREFIX}${keyId(primary)}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')}`;
}

async function decryptText(stored) {
  if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return stored; // старое сообщение без шифрования
  try {
    const [, kid, payload] = stored.split(':');
    const key = (await getKeys()).keys.get(kid);
    if (!key) return UNREADABLE;
    const raw = Buffer.from(payload, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return UNREADABLE;
  }
}

// Возвращает копию записи сообщения с расшифрованным текстом.
async function withPlainText(row, field = 'content') {
  return { ...row, [field]: await decryptText(row[field]) };
}

// Один раз при старте: шифрует сообщения, написанные до появления шифрования.
async function encryptExistingMessages() {
  let total = 0;
  for (;;) {
    const { rows } = await pool.query(`SELECT id, content FROM messages WHERE content NOT LIKE '${PREFIX}%' ORDER BY id LIMIT 200`);
    if (!rows.length) break;
    for (const row of rows) {
      await pool.query('UPDATE messages SET content = $2 WHERE id = $1 AND content = $3', [row.id, await encryptText(row.content), row.content]);
    }
    total += rows.length;
  }
  if (total) console.log(`🔐 Зашифровано старых сообщений: ${total}`);
  return total;
}

module.exports = { encryptText, decryptText, withPlainText, encryptExistingMessages };
