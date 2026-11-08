const { pool } = require('../db');
const { emitToUsername, pushCounters } = require('./realtime');
const { addCoins, ACHIEVEMENT_REWARDS } = require('./coins');

// tier: common | rare | epic | legendary (клиент красит значки по редкости)
const A = (code, title, description, icon, tier, metric, target) => ({ code, title, description, icon, tier, metric, target });

const DEFINITIONS = [
  A('first_post', 'Первый шаг', 'Опубликуйте первый пост', '✍️', 'common', 'posts', 1),
  A('posts_10', 'Блогер', 'Опубликуйте 10 постов', '📝', 'rare', 'posts', 10),
  A('posts_50', 'Автор', 'Опубликуйте 50 постов', '📚', 'epic', 'posts', 50),

  A('likes_10', 'Добрая душа', 'Лайкните 10 постов', '💖', 'common', 'likes_given', 10),
  A('likes_100', 'Лайкер', 'Лайкните 100 постов', '❤️‍🔥', 'rare', 'likes_given', 100),
  A('likes_500', 'Сердцеед', 'Лайкните 500 постов', '💘', 'epic', 'likes_given', 500),

  A('liked_10', 'Вас заметили', 'Соберите 10 лайков на своих постах', '⭐', 'common', 'likes_received', 10),
  A('liked_100', 'Звезда', 'Соберите 100 лайков на своих постах', '🌟', 'epic', 'likes_received', 100),

  A('follow_1', 'Знакомство', 'Подпишитесь на первого человека', '🤝', 'common', 'following', 1),
  A('follow_10', 'Общительный', 'Подпишитесь на 10 человек', '👥', 'rare', 'following', 10),
  A('follow_100', 'Коллекционер', 'Подпишитесь на 100 человек', '🧲', 'legendary', 'following', 100),

  A('followers_10', 'Популярный', 'Наберите 10 подписчиков', '🔥', 'rare', 'followers', 10),
  A('followers_100', 'Знаменитость', 'Наберите 100 подписчиков', '👑', 'legendary', 'followers', 100),

  A('comments_10', 'Комментатор', 'Напишите 10 комментариев', '💬', 'common', 'comments', 10),
  A('comments_100', 'Говорун', 'Напишите 100 комментариев', '🗣️', 'epic', 'comments', 100),

  A('reposts_10', 'Распространитель', 'Сделайте 10 репостов', '🔁', 'rare', 'reposts', 10),

  A('messages_50', 'Собеседник', 'Отправьте 50 личных сообщений', '✉️', 'rare', 'messages', 50),
  A('messages_500', 'Почтальон', 'Отправьте 500 личных сообщений', '📮', 'epic', 'messages', 500),

  A('clan_join', 'В команде', 'Вступите в клан', '🛡️', 'common', 'in_clan', 1),
  A('clan_create', 'Основатель', 'Создайте свой клан', '🏰', 'rare', 'clans_created', 1),
  A('clan_size_10', 'Предводитель', 'Соберите в своём клане 10 участников', '⚔️', 'legendary', 'clan_size', 10),

  A('avatar', 'Лицо сайта', 'Поставьте аватарку', '📸', 'common', 'avatar', 1),
  A('bio', 'Расскажи о себе', 'Заполните описание профиля', '🪪', 'common', 'bio', 1),
  A('premium', 'Премиум', 'Активируйте Premium', '💎', 'epic', 'premium', 1),
  A('story_1', 'Рассказчик', 'Опубликуйте первую сторис', '🎬', 'rare', 'stories', 1),
  A('story_10', 'Режиссёр', 'Опубликуйте 10 сторис', '🎞️', 'epic', 'stories', 10),
  A('gift_send', 'Щедрая душа', 'Подарите первый подарок', '🎁', 'common', 'gifts_sent', 1),
  A('gift_get', 'Мне? Спасибо!', 'Получите первый подарок', '🎀', 'common', 'gifts_received', 1),
  A('verified', 'Подтверждённый', 'Получите подтверждение аккаунта', '✅', 'legendary', 'verified', 1),

  A('age_7', 'Новосёл', 'Будьте с нами 7 дней', '🏠', 'common', 'age_days', 7),
  A('age_30', 'Старожил', 'Будьте с нами 30 дней', '🕰️', 'rare', 'age_days', 30),
  A('age_100', 'Ветеран', 'Будьте с нами 100 дней', '🏆', 'legendary', 'age_days', 100),
];

const BY_KEY = new Map(DEFINITIONS.map((d) => [d.code, d]));

