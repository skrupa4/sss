const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { broadcast } = require('../services/realtime');
const { HttpError } = require('../utils/errors');
const { validateText, str } = require('../utils/validate');
const { nickColumns } = require('../services/users');
const { checkByUsername } = require('../services/achievements');

const router = express.Router();

// $1 всегда = имя смотрящего (для флагов «я лайкнул / репостнул»).
const POST_SELECT = `
  SELECT p.*, u.is_verified, u.avatar_version, ${nickColumns('u')}, CASE WHEN u.hide_clan_tag THEN NULL ELSE c.tag END AS clan_tag,
    EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.username = $1) AS liked_by_me,
    EXISTS (SELECT 1 FROM reposts rp WHERE rp.post_id = p.id AND rp.username = $1) AS reposted_by_me,
    EXISTS (SELECT 1 FROM post_images pi WHERE pi.post_id = p.id) AS has_image
  FROM posts p
  LEFT JOIN users u ON u.username = p.username
  LEFT JOIN clan_members cm ON cm.user_id = u.id
  LEFT JOIN clans c ON c.id = cm.clan_id`;

const viewerOf = (req) => req.user?.username || '';

async function getPost(db, id, viewer) {
  const { rows } = await db.query(`${POST_SELECT} WHERE p.id = $2`, [viewer, id]);
  return rows[0] || null;
}

function counters(post) {
  return { id: post.id, likes: post.likes, comments_count: post.comments_count, reposts: post.reposts };
}

// ---------- Списки (статические маршруты раньше /:id) ----------
// ?filter=following — только посты тех, на кого я подписан, и мои.
router.get('/', optionalAuth, async (req, res) => {
  const onlyFollowing = req.query.filter === 'following' && req.user;
  const { rows } = await pool.query(
    `${POST_SELECT}
     ${onlyFollowing ? 'WHERE p.username = $1 OR p.username IN (SELECT following_username FROM follows WHERE follower_username = $1)' : ''}
     ORDER BY p.created_at DESC, p.id DESC LIMIT 100`,
    [viewerOf(req)]
  );
  res.json(rows);
});

router.get('/user/:username', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `${POST_SELECT} WHERE p.username = $2 ORDER BY p.created_at DESC, p.id DESC LIMIT 100`,
    [viewerOf(req), req.params.username]
  );
  res.json(rows);
});

router.get('/reposts/:username', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `${POST_SELECT}
     INNER JOIN reposts r ON r.post_id = p.id
     WHERE r.username = $2
     ORDER BY r.created_at DESC LIMIT 100`,
    [viewerOf(req), req.params.username]
  );
  res.json(rows);
});

// ---------- Создание / удаление ----------
const IMAGE_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 1_200_000;
const SIGNATURES = {
  'image/png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/jpeg': (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
};

function parseImage(value) {
  if (value === undefined || value === null || value === '') return null;
  const match = IMAGE_RE.exec(typeof value === 'string' ? value : '');
  if (!match) throw new HttpError(400, 'Фото должно быть PNG, JPEG или WebP');
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'Фото слишком большое (максимум ~1 МБ)');
  // Тип из data-URL ничего не гарантирует — сверяем с реальными первыми байтами файла.
  if (!SIGNATURES[match[1]](data)) throw new HttpError(400, 'Файл не похож на изображение');
  return { mime: match[1], data };
}

router.post('/', requireAuth, async (req, res) => {
  const image = parseImage(req.body.image);
  // С фото подпись необязательна, без фото — текст обязателен.
  const content = image && !str(req.body.content) ? '' : validateText(req.body.content, { max: 500, field: 'Пост' });
  const id = await withTransaction(async (db) => {
    const inserted = await db.query('INSERT INTO posts (username, content) VALUES ($1, $2) RETURNING id', [req.user.username, content]);
    if (image) await db.query('INSERT INTO post_images (post_id, mime, data) VALUES ($1, $2, $3)', [inserted.rows[0].id, image.mime, image.data]);
    return inserted.rows[0].id;
  });

  const post = await getPost(pool, id, req.user.username);
  broadcast('post:new', { ...post, liked_by_me: false, reposted_by_me: false });
  checkByUsername(req.user.username);
  res.json(post);
});

