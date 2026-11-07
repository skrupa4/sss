// Общие SQL-фрагменты и выборка пользователя вместе с кланом.
const USER_COLUMNS = `
  u.id, u.username, u.handle, u.bio, u.rating, u.followers, u.following,
  u.is_verified, u.is_premium, u.created_at, u.avatar_version,
  c.id AS clan_id, c.name AS clan_name, c.tag AS clan_tag, cm.role AS clan_role`;

const USER_JOINS = `
  FROM users u
  LEFT JOIN clan_members cm ON cm.user_id = u.id
  LEFT JOIN clans c ON c.id = cm.clan_id`;

async function fetchUser(db, field, value, { withEmail = false } = {}) {
  if (field !== 'id' && field !== 'username') throw new Error('Недопустимое поле');
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS}${withEmail ? ', u.email' : ''} ${USER_JOINS} WHERE u.${field} = $1`,
    [value]
  );
  return rows[0] || null;
}

module.exports = { fetchUser };
