// Notifications and staff messages for the ☰ drawer, copied from the old js/utils.js
// (injectSideDrawer, sendNotifReply, markNotifRead, markAllNotifRead) and the
// addressing helpers in data/db.js.
//
// A notification is either DIRECT (toUser set: a private row) or a BROADCAST (toRole set, no
// toUser: ONE row shared by the whole role). Read / cleared state on a broadcast is kept
// per user (readBy / clearedBy), so one admin pressing "✓ Read" does not hide it from the others.
import { getDB, sameId } from './adminService';
import api from './api';

// ── Addressing helpers (data/db.js) ──────────────────────────────
export function isBroadcastNotif(n) {
  return (n.toUser === null || n.toUser === undefined) && n.toRole != null;
}

function notifIsForUser(n, uid, role) {
  return (n.toUser !== null && n.toUser !== undefined)
    ? sameId(n.toUser, uid)
    : n.toRole === role;
}

export function notifIsRead(n, uid) {
  if (!isBroadcastNotif(n)) return !!n.read;
  return !!n.read || (n.readBy || []).some((x) => sameId(x, uid));
}

function notifIsCleared(n, uid) {
  if (!isBroadcastNotif(n)) return !!n.cleared;
  return (n.clearedBy || []).some((x) => sameId(x, uid));
}

// Visible to this user = addressed to them and not cleared by them.
export function notifIsVisible(n, uid, role) {
  return notifIsForUser(n, uid, role) && !notifIsCleared(n, uid);
}

export function setNotifRead(n, uid) {
  if (!isBroadcastNotif(n)) {
    n.read = true;
    return;
  }
  if (!Array.isArray(n.readBy)) n.readBy = [];
  if (uid != null && !n.readBy.some((x) => sameId(x, uid))) n.readBy.push(String(uid));
}

// ── The drawer's notification list ───────────────────────────────
export function visibleNotifications(userId, role) {
  return (getDB().notifications || []).filter((n) => notifIsVisible(n, userId, role));
}

export function unreadNotifications(userId, role) {
  return visibleNotifications(userId, role).filter((n) => !notifIsRead(n, userId));
}

export function findNotification(id) {
  return (getDB().notifications || []).find((n) => n.id === id);
}

export function markNotificationRead(n, userId) {
  if (n) setNotifRead(n, userId);
  getDB().save();
}

export function markAllRead(userId, role) {
  visibleNotifications(userId, role).forEach((n) => setNotifRead(n, userId));
  getDB().save();
}

// Who may be answered: never a shared broadcast row, and some roles only reach some roles.
export function canReplyTo(n, role) {
  if (isBroadcastNotif(n)) return false;
  if (role === 'player' && n.fromRole !== 'player') return false;
  if (role === 'publisher' && n.fromRole !== 'admin') return false;
  if (role === 'moderator' && n.fromRole === 'publisher') return false;
  return true;
}

export function readOnlyText(n) {
  return isBroadcastNotif(n)
    ? '📢 Announcement to all ' + n.toRole + 's — read-only.'
    : '🔒 Read-only. You cannot reply to ' + n.fromRole + 's.';
}

// Answer a notification. Returns an error message, or '' when it was sent.
export function sendReply(n, rawText, session) {
  const text = rawText.trim();
  if (!n || !text) return 'empty';

  const senderRole = session.role;
  const targetRole = n.fromRole;
  if (senderRole === 'player' && targetRole !== 'player') return 'Players can only reply to other players.';
  if (senderRole === 'publisher' && targetRole !== 'admin') return 'Publishers can only reply to admins.';
  if (senderRole === 'moderator' && targetRole === 'publisher') {
    return 'Moderators cannot reply to publishers.';
  }
  // Never write a reply into a shared broadcast row: the whole role would read it.
  if (isBroadcastNotif(n)) {
    return 'This is an announcement to all ' + n.toRole + 's. Use a direct message to reply.';
  }

  const db = getDB();
  if (!Array.isArray(n.replies)) n.replies = [];
  n.replies.push(session.username + ': ' + text);
  setNotifRead(n, session.userId);

  // A reply also goes back to the original sender as a notification of their own.
  if (n.fromUserId != null && !sameId(n.fromUserId, session.userId)) {
    db.notifications.push({
      id: Date.now(),
      toRole: null,
      toUser: n.fromUserId,
      from: session.username,
      avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
      fromRole: session.role,
      fromUserId: session.userId,
      msg: '↩ ' + text,
      time: 'just now',
      read: false,
      replies: []
    });
  }
  db.save();
  return '';
}

// ── Staff messages ───────────────────────────────────────────────
// The people this role may contact, grouped by role. The server decides, so what the
// drawer offers and what the API accepts cannot drift apart.
export function fetchDirectory(userId) {
  return api.get('/notifications/directory?viewerId=' + encodeURIComponent(userId));
}

// Everything either of you sent the other, oldest first: a conversation, not two inboxes.
export function threadWith(session, otherId) {
  return (getDB().notifications || [])
    .filter((n) =>
      (sameId(n.fromUserId, session.userId) && sameId(n.toUser, otherId)) ||
      (sameId(n.fromUserId, otherId) && sameId(n.toUser, session.userId)))
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id));
}

export function unreadFrom(session, otherId) {
  return threadWith(session, otherId).filter(
    (n) => sameId(n.fromUserId, otherId) && !notifIsRead(n, session.userId)
  ).length;
}

// Opening a conversation is reading it.
export function openThread(session, otherId) {
  threadWith(session, otherId).forEach((n) => {
    if (sameId(n.fromUserId, otherId)) setNotifRead(n, session.userId);
  });
  getDB().save();
}

export function sendDirectMessage(session, otherId, text) {
  return api.post('/notifications', {
    toUser: Number(otherId),
    fromUserId: Number(session.userId),
    fromRole: session.role,
    from: session.username,
    avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
    msg: text
  });
}

// Messages may carry a little formatting (<b>, <i>, <br>: e.g. "has <b>approved</b> your build").
// Everything else is escaped, so a message cannot inject a script or a link.
export function safeHtml(text) {
  const escaped = String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .replace(/&lt;(\/?)(b|i|u|strong|em)&gt;/gi, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}
