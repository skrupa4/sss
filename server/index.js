const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express(); 

app.use(cors());
app.use(express.json());

const crypto = require('crypto');
// Секретный ключ шифрования (32 символа). Задай его в переменных окружения Render, либо будет дефолтный
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'abcdefghijklmnopqrstuvwxyz123456'; 
const IV_LENGTH = 16;

// Функции шифрования на сервере
function encryptText(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(text) {
  if (!text || !text.includes(':')) return text; // Если сообщение старое нешифрованное
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return '[Ошибка расшифровки]';
  }
}

// Настраиваем порт динамически для Render
const PORT = process.env.PORT || 5000;

// Автоматическое переключение баз:
const isProduction = process.env.DATABASE_URL;

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Обязательно для внешних облачных баз PostgreSQL
      }
    })
  : new Pool({
      connectionString: "postgresql://postgres:Kirilmaxim123@localhost:5432/sss_db?schema=public"
    });

const initDB = async () => {
  try {
    // Таблица юзеров (Добавлено поле is_verified)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        handle TEXT,
        email TEXT UNIQUE,
        password TEXT,
        rating INTEGER DEFAULT 0,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        member_since TEXT DEFAULT 'Май 2026',
        clan TEXT DEFAULT 'SSS OWNER',
        is_premium BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false -- <-- ДОБАВИЛИ ПОЛЕ ДЛЯ ГАЛОЧКИ ТУТ
      );
    `);
// Таблица личных сообщений
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender TEXT NOT NULL,
        receiver TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица постов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        username TEXT,
        content TEXT,
        likes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        reposts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица комментариев
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица лайков
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT
      );
    `);

    // Таблица репостов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reposts (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица подписок
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_username TEXT,
        following_username TEXT,
        PRIMARY KEY (follower_username, following_username)
      );
    `);

    console.log('✅ База данных синхронизирована (все таблицы созданы)');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  }
};

initDB();

// --- ПРОФИЛЬ И ЮЗЕРЫ ---

app.get('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const viewer = req.query.viewer;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "Юзер не найден" });
    
    let userData = userRes.rows[0];

    if (viewer) {
      const followCheck = await pool.query(
        'SELECT 1 FROM follows WHERE follower_username = $1 AND following_username = $2',
        [viewer, username]
      );
      userData.isSubscribed = followCheck.rows.length > 0;
    }

    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:oldUsername', async (req, res) => {
  const { oldUsername } = req.params;
  const { username, handle } = req.body;
  try {
    await pool.query('BEGIN');
    const result = await pool.query(
      'UPDATE users SET username = $1, handle = $2 WHERE username = $3 RETURNING *',
      [username, handle, oldUsername]
    );
    await pool.query('UPDATE posts SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE comments SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE post_likes SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE reposts SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Ошибка при обновлении профиля" });
  }
});

// --- ПОДПИСКИ ---

app.post('/api/users/:username/follow', async (req, res) => {
  const targetUser = req.params.username;
  const { follower } = req.body;

  if (targetUser === follower) return res.status(400).json({ error: "Нельзя подписаться на себя" });

  try {
    await pool.query('BEGIN');
    const check = await pool.query(
      'SELECT 1 FROM follows WHERE follower_username = $1 AND following_username = $2',
      [follower, targetUser]
    );

    if (check.rows.length > 0) {
      await pool.query('COMMIT');
      return res.json({ message: "Уже подписан" });
    }

    await pool.query('INSERT INTO follows (follower_username, following_username) VALUES ($1, $2)', [follower, targetUser]);
    await pool.query('UPDATE users SET followers = followers + 1 WHERE username = $1', [targetUser]);
    await pool.query('UPDATE users SET following = following + 1 WHERE username = $1', [follower]);
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:username/follow', async (req, res) => {
  const targetUser = req.params.username;
  const { follower } = req.body;

  try {
    await pool.query('BEGIN');
    const result = await pool.query(
      'DELETE FROM follows WHERE follower_username = $1 AND following_username = $2',
      [follower, targetUser]
    );

    if (result.rowCount > 0) {
      await pool.query('UPDATE users SET followers = GREATEST(0, followers - 1) WHERE username = $1', [targetUser]);
      await pool.query('UPDATE users SET following = GREATEST(0, following - 1) WHERE username = $1', [follower]);
    }
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- ПОСТЫ И ЛЕНТА ---

// Изменено: Добавлен LEFT JOIN, чтобы брать is_verified из таблицы пользователей для общей ленты
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.is_verified 
      FROM posts p 
      LEFT JOIN users u ON p.username = u.username 
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменено: Добавлен LEFT JOIN для постов конкретного юзера
app.get('/api/posts/user/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, u.is_verified 
      FROM posts p 
      LEFT JOIN users u ON p.username = u.username 
      WHERE p.username = $1 
      ORDER BY p.created_at DESC
    `, [username]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка при получении постов" });
  }
});

