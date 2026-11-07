const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.db);

// Без этого обработчика «упавшее» idle-соединение роняет весь процесс.
pool.on('error', (err) => console.error('Ошибка idle-клиента БД:', err.message));

/**
 * Выполняет fn внутри ТРАНЗАКЦИИ НА ОДНОМ СОЕДИНЕНИИ.
 *
 * Раньше код делал pool.query('BEGIN') / pool.query('COMMIT'): пул отдаёт для каждого
 * запроса произвольное соединение, поэтому BEGIN оставался висеть на одном из них,
 * блокировал строки пользователя, и следующие запросы зависали навсегда
 * (это и была «бесконечная загрузка» при смене ника/описания).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* соединение уже закрыто */ }
    throw err;
  } finally {
    client.release();
  }
}

// Каждый шаг миграции выполняется отдельно: сбой одного не останавливает остальные.
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (
     id SERIAL PRIMARY KEY,
     username TEXT UNIQUE,
     handle TEXT UNIQUE,
     email TEXT UNIQUE,
     password TEXT,
     rating INTEGER DEFAULT 0,
     followers INTEGER DEFAULT 0,
     following INTEGER DEFAULT 0,
     member_since TEXT DEFAULT 'Май 2026',
     clan TEXT,
     is_premium BOOLEAN DEFAULT true,
     is_verified BOOLEAN DEFAULT false,
     bio TEXT DEFAULT ''
   )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS messages (
     id SERIAL PRIMARY KEY,
     sender TEXT NOT NULL,
     receiver TEXT NOT NULL,
     content TEXT NOT NULL,
     is_read BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS posts (
     id SERIAL PRIMARY KEY,
     username TEXT,
     content TEXT,
     likes INTEGER DEFAULT 0,
     comments_count INTEGER DEFAULT 0,
     reposts INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS comments (
     id SERIAL PRIMARY KEY,
     post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
     username TEXT,
     content TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS post_likes (
     id SERIAL PRIMARY KEY,
     post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
     username TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS reposts (
     id SERIAL PRIMARY KEY,
     post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
     username TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS follows (
     follower_username TEXT,
     following_username TEXT,
     PRIMARY KEY (follower_username, following_username)
   )`,
  `CREATE TABLE IF NOT EXISTS notifications (
     id SERIAL PRIMARY KEY,
     user_to TEXT NOT NULL,
     user_from TEXT NOT NULL,
     type TEXT NOT NULL,
     post_id INTEGER,
     content TEXT,
     is_read BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,

  // Реальная дата регистрации (раньше была зашита текстом «Май 2026»).
  // Для старых аккаунтов берём дату первого поста, иначе начало мая 2026.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`,
  `UPDATE users u SET created_at = COALESCE(
       (SELECT MIN(p.created_at)::timestamptz FROM posts p WHERE p.username = u.username),
       TIMESTAMPTZ '2026-05-01 00:00:00+00')
     WHERE u.created_at IS NULL`,
  `ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW()`,

  // Аватарки хранятся в БД (маленькие картинки), версия нужна для кеша браузера.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar BYTEA`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version INTEGER DEFAULT 0`,

  // Кланы. Связь по user_id, поэтому переименование пользователя ничего не ломает.
  `CREATE TABLE IF NOT EXISTS clans (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,
     tag TEXT NOT NULL UNIQUE,
     description TEXT DEFAULT '',
     owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS clan_members (
     clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     role TEXT NOT NULL DEFAULT 'member',
     joined_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (clan_id, user_id),
     UNIQUE (user_id)
   )`,

  // Индексы. Уникальные на лайках/репостах могут не создаться, если в старых данных есть дубли — не критично.
  `CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages (receiver, is_read)`,
  `CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages (sender)`,
  `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_to, is_read)`,
  `CREATE INDEX IF NOT EXISTS posts_username_idx ON posts (username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS post_likes_unique ON post_likes (post_id, username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reposts_unique ON reposts (post_id, username)`,
];

async function initDB() {
  for (const sql of MIGRATIONS) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('❌ Ошибка миграции:', err.message, '\n   ', sql.trim().split('\n')[0]);
    }
  }
  console.log('✅ База данных синхронизирована');
}

module.exports = { pool, withTransaction, initDB };