// Картинка поста открыта всем (как и сам пост) — поэтому её можно ставить прямо в <img src>.
router.get('/:id/image', async (req, res) => {
  const { rows } = await pool.query('SELECT mime, data FROM post_images WHERE post_id = $1', [Number(req.params.id) || 0]);
  if (!rows.length) throw new HttpError(404, 'Фото не найдено');
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(rows[0].data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const removed = await withTransaction(async (db) => {
    const result = await db.query('DELETE FROM posts WHERE id = $1 AND username = $2 RETURNING id', [id, req.user.username]);
    return result.rows.length > 0;
  });
  if (!removed) throw new HttpError(404, 'Пост не найден или он не ваш');
  broadcast('post:deleted', { id });
  res.json({ message: 'Удалено' });
});

// ---------- Лайки ----------
router.post('/:id/like', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const username = req.user.username;

  const { post, liked } = await withTransaction(async (db) => {
    const found = await db.query('SELECT username FROM posts WHERE id = $1 FOR UPDATE', [id]);
    if (!found.rows.length) throw new HttpError(404, 'Пост не найден');

    const removed = await db.query('DELETE FROM post_likes WHERE post_id = $1 AND username = $2', [id, username]);
    let isLiked;
    if (removed.rowCount > 0) {
      await db.query('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1', [id]);
      isLiked = false;
    } else {
      await db.query('INSERT INTO post_likes (post_id, username) VALUES ($1, $2)', [id, username]);
      await db.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id]);
      isLiked = true;
    }
    const updated = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    return { post: updated.rows[0], liked: isLiked };
  });

  if (liked) {
    await createNotification(post.username, username, 'like', id);
    checkByUsername(username);
    checkByUsername(post.username);
  }
  broadcast('post:updated', counters(post));
  res.json({ ...counters(post), liked_by_me: liked });
});

// ---------- Репосты ----------
router.post('/:id/repost', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const username = req.user.username;

  const post = await withTransaction(async (db) => {
    const found = await db.query('SELECT username FROM posts WHERE id = $1 FOR UPDATE', [id]);
    if (!found.rows.length) throw new HttpError(404, 'Пост не найден');
    const inserted = await db.query(
      'INSERT INTO reposts (post_id, username) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [id, username]
    );
    if (!inserted.rows.length) throw new HttpError(400, 'Уже репостнуто');
    await db.query('UPDATE posts SET reposts = reposts + 1 WHERE id = $1', [id]);
    return (await db.query('SELECT * FROM posts WHERE id = $1', [id])).rows[0];
  });

  await createNotification(post.username, username, 'repost', id);
  checkByUsername(username);
  broadcast('post:updated', counters(post));
  res.json({ ...counters(post), reposted_by_me: true });
});

router.delete('/:id/repost', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const post = await withTransaction(async (db) => {
    const removed = await db.query('DELETE FROM reposts WHERE post_id = $1 AND username = $2', [id, req.user.username]);
    if (!removed.rowCount) throw new HttpError(404, 'Репост не найден');
    await db.query('UPDATE posts SET reposts = GREATEST(0, reposts - 1) WHERE id = $1', [id]);
    return (await db.query('SELECT * FROM posts WHERE id = $1', [id])).rows[0];
  });
  broadcast('post:updated', counters(post));
  res.json({ ...counters(post), reposted_by_me: false });
});

// ---------- Комментарии ----------
router.get('/:id/comments', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT cmt.*, u.avatar_version, u.is_verified, ${nickColumns('u')}
     FROM comments cmt LEFT JOIN users u ON u.username = cmt.username
     WHERE cmt.post_id = $1 ORDER BY cmt.created_at ASC, cmt.id ASC`,
    [Number(req.params.id)]
  );
  res.json(rows);
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const content = validateText(req.body.content, { max: 500, field: 'Комментарий' });

  const { comment, post } = await withTransaction(async (db) => {
    const found = await db.query('SELECT username FROM posts WHERE id = $1 FOR UPDATE', [id]);
    if (!found.rows.length) throw new HttpError(404, 'Пост не найден');
    const inserted = await db.query(
      `INSERT INTO comments (post_id, username, content) VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.username, content]
    );
    await db.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [id]);
    return { comment: inserted.rows[0], post: (await db.query('SELECT * FROM posts WHERE id = $1', [id])).rows[0] };
  });

  const me = await pool.query(`SELECT u.avatar_version, u.is_verified, ${nickColumns('u')} FROM users u WHERE u.id = $1`, [req.user.id]);
  const fullComment = { ...comment, ...me.rows[0] };

  await createNotification(post.username, req.user.username, 'comment', id, content.substring(0, 100));
  checkByUsername(req.user.username);
  broadcast('post:updated', counters(post));
  broadcast('comment:new', { post_id: id, comment: fullComment });
  res.json(fullComment);
});

module.exports = router;