app.post('/api/posts', async (req, res) => {
  const { content, username } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts (username, content) VALUES ($1, $2) RETURNING *', 
      [username, content]
    );
    await pool.query('UPDATE users SET rating = rating + 1 WHERE username = $1', [username]);
    
    // Чтобы фронтенд сразу получал созданный пост со статусом галочки:
    const userCheck = await pool.query('SELECT is_verified FROM users WHERE username = $1', [username]);
    const savedPost = result.rows[0];
    savedPost.is_verified = userCheck.rows[0]?.is_verified || false;

    res.json(savedPost);
  } catch (err) {
    res.status(500).json({ error: "Ошибка публикации" });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: "Удалено" });
  } catch (err) {
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

// --- РЕПОСТЫ ---

app.post('/api/posts/:id/repost', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const check = await pool.query('SELECT * FROM reposts WHERE post_id = $1 AND username = $2', [id, username]);
    if (check.rows.length > 0) return res.status(400).json({ error: "Уже репостнуто" });
    
    await pool.query('INSERT INTO reposts (post_id, username) VALUES ($1, $2)', [id, username]);
    await pool.query('UPDATE posts SET reposts = reposts + 1 WHERE id = $1', [id]);
    const updated = await pool.query('SELECT reposts FROM posts WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id/repost', async (req, res) => {
  const postId = req.params.id;
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const result = await pool.query('DELETE FROM reposts WHERE post_id = $1 AND username = $2', [postId, username]);
    
    if (result.rowCount > 0) {
      await pool.query('UPDATE posts SET reposts = GREATEST(0, reposts - 1) WHERE id = $1', [postId]);
      res.json({ message: 'Repost removed', postId });
    } else {
      res.status(404).json({ error: 'Repost not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменено: Добавлен LEFT JOIN для подтягивания галочки оригинального автора в репостах
app.get('/api/posts/reposts/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, u.is_verified FROM posts p
      INNER JOIN reposts r ON p.id = r.post_id 
      LEFT JOIN users u ON p.username = u.username
      WHERE r.username = $1 
      ORDER BY r.created_at DESC
    `, [username]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки репостов" });
  }
});

// --- КОММЕНТАРИИ И ЛАЙКИ ---

app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const check = await pool.query('SELECT * FROM post_likes WHERE post_id = $1 AND username = $2', [id, username]);
    if (check.rows.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND username = $2', [id, username]);
      await pool.query('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1', [id]);
    } else {
      await pool.query('INSERT INTO post_likes (post_id, username) VALUES ($1, $2)', [id, username]);
      await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id]);
    }
    const updated = await pool.query('SELECT likes FROM posts WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки" });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { username, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO comments (post_id, username, content) VALUES ($1, $2, $3) RETURNING *',
      [id, username, content]
    );
    await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Ошибка комментария" });
  }
});

// --- АВТОРИЗАЦИЯ ---

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const handle = username.toLowerCase();
    const result = await pool.query(
      'INSERT INTO users (username, email, password, handle) VALUES ($1, $2, $3, $4) RETURNING id, username, handle',
      [username, email, hashedPassword, handle]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
        res.status(400).json({ error: "Ник или почта уже заняты" });
    } else {
        res.status(500).json({ error: "Ошибка базы данных: " + err.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Пользователь не найден" });
    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    if (!isMatch) return res.status(401).json({ error: "Неверный пароль" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
// --- ЛИЧНЫЕ СООБЩЕНИЯ С ШИФРОВАНИЕМ ---

// 1. Отправка сообщения (Шифрует перед записью в БД)
app.post('/api/messages', async (req, res) => {
  const { sender, receiver, content } = req.body;
  if (!sender || !receiver || !content?.trim()) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }
  try {
    const encryptedContent = encryptText(content);
    const result = await pool.query(
      'INSERT INTO messages (sender, receiver, content) VALUES ($1, $2, $3) RETURNING *',
      [sender, receiver, encryptedContent]
    );
    const savedMsg = result.rows[0];
    savedMsg.content = content; // Возвращаем фронтенду расшифрованный текст
    res.json(savedMsg);
  } catch (err) {
    res.status(500).json({ error: "Ошибка отправки: " + err.message });
  }
});

// 2. История переписки + авто-прочтение при запросе чата
app.get('/api/messages/history', async (req, res) => {
  const { user1, user2 } = req.query; // user1 - текущий, user2 - собеседник
  try {
    // Помечаем сообщения от собеседника к нам как прочитанные
    await pool.query(
      'UPDATE messages SET is_read = true WHERE sender = $1 AND receiver = $2 AND is_read = false',
      [user2, user1]
    );

    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
       ORDER BY created_at ASC`,
      [user1, user2]
    );

    // Расшифровываем перед отправкой на фронт
    const decryptedRows = result.rows.map(row => ({
      ...row,
      content: decryptText(row.content)
    }));

    res.json(decryptedRows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка истории: " + err.message });
  }
});

// 3. Список чатов с информацией о непрочитанных
app.get('/api/messages/chats', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query(
      `WITH last_messages AS (
         SELECT DISTINCT ON (CASE WHEN sender = $1 THEN receiver ELSE sender END)
                id, sender, receiver, content, is_read, created_at,
                CASE WHEN sender = $1 THEN receiver ELSE sender END as chat_user
         FROM messages
         WHERE sender = $1 OR receiver = $1
         ORDER BY CASE WHEN sender = $1 THEN receiver ELSE sender END, created_at DESC
       ),
       unread_counts AS (
         SELECT sender, COUNT(*) as unread
         FROM messages
         WHERE receiver = $1 AND is_read = false
         GROUP BY sender
       )
       SELECT lm.chat_user as username, lm.content as last_message, lm.created_at, lm.sender, lm.is_read,
              COALESCE(uc.unread, 0)::int as unread_count, u.handle, u.is_verified
       FROM last_messages lm
       LEFT JOIN users u ON u.username = lm.chat_user
       LEFT JOIN unread_counts uc ON uc.sender = lm.chat_user
       ORDER BY lm.created_at DESC`,
      [username]
    );

    const formattedChats = result.rows.map(chat => ({
      ...chat,
      last_message: decryptText(chat.last_message),
      // Непрочитанным считается, если последнее сообщение отправлено НЕ нами и имеет статус false
      hasUnread: chat.unread_count > 0
    }));

    res.json(formattedChats);
  } catch (err) {
    res.status(500).json({ error: "Ошибка чатов: " + err.message });
  }
});

// 4. Общее количество новых сообщений для глобального счетчика на вкладке
app.get('/api/messages/unread/total', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int as total FROM messages WHERE receiver = $1 AND is_read = false',
      [username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ total: 0 });
  }
});

// Слушаем динамический порт от Render
app.listen(PORT, () => console.log(`🔥 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`));