async function loadMetrics(userId) {
  const { rows } = await pool.query(
    `SELECT u.username, u.bio, u.avatar_version, u.is_verified, u.followers, u.following,
            u.premium_trial_used, u.premium_until,
            (SELECT COUNT(*) FROM stories WHERE user_id = u.id)::int AS stories,
            (SELECT COUNT(*) FROM posts WHERE username = u.username)::int AS posts,
            (SELECT COUNT(*) FROM gifts_sent WHERE from_user_id = u.id)::int AS gifts_sent,
            (SELECT COUNT(*) FROM gifts_sent WHERE to_user_id = u.id)::int AS gifts_received,
            (SELECT COUNT(*) FROM post_likes WHERE username = u.username)::int AS likes_given,
            (SELECT COALESCE(SUM(likes), 0) FROM posts WHERE username = u.username)::int AS likes_received,
            (SELECT COUNT(*) FROM comments WHERE username = u.username)::int AS comments,
            (SELECT COUNT(*) FROM reposts WHERE username = u.username)::int AS reposts,
            (SELECT COUNT(*) FROM messages WHERE sender = u.username)::int AS messages,
            (SELECT COUNT(*) FROM clan_members WHERE user_id = u.id)::int AS in_clan,
            (SELECT COUNT(*) FROM clans WHERE owner_id = u.id)::int AS clans_created,
            COALESCE((SELECT MAX(cnt) FROM (
               SELECT COUNT(*) AS cnt FROM clan_members m JOIN clans c ON c.id = m.clan_id
               WHERE c.owner_id = u.id GROUP BY c.id) t), 0)::int AS clan_size,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(u.created_at, NOW()))) / 86400))::int AS age_days
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  const m = rows[0];
  if (!m) return null;
  return {
    username: m.username,
    posts: m.posts,
    gifts_sent: m.gifts_sent,
    gifts_received: m.gifts_received,
    likes_given: m.likes_given,
    likes_received: m.likes_received,
    following: m.following || 0,
    followers: m.followers || 0,
    comments: m.comments,
    reposts: m.reposts,
    messages: m.messages,
    in_clan: m.in_clan,
    clans_created: m.clans_created,
    clan_size: m.clan_size,
    avatar: m.avatar_version > 0 ? 1 : 0,
    bio: (m.bio || '').trim() ? 1 : 0,
    premium: m.premium_trial_used || m.premium_until ? 1 : 0,
    stories: m.stories,
    verified: m.is_verified ? 1 : 0,
    age_days: m.age_days,
  };
}

/**
 * Проверяет достижения пользователя и выдаёт новые.
 * silent = true — только записать (для «догона» старых аккаунтов, без уведомлений).
 * Ошибки глотаем: достижения не должны ломать основное действие.
 */
async function checkAchievements(userId, { silent = false } = {}) {
  try {
    const metrics = await loadMetrics(userId);
    if (!metrics) return [];
    const have = await pool.query('SELECT code FROM user_achievements WHERE user_id = $1', [userId]);
    const owned = new Set(have.rows.map((r) => r.code));

    const unlocked = [];
    for (const def of DEFINITIONS) {
      if (owned.has(def.code) || (metrics[def.metric] || 0) < def.target) continue;
      const inserted = await pool.query(
        'INSERT INTO user_achievements (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code',
        [userId, def.code]
      );
      if (inserted.rows.length) {
        unlocked.push(def);
        await addCoins(pool, userId, ACHIEVEMENT_REWARDS[def.tier] || 0);
      }
    }

    if (!silent) {
      for (const def of unlocked) {
        // Запись в «Уведомлениях» + всплывашка по сокету (без дублирующего notification:new).
        await pool.query(
          "INSERT INTO notifications (user_to, user_from, type, content) VALUES ($1, 'SSS', 'achievement', $2)",
          [metrics.username, `${def.title} (+${ACHIEVEMENT_REWARDS[def.tier] || 0} монет)`]
        );
        await emitToUsername(metrics.username, 'achievement:unlocked', {
          code: def.code, title: def.title, description: def.description, icon: def.icon, tier: def.tier,
          reward: ACHIEVEMENT_REWARDS[def.tier] || 0,
        });
      }
      if (unlocked.length) await pushCounters(metrics.username);
    }
    return unlocked;
  } catch (err) {
    console.error('Ошибка проверки достижений:', err.message);
    return [];
  }
}

const checkByUsername = async (username, opts) => {
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (rows[0]) return await checkAchievements(rows[0].id, opts);
  } catch (err) {
    console.error('Ошибка проверки достижений:', err.message);
  }
  return [];
};

// Список для профиля: прогресс по каждому достижению.
async function getAchievements(userId) {
  await checkAchievements(userId, { silent: true }); // синхронизируем старые аккаунты
  const metrics = (await loadMetrics(userId)) || {};
  const { rows } = await pool.query('SELECT code, unlocked_at FROM user_achievements WHERE user_id = $1', [userId]);
  const unlockedAt = new Map(rows.map((r) => [r.code, r.unlocked_at]));
  const items = DEFINITIONS.map((def) => {
    const unlocked = unlockedAt.has(def.code);
    return {
      code: def.code, title: def.title, description: def.description, icon: def.icon, tier: def.tier,
      target: def.target,
      reward: ACHIEVEMENT_REWARDS[def.tier] || 0,
      progress: unlocked ? def.target : Math.min(metrics[def.metric] || 0, def.target),
      unlocked,
      unlocked_at: unlockedAt.get(def.code) || null,
    };
  });
  return { items, unlocked: items.filter((i) => i.unlocked).length, total: items.length };
}

module.exports = { DEFINITIONS, BY_KEY, checkAchievements, checkByUsername, getAchievements };
