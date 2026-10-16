// Control Hub data operations, copied from the old pages/admin/hub.html.
// Each function changes DB the same way the old page did; the section then calls refresh().
import { getDB, getSession, capitalize, dispatchRoleNotification } from './adminService';
import { removeUserForGood } from './adminUserService';

// ── Audit log ────────────────────────────────────────────────────
// The old page kept this list in memory only (it starts over on every page load).
export const INITIAL_AUDIT_LOG = [
  { type: 'user', msg: 'SuperAdmin logged in', detail: 'IP: 192.168.1.1', time: 'just now', actor: 'SuperAdmin' },
  { type: 'game', msg: 'Fantasy Quest approved for publication', detail: 'Submitted by IndieDevStudios', time: '5m ago', actor: 'SystemAdmin' },
  { type: 'ban', msg: 'ToxicPlayer banned for 7 days', detail: 'Reason: Toxic behavior', time: '2h ago', actor: 'ModeratorOne' },
  { type: 'tournament', msg: 'Racing Thunder Grand Prix started', detail: '24 participants registered', time: '6h ago', actor: 'System' },
  { type: 'user', msg: 'New publisher registered: IndieDevStudios', detail: 'Email: hello@indiedev.com', time: '1d ago', actor: 'System' },
  { type: 'system', msg: 'Platform settings updated', detail: 'Maintenance mode toggled off', time: '2d ago', actor: 'SuperAdmin' },
  { type: 'game', msg: 'Space Warriors enabled on platform', detail: 'Publisher: EpicGamesStudio', time: '3d ago', actor: 'SystemAdmin' },
  { type: 'user', msg: 'ModeratorTwo account created', detail: 'Role: Moderator', time: '5d ago', actor: 'SuperAdmin' },
  { type: 'system', msg: 'Session timeout changed to 30 minutes', detail: 'Previous: 60 minutes', time: '7d ago', actor: 'SuperAdmin' },
  { type: 'tournament', msg: 'Puzzle Masters Open completed', detail: 'Winner: ShadowMaster', time: '1w ago', actor: 'System' }
];

// Add an entry to the audit list, to the platform activity feed, and tell the superusers.
export function addAuditEntry(auditLog, type, msg, detail) {
  const session = getSession();
  const db = getDB();
  auditLog.unshift({ type: type, msg: msg, detail: detail, time: 'just now', actor: session.username });
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.unshift({ type: type, msg: msg, time: 'just now' });
  if (session.role !== 'superuser') {
    dispatchRoleNotification('superuser', session.role, session.username, `Audit Action: ${msg} (${detail})`);
  }
}

// ── Users ────────────────────────────────────────────────────────
const ROLE_ID = { player: 4, publisher: 5, moderator: 3, admin: 2, superuser: 1 };

// The hub only manages players, publishers and moderators.
export function listHubUsers(query, role, status) {
  const q = query.toLowerCase();
  let users = [...getDB().users];
  if (q) users = users.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  users = users.filter((u) => ['player', 'publisher', 'moderator'].includes(u.role));
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);
  return users;
}

export function findUser(id) {
  return getDB().users.find((u) => u.id === id);
}

export function isUsernameTaken(username, editId) {
  return !!getDB().users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== editId);
}

export function isEmailTaken(email, editId) {
  return !!getDB().users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== editId);
}

export function saveHubUser(isEdit, id, username, email, role, status, password, addAudit) {
  const db = getDB();
  if (isEdit) {
    const u = findUser(id);
    u.user_name = username;
    u.email = email;
    if (role) u.role_id = ROLE_ID[role] || u.role_id;
    u.status = status;
    u.avatar = username.slice(0, 2).toUpperCase();
    addAudit('user', `User ${username} edited`, `Role: ${role}, Status: ${status}`);
  } else {
    db.users.push({
      user_id: Date.now(),
      user_name: username,
      role_id: ROLE_ID[role] || 4,
      email: email,
      status: status,
      password: password,
      avatar: username.slice(0, 2).toUpperCase(),
      joinDate: new Date().toISOString().slice(0, 10),
      lastSeen: new Date().toISOString().slice(0, 10)
    });
    addAudit('user', `New user added: ${username}`, `Role: ${role}`);
  }
  db.save();
}

export function deleteHubUser(u, addAudit) {
  const db = getDB();
  removeUserForGood(u); // also records the deletion, so the server really removes the account
  addAudit('user', `User deleted: ${u.username}`, `By ${getSession().username}`);
  db.save();
}

// ── Games ────────────────────────────────────────────────────────
export function listHubGames(statusFilter) {
  let games = [...getDB().games];
  if (statusFilter) games = games.filter((g) => g.status === statusFilter);
  return games;
}

export function toggleGameEnabled(g, addAudit) {
  g.enabled = !g.enabled;
  addAudit('game', `${g.title} ${g.enabled ? 'enabled' : 'blacklisted'}`, `By ${getSession().username}`);
  getDB().save();
}

export function deleteGame(g, addAudit) {
  const db = getDB();
  db.deleteGame(g.id); // removes the game and records it, so the sync cannot bring it back
  addAudit('game', `Game deleted: ${g.title}`, `By ${getSession().username}`);
  db.save();
}

