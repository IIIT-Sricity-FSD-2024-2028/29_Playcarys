// Data helpers of the staff inbox, copied from the script in the old pages/staff/inbox.html.
// Reading, marking and sending reuse adminNotifService (the ☰ drawer uses the same functions).
import { visibleNotifications, notifIsRead } from './adminNotifService';

// Everything addressed to this person and not cleared by them, newest first.
export function myNotifications(user) {
  return visibleNotifications(user.userId, user.role).slice().reverse();
}

export function countUnread(rows, user) {
  return rows.filter((n) => !notifIsRead(n, user.userId)).length;
}

// "just now", "5m ago", "3h ago", "2d ago". Text that is not a date ("2h ago") is shown as it is.
export function timeAgo(t) {
  const ms = Date.now() - new Date(t).getTime();
  if (isNaN(ms)) return String(t || '');
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// "As an admin you can message ..." — pick the article instead of hard-coding it.
export function directoryNote(directory) {
  const article = /^[aeiou]/i.test(directory.viewer_role) ? 'an' : 'a';
  return 'As ' + article + ' ' + directory.viewer_role + ' you can message ' + directory.can_contact.join(', ') + '.';
}
