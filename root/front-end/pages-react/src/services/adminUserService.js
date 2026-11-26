// Admin user-management helpers.
//
// The user records themselves now live in the Redux `users` slice and every change is
// a real API call (see features/users/useUsers.js). What stays here:
//   - pure list helpers (filtering, uniqueness checks, counts) over the slice's users
//   - the notification + audit side effects the old page wrote into the legacy DB.
//     Those two belong to the notifications / audit features and move with them; they run
//     only AFTER the server has accepted the change.
import { getDB, getSession, dispatchUserNotification } from './adminService';
import { recordAudit } from './adminAuditService';

// ── Pure helpers over slice users (the { id, username, role, ... } UI shape) ──

function matches(item, query, fields) {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return fields.some((f) => String(item[f] || '').toLowerCase().includes(q));
}

// The list on the page: search + role + status filters, without yourself.
export function filterUsers(users, meId, query, role, status) {
  return users.filter(
    (u) =>
      matches(u, query, ['username', 'email']) &&
      (meId == null || String(u.id) !== String(meId)) &&
      (!role || u.role === role) &&
      (!status || u.status === status)
  );
}

export function isUsernameTaken(users, username, editId) {
  const target = username.toLowerCase();
  return users.some((u) => u.username.toLowerCase() === target && String(u.id) !== String(editId));
}

// The server allows one address per role (a player and a studio account may share one),
// so the pre-check uses the same rule instead of rejecting every repeated address.
export function isEmailTakenForRole(users, email, role, editId) {
  const target = email.toLowerCase();
  return users.some(
    (u) => u.email.toLowerCase() === target && u.role === role && String(u.id) !== String(editId)
  );
}

export function countUsers(users) {
  const byRole = (role) => users.filter((u) => u.role === role).length;
  return {
    totalUsers: users.length,
    players: byRole('player'),
    publishers: byRole('publisher'),
    moderators: byRole('moderator')
  };
}

// ── Side effects (legacy DB: notifications + audit) ──

function notify(u, message) {
  const s = getSession();
  dispatchUserNotification(u.username, s.role, s.username, message);
  const db = getDB();
  if (db && typeof db.save === 'function') db.save();
}

export function recordUserEdited(username, role, status) {
  recordAudit('user', `User ${username} edited`, `Role: ${role}, Status: ${status}`);
}

export function recordUserCreated(username, role, status) {
  recordAudit('user', `New user added: ${username}`, `Role: ${role}, Status: ${status}`);
}

export function recordSuspended(u, days, reason) {
  notify(u, `You have been suspended for ${days} days. Reason: ${reason}`);
  recordAudit('ban', `${u.username} suspended for ${days} days`, `Reason: ${reason}`);
}

export function recordSuspensionRevoked(u, reason) {
  notify(u, `Your suspension has been revoked. Note: ${reason}`);
  recordAudit('ban', `Suspension revoked for ${u.username}`, `Note: ${reason}`);
}

export function recordBanned(u, reason) {
  notify(u, `You have been permanently banned. Reason: ${reason}`);
  recordAudit('ban', `${u.username} banned permanently`, `Reason: ${reason}`);
}

export function recordBannedAndDeleted(u, reason) {
  notify(u, `You have been permanently banned and deleted. Reason: ${reason}`);
  recordAudit('ban', `${u.username} banned and deleted`, `Reason: ${reason}`);
}

export function recordUnbanned(u) {
  recordAudit('ban', `${u.username} unbanned`, 'Ban lifted by an admin');
}

// Still used by adminHubService (legacy cache removal). Deleting an account means two things:
// remove the row, and add the id to the `deleted_users` list, otherwise the server keeps the
// account and the next sync brings it back. Goes away when the Hub moves to the users slice.
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
