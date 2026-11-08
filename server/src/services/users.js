// Общие SQL-фрагменты и выборка пользователя вместе с кланом.

// Админ всегда считается Premium; остальным нужна неистёкшая подписка.
// Поля нужны везде, где рисуется ник: переливающийся стиль и выбранный цвет.
const nickColumns = (a = 'u') =>
  `(${a}.is_admin OR (${a}.premium_until IS NOT NULL AND ${a}.premium_until > NOW())) AS is_premium, ${a}.nick_color`;

const USER_COLUMNS = `
  u.id, u.username, u.handle, u.bio, u.followers, u.following,
  u.is_verified, u.created_at, u.avatar_version, u.premium_until, ${nickColumns('u')},
  c.id AS clan_id, c.name AS clan_name, CASE WHEN u.hide_clan_tag THEN NULL ELSE c.tag END AS clan_tag, u.hide_clan_tag, c.avatar_version AS clan_avatar_version,
  cm.role AS clan_role`;

const USER_JOINS = `
  FROM users u
  LEFT JOIN clan_members cm ON cm.user_id = u.id
  LEFT JOIN clans c ON c.id = cm.clan_id`;

// withEmail = «это данные самого пользователя»: добавляем приватные поля.
async function fetchUser(db, field, value, { withEmail = false } = {}) {
  if (field !== 'id' && field !== 'username') throw new Error('Недопустимое поле');
  const own = withEmail ? ', u.email, u.is_admin, u.premium_trial_used, u.coins, c.tag AS clan_tag_real' : '';
  const { rows } = await db.query(`SELECT ${USER_COLUMNS}${own} ${USER_JOINS} WHERE u.${field} = $1`, [value]);
  return rows[0] || null;
}

async function isPremiumUser(db, userId) {
  const { rows } = await db.query(
    'SELECT (is_admin OR (premium_until IS NOT NULL AND premium_until > NOW())) AS ok FROM users WHERE id = $1',
    [userId]
  );
  return Boolean(rows[0]?.ok);
}

module.exports = { nickColumns, fetchUser, isPremiumUser };
