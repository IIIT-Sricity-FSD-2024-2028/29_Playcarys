/**
 * Presentation helpers for the users feature.
 *
 * The backend returns { user_id, user_name, role_id, role_name, ... } and the slice
 * keeps that shape (plus a string `id`). The admin / superuser user-management
 * components were written against { id, username, role, ... }, so the mapping lives
 * here, in one place, instead of being re-implemented per page.
 */

export const ROLE_IDS = Object.freeze({
  superuser: 1,
  admin: 2,
  moderator: 3,
  player: 4,
  publisher: 5
});

const ROLE_NAMES = Object.freeze({
  1: 'superuser',
  2: 'admin',
  3: 'moderator',
  4: 'player',
  5: 'publisher'
});

export function roleNameFromId(roleId) {
  return ROLE_NAMES[Number(roleId)] || 'player';
}

export function roleIdFromName(role) {
  return ROLE_IDS[String(role || '').toLowerCase()];
}

export function avatarFor(username) {
  return String(username || '').slice(0, 2).toUpperCase();
}

/** Backend/slice user -> the shape the user-management components render. */
export function toUiUser(u) {
  if (!u) return u;
  const username = u.username || u.user_name || '';
  const role = String(u.role || u.role_name || roleNameFromId(u.role_id)).toLowerCase();
  const id = u.id != null ? String(u.id) : String(u.user_id);
  return {
    ...u,
    id,
    user_id: u.user_id != null ? u.user_id : (/^\d+$/.test(id) ? Number(id) : id),
    username,
    user_name: u.user_name || username,
    role,
    role_id: u.role_id != null ? u.role_id : roleIdFromName(role),
    email: u.email || '',
    status: String(u.status || 'active').toLowerCase(),
    avatar: u.avatar || avatarFor(username) || '??'
  };
}

/** Form values -> POST /users body. */
export function toCreateUserDto({ username, email, role, password }) {
  return {
    user_name: username,
    role_id: roleIdFromName(role) || ROLE_IDS.player,
    email,
    password,
    avatar: avatarFor(username)
  };
}

/** Form values -> PATCH /users/:id body (role is optional). */
export function toUpdateUserDto({ username, email, role }) {
  const roleId = role ? roleIdFromName(role) : undefined;
  return {
    user_name: username,
    email,
    avatar: avatarFor(username),
    ...(roleId ? { role_id: roleId } : {})
  };
}
