// Admin data service.
//
// Holds the data logic the old admin pages used (data/db.js + js/utils.js), copied
// so the React admin pages read and write exactly what the old pages did.
//
// NOTE ON `DB`: data/db.js declares `const DB = {...}` at the top level of a classic
// script. That puts DB in the shared global scope but NOT on `window`, so
// `window.DB` is undefined. Reading the bare name `DB` works.
import authService from './authService';

export function getDB() {
  return typeof DB !== 'undefined' ? DB : null;
}

// db.js builds DB while it loads. The page injects that script dynamically, so the
// React app can start before it has finished — wait for it instead of crashing.
export function waitForDb() {
  return new Promise((resolve) => {
    let tries = 0;
    function check() {
      const db = getDB();
      if (db && db.settings && Array.isArray(db.users)) {
        resolve(true);
        return;
      }
      tries++;
      if (tries > 200) {
        resolve(false);
        return;
      }
      setTimeout(check, 50);
    }
    check();
  });
}

// db.js sends the signed admin token with every DB.save() only if a global `Auth`
// exists (the old utils.js provides it). React does not load utils.js, so give
// db.js the two things it asks for. Without this, the backend rejects admin writes.
export function installAuthShim() {
  if (typeof Auth !== 'undefined') return;
  window.Auth = {
    getSession() {
      return authService.getSession();
    },
    apiAuthHeaders() {
      const token = authService.getApiToken();
      return token ? { Authorization: 'Bearer ' + token } : {};
    }
  };
}

// ── Settings (old settings.html) ─────────────────────────────────
export const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  registrationOpen: true,
  twoFactorAuth: true,
  sessionTimeout: 30,
  strongPasswords: true,
  emailNotifications: true,
  reportNotifications: true,
  approvalNotifications: true
};

export function getSettings() {
  return getDB().settings;
}

// A toggle flips one setting and saves straight away.
export function updateSetting(key, value) {
  const db = getDB();
  db.settings[key] = value;
  db.save();
}

// Save button. Only a superuser may rename the platform; the disabled input is a
// convenience, so the save path checks the role again.
export function saveSettings(platformName, sessionTimeout, isSuperuser) {
  const db = getDB();
  if (isSuperuser) {
    db.settings.platformName = platformName.trim();
  }
  db.settings.sessionTimeout = parseInt(sessionTimeout);
  db.save();
}

export function resetSettings(isSuperuser) {
  const db = getDB();
  Object.assign(
    db.settings,
    isSuperuser ? { platformName: 'PlayCarys' } : {},
    DEFAULT_SETTINGS
  );
  db.save();
}

// ── Shared helpers copied from js/utils.js and data/db.js ────────

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Ids can be a number on one side and a string on the other.
export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function getSession() {
  return authService.getSession();
}

// The numbers shown on the dashboard, users page and hub (getPlatformStats in db.js).
export function getPlatformStats() {
  const db = getDB();
  return {
    totalUsers: db.users.length,
    players: db.users.filter((u) => u.role === 'player').length,
    publishers: db.users.filter((u) => u.role === 'publisher').length,
    moderators: db.users.filter((u) => u.role === 'moderator').length,
    superusers: db.users.filter((u) => u.role === 'superuser').length,
    admins: db.users.filter((u) => u.role === 'admin').length,
    totalGames: db.games.length,
    approvedGames: db.games.filter((g) => g.game_approval_status === 'approved').length,
    pendingGames: db.games.filter((g) => g.game_approval_status === 'pending').length,
    activeGames: db.games.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled').length,
    activeSessions: (db.matches || []).filter((m) => m.status === 'in-progress').length,
    pendingReports: db.reports.filter((r) => r.status === 'pending').length,
    reviewReports: db.reports.filter((r) => r.status === 'under-review').length,
    activeBans: db.bans.filter((b) => b.active).length,
    upcomingTournaments: db.tournaments.filter((t) => t.status === 'upcoming').length
  };
}

// Send one message to every user with a role, as separate private notifications.
export function dispatchRoleNotification(targetRole, fromSessionRole, fromSessionName, msg) {
  const db = getDB();
  const session = getSession();
  const senderId = session ? session.userId : null;
  const users = db.users.filter((u) => u.role === targetRole);
  users.forEach((u, i) => {
    db.notifications.push({
      id: Date.now() + i + Math.floor(Math.random() * 1000),
      type: 'system',
      toRole: null,
      toUser: u.user_id != null ? u.user_id : u.id,
      from: fromSessionName,
      avatar: '⚙️',
      fromRole: fromSessionRole,
      fromUserId: senderId,
      msg: msg,
      time: 'just now',
      read: false,
      replies: []
    });
  });
  db.save();
}

// Send a notification to one user, found by username. Skips an identical unread one.
export function dispatchUserNotification(targetUsername, fromSessionRole, fromSessionName, msg) {
  const db = getDB();
  const u = db.users.find((usr) => (usr.username || usr.user_name) === targetUsername);
  if (!u) return;
  const uid = u.user_id != null ? u.user_id : u.id;
  const session = getSession();
  const senderId = session ? session.userId : null;

  const alreadyExists = (db.notifications || []).some(
    (n) => !n.read && sameId(n.toUser, uid) && n.msg === msg
  );
  if (alreadyExists) return;

  db.notifications.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'system',
    toRole: null,
    toUser: uid,
    from: fromSessionName,
    avatar: '⚙️',
    fromRole: fromSessionRole,
    fromUserId: senderId,
    msg: msg,
    time: 'just now',
    read: false,
    replies: []
  });
  db.save();
}

// ── Dashboard actions (old dashboard.html) ───────────────────────

export function getSuperusers() {
  return getDB().users.filter((u) => u.role_id === 1 || (u.role && u.role === 'superuser'));
}

export function getModerators() {
  return getDB().users.filter((u) => u.role_id === 3 || (u.role && u.role === 'moderator'));
}

// Private message from an admin to one super admin.
export function sendAdminEscalation(session, target, msg) {
  const db = getDB();
  db.notifications.push({
    id: Date.now(),
    toRole: null,
    toUser: target.user_id,
    from: session.username,
    avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
    fromRole: 'admin',
    fromUserId: session.userId,
    msg: '[Admin Escalation] ' + msg.trim(),
    time: 'just now',
    read: false,
    replies: []
  });
  db.save();
}

// One private message to every moderator.
export function sendModeratorBroadcast(session, moderators, msg) {
  const db = getDB();
  const ts = Date.now();
  moderators.forEach((mod, i) => {
    db.notifications.push({
      id: ts + i,
      toRole: null,
      toUser: mod.user_id,
      from: session.username,
      avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
      fromRole: 'admin',
      fromUserId: session.userId,
      msg: '[Admin Broadcast] ' + msg.trim(),
      time: 'just now',
      read: false,
      replies: []
    });
  });
  db.save();
}
