const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const isProduction = process.env.DATABASE_URL;

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      connectionString: "postgresql://postgres:Kirilmaxim123@localhost:5432/sss_db?schema=public"
    });

// ========== ИНИЦИАЛИЗАЦИЯ БД ==========
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        handle TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        rating INTEGER DEFAULT 0,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        member_since TEXT DEFAULT 'Май 2026',
        clan TEXT DEFAULT 'SSS OWNER',
        is_premium BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        bio TEXT DEFAULT ''
      );
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`);

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
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`);

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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reposts (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_username TEXT,
        following_username TEXT,
        PRIMARY KEY (follower_username, following_username)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_to TEXT NOT NULL,
        user_from TEXT NOT NULL,
        type TEXT NOT NULL,
        post_id INTEGER,
        content TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ База данных синхронизирована');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  }
};
initDB();

// ========== УВЕДОМЛЕНИЯ ==========
async function createNotification(userTo, userFrom, type, postId = null, extraContent = null) {
  if (userTo === userFrom) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_to, user_from, type, post_id, content) VALUES ($1, $2, $3, $4, $5)`,
      [userTo, userFrom, type, postId, extraContent]
    );
  } catch (err) {
    console.error('Ошибка создания уведомления:', err);
  }
}

// ========== ПРОФИЛЬ ==========
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
  const { username, handle, bio } = req.body;
  try {
    if (username !== oldUsername) {
      const check = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (check.rows.length > 0) {
        return res.status(400).json({ error: "Пользователь с таким именем уже существует" });
      }
    }
    if (handle !== oldUsername.toLowerCase()) {
      const checkHandle = await pool.query('SELECT 1 FROM users WHERE handle = $1', [handle]);
      if (checkHandle.rows.length > 0) {
        return res.status(400).json({ error: "Такой handle уже занят" });
      }
    }

    await pool.query('BEGIN');
    const result = await pool.query(
      'UPDATE users SET username = $1, handle = $2, bio = $3 WHERE username = $4 RETURNING *',
      [username, handle, bio || '', oldUsername]
    );
    if (result.rows.length === 0) throw new Error('Пользователь не найден');

    await pool.query('UPDATE posts SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE comments SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE post_likes SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE reposts SET username = $1 WHERE username = $2', [username, oldUsername]);
    await pool.query('UPDATE follows SET follower_username = $1 WHERE follower_username = $2', [username, oldUsername]);
    await pool.query('UPDATE follows SET following_username = $1 WHERE following_username = $2', [username, oldUsername]);
    await pool.query('UPDATE messages SET sender = $1 WHERE sender = $2', [username, oldUsername]);
    await pool.query('UPDATE messages SET receiver = $1 WHERE receiver = $2', [username, oldUsername]);
    await pool.query('UPDATE notifications SET user_from = $1 WHERE user_from = $2', [username, oldUsername]);
    await pool.query('UPDATE notifications SET user_to = $1 WHERE user_to = $2', [username, oldUsername]);

    await pool.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Ошибка при обновлении профиля: " + err.message });
  }
});

// ========== ПОДПИСКИ ==========
app.post('/api/users/:username/follow', async (req, res) => {
  const targetUser = req.params.username;
  const { follower } = req.body;
  if (targetUser === follower) return res.status(400).json({ error: "Нельзя подписаться на себя" });
  try {
    const [targetExists, followerExists] = await Promise.all([
      pool.query('SELECT 1 FROM users WHERE username = $1', [targetUser]),
      pool.query('SELECT 1 FROM users WHERE username = $1', [follower])
    ]);
    if (targetExists.rows.length === 0) return res.status(404).json({ error: "Целевой пользователь не найден" });
    if (followerExists.rows.length === 0) return res.status(404).json({ error: "Подписчик не найден" });

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

    await createNotification(targetUser, follower, 'follow');
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

// ========== ПОСТЫ ==========
app.get('/api/posts', async (req, res) => {
  const afterId = req.query.after_id ? parseInt(req.query.after_id) : 0;
  try {
    if (afterId > 0) {
      const result = await pool.query(`
        SELECT p.*, u.is_verified 
        FROM posts p 
        LEFT JOIN users u ON p.username = u.username 
        WHERE p.id > $1
        ORDER BY p.created_at DESC
      `, [afterId]);
      return res.json(result.rows);
    } else {
      const result = await pool.query(`
        SELECT p.*, u.is_verified 
        FROM posts p 
        LEFT JOIN users u ON p.username = u.username 
        ORDER BY p.created_at DESC
      `);
      res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const userCheck = await pool.query('SELECT is_verified FROM users WHERE username = $1', [username]);
    const savedPost = result.rows[0];
    savedPost.is_verified = userCheck.rows[0]?.is_verified || false;
    res.json(savedPost);
  } catch (err) {
    res.status(500).json({ error: "Ошибка публикации" });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const post = await pool.query('SELECT username FROM posts WHERE id = $1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ error: "Пост не найден" });
    const author = post.rows[0].username;
    await pool.query('BEGIN');
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    await pool.query('UPDATE users SET rating = GREATEST(0, rating - 1) WHERE username = $1', [author]);
    await pool.query('COMMIT');
    res.json({ message: "Удалено" });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

// ========== ЛАЙКИ ==========
app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const postOwner = await pool.query('SELECT username FROM posts WHERE id = $1', [id]);
    if (postOwner.rows.length === 0) return res.status(404).json({ error: "Пост не найден" });
    const owner = postOwner.rows[0].username;

    const check = await pool.query('SELECT * FROM post_likes WHERE post_id = $1 AND username = $2', [id, username]);
    if (check.rows.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND username = $2', [id, username]);
      await pool.query('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1', [id]);
    } else {
      await pool.query('INSERT INTO post_likes (post_id, username) VALUES ($1, $2)', [id, username]);
      await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id]);
      await createNotification(owner, username, 'like', id);
    }
    const updated = await pool.query('SELECT likes FROM posts WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== КОММЕНТАРИИ ==========
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
    const postOwner = await pool.query('SELECT username FROM posts WHERE id = $1', [id]);
    if (postOwner.rows.length === 0) return res.status(404).json({ error: "Пост не найден" });
    const owner = postOwner.rows[0].username;

    const result = await pool.query(
      'INSERT INTO comments (post_id, username, content) VALUES ($1, $2, $3) RETURNING *',
      [id, username, content]
    );
    await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [id]);
    await createNotification(owner, username, 'comment', id, content.substring(0, 100));
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Ошибка комментария" });
  }
});

// ========== РЕПОСТЫ ==========
app.post('/api/posts/:id/repost', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const check = await pool.query('SELECT * FROM reposts WHERE post_id = $1 AND username = $2', [id, username]);
    if (check.rows.length > 0) return res.status(400).json({ error: "Уже репостнуто" });
    const postOwner = await pool.query('SELECT username FROM posts WHERE id = $1', [id]);
    if (postOwner.rows.length === 0) return res.status(404).json({ error: "Пост не найден" });
    const owner = postOwner.rows[0].username;

    await pool.query('INSERT INTO reposts (post_id, username) VALUES ($1, $2)', [id, username]);
    await pool.query('UPDATE posts SET reposts = reposts + 1 WHERE id = $1', [id]);
    await createNotification(owner, username, 'repost', id);
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

// ========== АВТОРИЗАЦИЯ ==========
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
      if (err.constraint === 'users_handle_key') {
        res.status(400).json({ error: "Такой никнейм (handle) уже занят" });
      } else {
        res.status(400).json({ error: "Ник или почта уже заняты" });
      }
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

// ========== ЛИЧНЫЕ СООБЩЕНИЯ ==========
app.post('/api/messages', async (req, res) => {
  const { sender, receiver, content } = req.body;
  if (!sender || !receiver || !content?.trim()) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }
  try {
    const receiverExists = await pool.query('SELECT 1 FROM users WHERE username = $1', [receiver]);
    if (receiverExists.rows.length === 0) {
      return res.status(404).json({ error: "Получатель не найден" });
    }
    const result = await pool.query(
      'INSERT INTO messages (sender, receiver, content, is_read) VALUES ($1, $2, $3, false) RETURNING *',
      [sender, receiver, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Ошибка отправки сообщения: " + err.message });
  }
});

app.get('/api/messages/history', async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
       ORDER BY created_at ASC`,
      [user1, user2]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения истории: " + err.message });
  }
});

