require('dotenv').config();
const crypto = require('crypto');

const env = process.env;

function isLocalHost(host) {
  return ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(host);
}

// Подключение к БД: либо DATABASE_URL (Render и т.п.), либо DB_* (docker-compose).
function buildDbConfig() {
  const base = {
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    // Страховка от «зависших» транзакций: если клиент завис внутри BEGIN,
    // Postgres сам закроет сессию через 15 секунд и снимет блокировки.
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 15_000,
  };

  if (env.DATABASE_URL) {
    let host = '';
    try { host = new URL(env.DATABASE_URL).hostname; } catch { /* ignore */ }
    const useSsl = env.DATABASE_SSL ? env.DATABASE_SSL !== 'false' : !isLocalHost(host);
    return { ...base, connectionString: env.DATABASE_URL, ssl: useSsl ? { rejectUnauthorized: false } : false };
  }

  return {
    ...base,
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'sss_db',
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

function resolveJwtSecret() {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  console.warn('⚠️  JWT_SECRET не задан. Используется секрет, выведенный из настроек БД. Задайте JWT_SECRET в переменных окружения!');
  const seed = env.DATABASE_URL || `${env.DB_HOST}:${env.DB_USER}:${env.DB_PASSWORD}:${env.DB_NAME}`;
  return crypto.createHash('sha256').update(`sss-jwt:${seed}`).digest('hex');
}

// Логины (никнейм ИЛИ хэндл), которым автоматически выдаётся доступ к админ-панели.
const adminNames = (env.ADMIN_USERNAMES || 'skrupa4').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const origins = (env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  PORT: Number(env.PORT || 5000),
  db: buildDbConfig(),
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '30d',
  // Пусто = разрешить любой origin (как было раньше). Для продакшена лучше задать CLIENT_ORIGIN.
  adminNames,
  // Приём платежей (ЮKassa). Без этих ключей покупка монет отключена.
  yookassa: { shopId: env.YOOKASSA_SHOP_ID || '', secretKey: env.YOOKASSA_SECRET_KEY || '', apiUrl: env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3' },
  // Почта для кодов подтверждения. Нужен ключ ОДНОГО из сервисов (HTTP API: у Render free SMTP закрыт).
  mail: {
    brevoKey: env.BREVO_API_KEY || '',
    resendKey: env.RESEND_API_KEY || '',
    from: env.MAIL_FROM || '',
    fromName: env.MAIL_FROM_NAME || 'SSS',
    // Своя «почтовая труба» по HTTPS (например, скрипт Google Apps Script, отправляющий через ваш Gmail).
    webhookUrl: env.MAIL_WEBHOOK_URL || '',
    webhookSecret: env.MAIL_WEBHOOK_SECRET || '',
  },
  corsOrigin: origins.length ? origins : true,
};
