// User management data operations, copied from the old pages/admin/users.html.
// Each function changes DB the same way the old page did; the page then calls refresh().
import { getDB, getSession, dispatchUserNotification } from './adminService';

const ROLE_ID = { player: 4, publisher: 5, moderator: 3, admin: 2, superuser: 1 };

// Search box: keep users whose username or email contains the text.
function filterList(items, query, fields) {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) => fields.some((f) => String(item[f] || '').toLowerCase().includes(q)));
}

// The list on the page: search + role + status filters, without yourself.
export function listUsers(query, role, status) {
  const me = getSession();
  let users = filterList(getDB().users, query, ['username', 'email']);
  users = users.filter((u) => u.id !== (me ? me.userId : undefined));
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);
  return users;
}

export function findUserById(id) {
  return getDB().users.find((u) => u.id === id);
}

export function isUsernameTaken(username, editId) {
  return !!getDB().users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== editId);
}

export function isEmailTaken(email, editId) {
  return !!getDB().users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== editId);
}

export function updateUser(id, username, email, role, status) {
  const db = getDB();
  const u = findUserById(id);
  u.user_name = username;
  u.email = email;
  if (role) u.role_id = ROLE_ID[role] || u.role_id;
  u.status = status;
  u.avatar = username.slice(0, 2).toUpperCase();
  db.save();
}

export function createUser(username, email, role, status, password) {
  const db = getDB();
  const numId = Date.now();
  db.users.push({
    user_id: numId,
    user_name: username,
    role_id: ROLE_ID[role] || 4,
    email: email,
    status: status,
    password: password,
    avatar: username.slice(0, 2).toUpperCase(),
    joinDate: new Date().toISOString().slice(0, 10),
    lastSeen: new Date().toISOString().slice(0, 10)
  });

  if (role === 'player') {
    if (!db.player_profiles) db.player_profiles = [];
    db.player_profiles.push({ user_id: numId, player_name: username, carys_points: 100, play_time: 0, matches_won: 0, player_status: true });
  } else if (role === 'publisher') {
    if (!db.publisher_profiles) db.publisher_profiles = [];
    db.publisher_profiles.push({ user_id: numId, total_games: 0, approved_games: 0, active_games: 0 });
  }
  db.save();
}

export function suspendUser(u, days, reason) {
  const s = getSession();
  u.status = 'suspended';
  u.suspendUntil = new Date(Date.now() + days * 86400000).toISOString();
  dispatchUserNotification(u.username, s.role, s.username, `You have been suspended for ${days} days. Reason: ${reason}`);
  getDB().save();
}

export function revokeSuspension(u, reason) {
  const s = getSession();
  u.status = 'active';
  delete u.suspendUntil;
  dispatchUserNotification(u.username, s.role, s.username, `Your suspension has been revoked. Note: ${reason}`);
  getDB().save();
}

export function banUser(u, reason) {
  const s = getSession();
  u.status = 'banned';
  dispatchUserNotification(u.username, s.role, s.username, `You have been permanently banned. Reason: ${reason}`);
  getDB().save();
}

// Deleting an account means two things: remove the row, and add the id to the `deleted_users` list.
// Without the list the server keeps the account and the next sync brings it back (the old page had
// this bug: "Ban + Delete" only banned). The server removes the account and its leftovers from the list.
export function removeUserForGood(u) {
  const db = getDB();
  if (!Array.isArray(db.deleted_users)) db.deleted_users = [];
  const id = u.user_id != null ? u.user_id : u.id;
  if (!db.deleted_users.some((d) => String(d && typeof d === 'object' ? (d.user_id != null ? d.user_id : d.id) : d) === String(id))) {
    db.deleted_users.push({ user_id: id, deleted_at: new Date().toISOString() });
  }
  const idx = db.users.findIndex((user) => user.id === u.id);
  if (idx !== -1) db.users.splice(idx, 1);
}

export function banAndDeleteUser(u, reason) {
  const db = getDB();
  const s = getSession();
  u.status = 'banned';
  dispatchUserNotification(u.username, s.role, s.username, `You have been permanently banned and deleted. Reason: ${reason}`);
  db.save();
  removeUserForGood(u);
  db.save();
}

// The old page forgot to save here, so an unban was lost when the page reloaded.
export function unbanUser(u) {
  u.status = 'active';
  getDB().save();
}