app.get('/api/messages/chats', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query(
      `WITH last_messages AS (
         SELECT DISTINCT ON (CASE WHEN sender = $1 THEN receiver ELSE sender END)
                id, sender, receiver, content, created_at,
                CASE WHEN sender = $1 THEN receiver ELSE sender END as chat_user
         FROM messages
         WHERE sender = $1 OR receiver = $1
         ORDER BY CASE WHEN sender = $1 THEN receiver ELSE sender END, created_at DESC
       )
       SELECT lm.chat_user as username, lm.content as last_message, lm.created_at, u.handle, u.is_verified
       FROM last_messages lm
       LEFT JOIN users u ON u.username = lm.chat_user
       ORDER BY lm.created_at DESC`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения списка чатов: " + err.message });
  }
});

app.get('/api/messages/unread-count', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver = $1 AND is_read = false',
      [username]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/unread-chats', async (req, res) => {
  const { username } = req.query;
  try {
    const result = await pool.query(
      `SELECT 
         CASE WHEN sender = $1 THEN receiver ELSE sender END as chat_user,
         COUNT(*) as unread_count
       FROM messages
       WHERE receiver = $1 AND is_read = false
       GROUP BY chat_user`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/read', async (req, res) => {
  const { username, chatUser } = req.body;
  try {
    await pool.query(
      'UPDATE messages SET is_read = true WHERE receiver = $1 AND sender = $2 AND is_read = false',
      [username, chatUser]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== УВЕДОМЛЕНИЯ ==========
app.get('/api/notifications', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username required" });
  try {
    const result = await pool.query(
      `SELECT n.*, u.is_verified as from_verified 
       FROM notifications n
       LEFT JOIN users u ON n.user_from = u.username
       WHERE n.user_to = $1 
       ORDER BY n.created_at DESC`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', async (req, res) => {
  const { notificationId, username } = req.body;
  try {
    if (notificationId) {
      await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_to = $2', [notificationId, username]);
    } else {
      await pool.query('UPDATE notifications SET is_read = true WHERE user_to = $1', [username]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications', async (req, res) => {
  const { username } = req.query;
  try {
    await pool.query('DELETE FROM notifications WHERE user_to = $1', [username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ЗАПУСК ==========
app.listen(PORT, () => console.log(`🔥 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`));