// ── Tournaments ──────────────────────────────────────────────────
export function tournamentCounts() {
  const t = getDB().tournaments;
  return {
    active: t.filter((x) => x.status === 'in-progress').length,
    upcoming: t.filter((x) => x.status === 'upcoming').length,
    done: t.filter((x) => x.status === 'completed').length,
    players: t.reduce((a, x) => a + x.participants, 0)
  };
}

export function createTournament(name, desc, gameId, maxParticipants, startDate, prize, addAudit) {
  const db = getDB();
  const session = getSession();
  const game = db.games.find((g) => g.id === gameId);
  const regClose = new Date(startDate);
  regClose.setDate(regClose.getDate() - 2);
  // Tournament ids are plain numbers (the next one after the highest), like the Publisher flow.
  const newId = db.tournaments.length
    ? Math.max(...db.tournaments.map((t) => parseInt(t.tournament_id || t.id, 10) || 0)) + 1
    : 1;
  db.tournaments.push({
    id: newId,
    name: name.trim(),
    desc: desc.trim(),
    game: game ? game.title : 'Unknown',
    gameId: gameId,
    participants: 0,
    maxParticipants: parseInt(maxParticipants),
    status: 'upcoming',
    startDate: startDate,
    regClose: regClose.toISOString().slice(0, 10),
    prize: prize || 'N/A',
    organizer: session.userId || 'u1',
    registeredPlayers: []
  });
  addAudit('tournament', `Tournament created: ${name}`, `By ${session.username}`);
  db.save();
}

export function findTournament(id) {
  return getDB().tournaments.find((t) => t.id === id);
}

export function setTournamentStatus(t, status, label, addAudit) {
  t.status = status;
  addAudit('tournament', `${t.name} ${label}`, `By ${getSession().username}`);
  getDB().save();
}

export function deleteTournament(t, addAudit) {
  const db = getDB();
  db.tournaments.splice(db.tournaments.findIndex((x) => x.id === t.id), 1);
  addAudit('tournament', `Tournament deleted: ${t.name}`, `By ${getSession().username}`);
  db.save();
}

// ── Platform controls (System Control section) ───────────────────
export function setSystemSetting(key, value) {
  const db = getDB();
  db.settings[key] = value;
  db.save();
}

// "Quick Export": download a CSV of users, games, reports or the audit log.
export function exportData(type, auditLog, addAudit) {
  const db = getDB();
  const exports = {
    users: db.users.map((u) => `${u.username},${u.email},${u.role},${u.status}`).join('\n'),
    games: db.games.map((g) => `${g.title},${g.publisher},${g.genre},${g.status}`).join('\n'),
    // Read the real fields, not the id / reporterName / reportedName helpers: rows that came back from the
    // server carry `_rGetters: true` without the helpers, so those read as undefined (old page has this too).
    reports: db.reports.map((r) => {
      const nameOf = (uid) => {
        const u = db.users.find((x) => String(x.user_id) === String(uid));
        return u ? (u.user_name || u.username) : 'Unknown';
      };
      return `${r.report_id},${nameOf(r.reported_by)},${nameOf(r.reported_user)},${r.type},${r.status}`;
    }).join('\n'),
    audit: auditLog.map((e) => `${e.time},${e.type},${e.msg},${e.actor}`).join('\n')
  };
  const blob = new Blob([exports[type] || ''], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `playcarys_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  addAudit('system', `Data exported: ${type}`, `By ${getSession().username}`);
  return capitalize(type);
}

// The four buttons of the Danger Zone: what to ask, and what to do when confirmed.
// ctx = { addAudit, toast }
export function getDangerAction(action) {
  const db = getDB();
  const by = () => `By ${getSession().username}`;

  // Ending a match does not delete it: matches are the permanent record that somebody played.
  const endLiveMatches = (ctx, warnFirst) => {
    const live = (db.matches || []).filter((m) => m.status === 'in-progress');
    live.forEach((m) => db.endMatch(m.match_id));
    if (warnFirst) ctx.toast.warning(`${live.length} match(es) ended`);
    ctx.addAudit('system', `${live.length} live match(es) ended`, by());
    db.save();
    if (!warnFirst) ctx.toast.warning(`${live.length} match(es) ended`);
  };

  const actions = {
    'purge-sessions': {
      title: 'End All Live Matches',
      msg: 'This will immediately end every match in progress. Players will be returned to the catalogue. Match history is kept.',
      run: (ctx) => endLiveMatches(ctx, false)
    },
    'reset-bans': {
      title: 'Lift All Bans',
      msg: 'This will remove ALL active player bans and restore access to banned users.',
      run: (ctx) => {
        db.bans.forEach((b) => { b.active = false; });
        db.users.filter((u) => u.status === 'banned').forEach((u) => { u.status = 'active'; });
        ctx.addAudit('system', 'All bans lifted', by());
        db.save();
        ctx.toast.success('All bans lifted');
      }
    },
    'clear-reports': {
      title: 'Archive All Reports',
      msg: 'This will mark ALL pending reports as resolved.',
      run: (ctx) => {
        db.reports.forEach((r) => { r.status = 'resolved'; });
        ctx.addAudit('system', 'All reports archived', by());
        db.save();
        ctx.toast.info('All reports archived');
      }
    },
    'reset-platform': {
      title: 'End All Live Matches',
      msg: '⚠️ This ends every match currently in progress. Match history is NOT deleted.',
      run: (ctx) => endLiveMatches(ctx, true)
    }
  };
  return actions[action];
}
