import api from './api.js';

const DB_KEY = 'playcarys_db_store_v5';

export function getDatabase() {
  if (typeof window !== 'undefined' && window.DB && window.DB.games) {
    return window.DB;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DB_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Failed to load DB from localStorage', e);
  }

  return {
    users: [],
    games: [],
    reports: [],
    bans: [],
    moderator_actions: [],
    deleted_games: [],
    tournaments: [],
    matches: []
  };
}

/**
 * Fetches real platform statistics from live backend endpoints.
 * Aggregates users, games, reports, bans, sessions, and tournaments directly from the NestJS server.
 */
export async function fetchPlatformStats() {
  const [usersRes, gamesRes, reportsRes, bansRes, sessionsRes, tournamentsRes] = await Promise.allSettled([
    api.get('/users'),
    api.get('/games'),
    api.get('/reports'),
    api.get('/moderator-actions/bans'),
    api.get('/sessions'),
    api.get('/tournaments')
  ]);

  const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : [];
  const games = gamesRes.status === 'fulfilled' && Array.isArray(gamesRes.value) ? gamesRes.value : [];
  const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value) ? reportsRes.value : [];
  const bans = bansRes.status === 'fulfilled' && Array.isArray(bansRes.value) ? bansRes.value : [];
  const sessions = sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value) ? sessionsRes.value : [];
  const tournaments = tournamentsRes.status === 'fulfilled' && Array.isArray(tournamentsRes.value) ? tournamentsRes.value : [];

  const roleMap = { 1: 'superuser', 2: 'admin', 3: 'moderator', 4: 'player', 5: 'publisher' };
  const getRole = (u) => (u.role || roleMap[u.role_id] || '').toLowerCase();

  const stats = {
    totalUsers: users.length,
    players: users.filter((u) => getRole(u) === 'player').length,
    publishers: users.filter((u) => getRole(u) === 'publisher').length,
    moderators: users.filter((u) => getRole(u) === 'moderator').length,
    superusers: users.filter((u) => getRole(u) === 'superuser').length,
    admins: users.filter((u) => getRole(u) === 'admin').length,
    totalGames: games.length,
    approvedGames: games.filter((g) => (g.game_approval_status || g.status) === 'approved').length,
    pendingGames: games.filter((g) => (g.game_approval_status || g.status) === 'pending').length,
    activeGames: games.filter((g) => ((g.game_approval_status || g.status) === 'approved') && ((g.game_status || g.status) === 'enabled' || g.enabled)).length,
    activeSessions: sessions.filter((s) => s.status === 'in-progress' || s.status === 'active' || s.status === 'waiting').length,
    pendingReports: reports.filter((r) => r.status === 'pending').length,
    reviewReports: reports.filter((r) => r.status === 'under-review').length,
    activeBans: bans.filter((b) => b.active !== false).length,
    upcomingTournaments: tournaments.filter((t) => t.status === 'upcoming').length,
    _raw: { users, games, reports, bans, sessions, tournaments }
  };

  // Cache latest values to local database store for sync consistency
  const db = getDatabase();
  if (users.length) db.users = users;
  if (games.length) db.games = games;
  if (reports.length) db.reports = reports;
  if (bans.length) db.bans = bans;
  if (tournaments.length) db.tournaments = tournaments;
  saveDatabase(db);

  return stats;
}

export function getPlatformStats() {
  if (typeof window !== 'undefined' && typeof window.getPlatformStats === 'function') {
    return window.getPlatformStats();
  }

  const db = getDatabase();
  const users = db.users || [];
  const games = db.games || [];
  const reports = db.reports || [];
  const bans = db.bans || [];
  const tournaments = db.tournaments || [];
  const matches = db.matches || [];

  return {
    totalUsers: users.length,
    players: users.filter(u => u.role === 'player' || u.role_id === 4).length,
    publishers: users.filter(u => u.role === 'publisher' || u.role_id === 5).length,
    moderators: users.filter(u => u.role === 'moderator' || u.role_id === 3).length,
    superusers: users.filter(u => u.role === 'superuser' || u.role_id === 1).length,
    admins: users.filter(u => u.role === 'admin' || u.role_id === 2).length,
    totalGames: games.length,
    approvedGames: games.filter(g => g.game_approval_status === 'approved' || g.status === 'approved').length,
    pendingGames: games.filter(g => g.game_approval_status === 'pending' || g.status === 'pending').length,
    activeGames: games.filter(g => (g.game_approval_status === 'approved' || g.status === 'approved') && (g.game_status === 'enabled' || g.enabled)).length,
    activeSessions: matches.filter(m => m.status === 'in-progress').length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    reviewReports: reports.filter(r => r.status === 'under-review').length,
    activeBans: bans.filter(b => b.active).length,
    upcomingTournaments: tournaments.filter(t => t.status === 'upcoming').length
  };
}

/**
 * Fetches recent live platform activity synthesized from real backend tables.
 */
export async function fetchRecentActivity(limit = 8) {
  const [usersRes, gamesRes, reportsRes, bansRes, actionsRes, tournamentsRes] = await Promise.allSettled([
    api.get('/users'),
    api.get('/games'),
    api.get('/reports'),
    api.get('/moderator-actions/bans'),
    api.get('/moderator-actions'),
    api.get('/tournaments')
  ]);

  const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : [];
  const games = gamesRes.status === 'fulfilled' && Array.isArray(gamesRes.value) ? gamesRes.value : [];
  const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value) ? reportsRes.value : [];
  const bans = bansRes.status === 'fulfilled' && Array.isArray(bansRes.value) ? bansRes.value : [];
  const actions = actionsRes.status === 'fulfilled' && Array.isArray(actionsRes.value) ? actionsRes.value : [];
  const tournaments = tournamentsRes.status === 'fulfilled' && Array.isArray(tournamentsRes.value) ? tournamentsRes.value : [];

  const out = [];
  const push = (date, type, msg) => {
    const t = date ? new Date(date).getTime() : NaN;
    if (!isNaN(t) && msg) out.push({ type, msg, at: t });
  };

  const userName = (id) => {
    const u = users.find((x) => String(x.user_id ?? x.id) === String(id));
    return u ? (u.username || u.user_name || u.name || 'a user') : 'a user';
  };
  const gameName = (id) => {
    const g = games.find((x) => String(x.game_id ?? x.id) === String(id));
    return g ? (g.title || g.game_name || 'a game') : 'a game';
  };

  actions.forEach((a) =>
    push(a.action_date, 'ban', a.action_reason || `${a.action_type} issued`)
  );

  bans.forEach((b) =>
    push(
      b.bannedDate || b.banned_date,
      'ban',
      `${b.playerName || userName(b.playerId || b.player_id)} banned for ${b.duration || 'a period'}` +
        (b.bannedBy ? ` by ${b.bannedBy}` : '')
    )
  );

  reports.forEach((r) =>
    push(r.report_date, 'approval', `${r.type || 'Report'} filed against ${userName(r.reported_user)}`)
  );

  games.forEach((g) =>
    push(g.submittedDate || g.created_at, 'publisher', `${g.title || g.game_name} submitted for review`)
  );

  users.forEach((u) =>
    push(
      u.created_at || u.joinDate,
      'player',
      `${u.username || u.user_name || u.name} joined as ${
        u.role || (u.role_id === 1 ? 'superuser' : u.role_id === 2 ? 'admin' : u.role_id === 3 ? 'moderator' : u.role_id === 5 ? 'publisher' : 'player')
      }`
    )
  );

  tournaments.forEach((t) =>
    push(
      t.start_date,
      'tournament',
      `${t.title || t.tournament_name || t.name} ${t.status === 'upcoming' ? 'scheduled' : 'started'}`
    )
  );

  out.sort((a, b) => b.at - a.at);

  const byType = {};
  out.forEach((e) => (byType[e.type] = byType[e.type] || []).push(e));
  const queues = Object.values(byType);
  const picked = [];
  while (picked.length < limit && queues.some((q) => q.length)) {
    queues.forEach((q) => {
      if (q.length && picked.length < limit) picked.push(q.shift());
    });
  }
  return picked.sort((a, b) => b.at - a.at);
}

export function getRecentActivity(limit = 8) {
  if (typeof window !== 'undefined' && typeof window.getRecentActivity === 'function') {
    return window.getRecentActivity(limit);
  }

  const db = getDatabase();
  const out = [];
  const push = (date, type, msg) => {
    const t = date ? new Date(date).getTime() : NaN;
    if (!isNaN(t) && msg) out.push({ type, msg, at: t });
  };

  const userName = id => {
    const u = (db.users || []).find(x => String(x.user_id ?? x.id) === String(id));
    return u ? (u.username || u.user_name || u.name || 'a user') : 'a user';
  };
  const gameName = id => {
    const g = (db.games || []).find(x => String(x.game_id ?? x.id) === String(id));
    return g ? (g.title || g.game_name) : 'a game';
  };

  (db.moderator_actions || []).forEach(a =>
    push(a.action_date, 'ban', a.action_reason || `${a.action_type} issued`));

  (db.bans || []).forEach(b =>
    push(b.bannedDate, 'ban',
      `${b.playerName || userName(b.playerId)} banned for ${b.duration || 'a period'}` +
      (b.bannedBy ? ` by ${b.bannedBy}` : '')));

  (db.reports || []).forEach(r =>
    push(r.report_date, 'approval',
      `${r.type || 'Report'} filed against ${userName(r.reported_user)}`));

  (db.games || []).forEach(g =>
    push(g.submittedDate, 'publisher',
      `${g.title || g.game_name} submitted for review`));

  (db.deleted_games || []).forEach(g =>
    push(g.deleted_at, 'ban', `${gameName(g.game_id)} removed from the platform`));

  (db.users || []).forEach(u =>
    push(u.created_at || u.joinDate, 'player',
      `${u.username || u.user_name || u.name} joined as ${u.role || (u.role_id === 1 ? 'superuser' : u.role_id === 2 ? 'admin' : u.role_id === 3 ? 'moderator' : u.role_id === 5 ? 'publisher' : 'player')}`));

  (db.tournaments || []).forEach(t =>
    push(t.start_date, 'tournament',
      `${t.title || t.tournament_name || t.name} ${t.status === 'upcoming' ? 'scheduled' : 'started'}`));

  out.sort((a, b) => b.at - a.at);

  const byType = {};
  out.forEach(e => (byType[e.type] = byType[e.type] || []).push(e));
  const queues = Object.values(byType);
  const picked = [];
  while (picked.length < limit && queues.some(q => q.length)) {
    queues.forEach(q => { if (q.length && picked.length < limit) picked.push(q.shift()); });
  }
  return picked.sort((a, b) => b.at - a.at);
}

export function formatActivityTime(ts) {
  if (typeof window !== 'undefined' && typeof window.formatActivityTime === 'function') {
    return window.formatActivityTime(ts);
  }

  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff >= 0 && diff < day / 24) return 'just now';
  if (diff >= 0 && diff < day) return Math.round(diff / (day / 24)) + 'h ago';
  if (diff >= 0 && diff < 7 * day) return Math.round(diff / day) + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatInr(paise) {
  return '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');
}

export async function getPlatformEconomy() {
  return await api.get('/economy/platform');
}

export function saveDatabase(db) {
  if (typeof window !== 'undefined') {
    if (window.DB) {
      Object.assign(window.DB, db);
      if (typeof window.DB.save === 'function') {
        try {
          window.DB.save();
        } catch (e) {
          console.warn('DB.save error:', e);
        }
      }
    }
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }
}

export function normalizeUser(u) {
  const roleMap = { 1: 'superuser', 2: 'admin', 3: 'moderator', 4: 'player', 5: 'publisher' };
  const id = u.user_id != null ? String(u.user_id) : String(u.id);
  const username = u.username || u.user_name || '';
  let role = u.role;
  if (!role && u.role_id) {
    role = roleMap[u.role_id] || 'player';
  }
  role = (role || 'player').toLowerCase();
  const role_id = u.role_id || (role === 'superuser' ? 1 : role === 'admin' ? 2 : role === 'moderator' ? 3 : role === 'publisher' ? 5 : 4);
  const email = u.email || '';
  const status = (u.status || 'active').toLowerCase();
  const avatar = u.avatar || username.slice(0, 2).toUpperCase() || '??';
  const joinDate = u.joinDate || u.created_at || new Date().toISOString().slice(0, 10);
  const lastSeen = u.lastSeen || u.updated_at || new Date().toISOString().slice(0, 10);

  return {
    ...u,
    id,
    user_id: u.user_id != null ? u.user_id : (/^\d+$/.test(id) ? parseInt(id, 10) : id),
    username,
    user_name: u.user_name || username,
    role,
    role_id,
    email,
    status,
    avatar,
    joinDate,
    lastSeen
  };
}

export async function fetchUsers() {
  const data = await api.get('/users');
  if (Array.isArray(data)) {
    const normalized = data.map(normalizeUser);
    const db = getDatabase();
    db.users = normalized;
    saveDatabase(db);
    return normalized;
  }
  throw new Error('Failed to load users: response was not an array');
}

export function isEmailTakenForRole(users, email, role, excludeUserId = null) {
  if (typeof window !== 'undefined' && window.DB && typeof window.DB.emailTakenForRole === 'function') {
    return window.DB.emailTakenForRole(email, role, excludeUserId);
  }
  const target = String(email || '').trim().toLowerCase();
  if (!target) return false;
  const targetRole = String(role || '').trim().toLowerCase();
  const roleMap = { 1: 'superuser', 2: 'admin', 3: 'moderator', 4: 'player', 5: 'publisher' };

  return users.some(u => {
    const uid = String(u.user_id != null ? u.user_id : u.id);
    if (excludeUserId != null && uid === String(excludeUserId)) return false;
    if (String(u.email || '').trim().toLowerCase() !== target) return false;
    const uRole = (u.role || roleMap[u.role_id] || '').trim().toLowerCase();
    return uRole === targetRole;
  });
}

export async function createUserRecord({ username, email, role, password }) {
  const roleMap = { player: 4, publisher: 5, moderator: 3, admin: 2 };
  const roleId = roleMap[role] || 4;
  const avatar = username.slice(0, 2).toUpperCase();

  const createdUser = await api.post('/users', {
    user_name: username,
    role_id: roleId,
    email,
    password,
    avatar
  });

  const numId = createdUser?.user_id ?? createdUser?.id ?? Date.now();
  const newUser = normalizeUser({
    ...createdUser,
    user_id: numId,
    id: String(numId),
    user_name: username,
    username,
    role_id: roleId,
    role,
    email,
    password,
    avatar,
    status: createdUser?.status || 'active',
    joinDate: createdUser?.joinDate || new Date().toISOString().slice(0, 10),
    lastSeen: createdUser?.lastSeen || new Date().toISOString().slice(0, 10)
  });

  const db = getDatabase();
  db.users = db.users || [];
  db.users.push(newUser);
  saveDatabase(db);

  return newUser;
}

export async function updateUserRecord(userId, { username, email, role }) {
  const avatar = username.slice(0, 2).toUpperCase();
  const roleMap = { player: 4, publisher: 5, moderator: 3, admin: 2, superuser: 1 };
  const roleId = role ? roleMap[role] : undefined;

  await api.patch(`/users/${userId}`, {
    user_name: username,
    email,
    ...(roleId ? { role_id: roleId } : {})
  });

  if (roleId) {
    try {
      await api.patch(`/users/${userId}/role`, { role_id: roleId });
    } catch {
      // Role patch may be restricted; update already submitted to main patch
    }
  }

  const db = getDatabase();
  db.users = db.users || [];
  const target = db.users.find(x => String(x.user_id ?? x.id) === String(userId));
  if (target) {
    target.user_name = username;
    target.username = username;
    target.email = email;
    target.avatar = avatar;
    if (role) {
      target.role = role;
      target.role_id = roleId || target.role_id;
    }
    saveDatabase(db);
  }
}

export async function updateUserStatus(userId, status) {
  await api.patch(`/users/${userId}/status`, { status });

  const db = getDatabase();
  db.users = db.users || [];
  const target = db.users.find(x => String(x.user_id ?? x.id) === String(userId));
  if (target) {
    target.status = status;
    saveDatabase(db);
  }
}

export function sendUserNotification(targetUsername, fromSessionRole, fromSessionName, msg) {
  if (typeof window !== 'undefined' && typeof window.dispatchDirectNotification === 'function') {
    try {
      window.dispatchDirectNotification(targetUsername, fromSessionRole, fromSessionName, msg);
      return;
    } catch (e) {
      console.warn('dispatchDirectNotification failed:', e);
    }
  }

  const db = getDatabase();
  db.notifications = db.notifications || [];
  db.notifications.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'system',
    toUser: targetUsername,
    from: fromSessionName,
    avatar: '👑',
    fromRole: fromSessionRole,
    fromUserId: 0,
    msg: msg,
    time: new Date().toISOString(),
    read: false,
    replies: []
  });
  saveDatabase(db);
}

export async function updateUserRole(userId, newRole) {
  const roleMap = { player: 4, publisher: 5, moderator: 3, admin: 2, superuser: 1 };
  const roleId = roleMap[newRole] || 4;

  await api.patch(`/users/${userId}/role`, { role_id: roleId });

  const db = getDatabase();
  db.users = db.users || [];
  const target = db.users.find(x => String(x.user_id ?? x.id) === String(userId));
  if (target) {
    target.role = newRole;
    target.role_id = roleId;
    saveDatabase(db);
  }
}

export async function deleteUserRecord(userId) {
  await api.delete(`/users/${userId}`);

  const db = getDatabase();
  db.users = db.users || [];
  db.deleted_users = db.deleted_users || [];
  const idx = db.users.findIndex(x => String(x.user_id ?? x.id) === String(userId));
  if (idx !== -1) {
    db.users.splice(idx, 1);
  }
  if (!db.deleted_users.some(d => String(d) === String(userId))) {
    db.deleted_users.push(Number(userId) || userId);
  }
  saveDatabase(db);
}

export function normalizeGame(g, users = []) {
  const id = g.game_id != null ? g.game_id : (g.id != null ? g.id : Date.now());
  const title = g.game_name || g.title || 'Untitled Game';
  const genre = g.game_type || g.genre || 'Action';
  const status = (g.game_approval_status || g.status || 'pending').toLowerCase();
  const enabled = g.game_status !== undefined ? g.game_status === 'enabled' : (g.enabled !== undefined ? Boolean(g.enabled) : true);

  // Publisher display mapping
  let publisher = g.publisher;
  if (!publisher && g.game_publisher != null) {
    const pubUser = users.find(u => String(u.user_id ?? u.id) === String(g.game_publisher));
    publisher = pubUser ? (pubUser.username || pubUser.user_name) : `Publisher #${g.game_publisher}`;
  }
  if (!publisher) publisher = 'Unknown Publisher';

  const publisherId = g.game_publisher != null ? g.game_publisher : (g.publisherId != null ? g.publisherId : 5);
  const playCount = g.play_count != null ? g.play_count : (g.sessions != null ? g.sessions : (g.playCount || 0));
  const rating = g.rating != null ? g.rating : 4.5;
  const ratingCount = g.ratingCount != null ? g.ratingCount : (g.reviews_count || 10);
  const submittedDate = g.submittedDate || g.created_at || '2026-01-01';
  const icon = g.icon || '🎮';
  const banner = g.banner || g.cover_image || '';
  const description = g.desc || g.description || '';

  return {
    ...g,
    id,
    game_id: id,
    title,
    game_name: title,
    genre,
    game_type: genre,
    publisher,
    game_publisher: publisherId,
    publisherId,
    status,
    game_approval_status: status,
    enabled,
    game_status: enabled ? 'enabled' : 'disabled',
    playCount,
    rating,
    ratingCount,
    submittedDate,
    icon,
    banner,
    description
  };
}

export async function fetchGames() {
  let users = [];
  try {
    users = await fetchUsers();
  } catch (e) {
    console.warn('Failed to fetch users for publisher mapping:', e);
  }

  const data = await api.get('/games');
  if (Array.isArray(data)) {
    const normalized = data.map((g) => normalizeGame(g, users));
    const db = getDatabase();
    db.games = normalized;
    saveDatabase(db);
    return normalized;
  }
  throw new Error('Failed to load games: response was not an array');
}

export async function toggleGameStatus(gameId) {
  const sid = String(gameId);
  const numId = Number(gameId);
  const db = getDatabase();
  db.games = db.games || [];
  const target = db.games.find((g) => String(g.game_id != null ? g.game_id : g.id) === sid);
  if (!target) {
    throw new Error('Game not found');
  }

  const nextEnabled = !target.enabled;
  const nextStatus = nextEnabled ? 'enabled' : 'disabled';

  if (!isNaN(numId)) {
    await api.patch(`/games/${numId}/state`, {
      game_status: nextStatus,
      publisher_id: target.game_publisher || 5
    });
  }

  target.enabled = nextEnabled;
  target.game_status = nextStatus;
  saveDatabase(db);

  return target;
}

export async function deleteGameRecord(gameId) {
  const sid = String(gameId);
  const numId = Number(gameId);

  if (!isNaN(numId)) {
    await api.delete(`/games/${numId}`);
  }

  const db = getDatabase();
  db.games = db.games || [];
  db.deleted_games = db.deleted_games || [];
  const idx = db.games.findIndex((g) => String(g.game_id != null ? g.game_id : g.id) === sid);
  if (idx !== -1) {
    db.games.splice(idx, 1);
  }
  if (!db.deleted_games.some((d) => String(d?.game_id ?? d) === sid)) {
    db.deleted_games.push({ game_id: sid, deleted_at: new Date().toISOString() });
  }
  saveDatabase(db);
}

export function getSettings() {
  const db = getDatabase();
  const def = {
    platformName: 'PlayCarys',
    maintenanceMode: false,
    registrationOpen: true,
    twoFactorAuth: true,
    sessionTimeout: 30,
    strongPasswords: true,
    emailNotifications: true,
    reportNotifications: true,
    approvalNotifications: true,
    maxGames: 10
  };
  return { ...def, ...(db.settings || {}) };
}

export async function saveSettings(partial) {
  const db = getDatabase();
  db.settings = { ...(db.settings || {}), ...partial };
  saveDatabase(db);

  try {
    await api.post('/db-import', { settings: db.settings });
  } catch (e) {
    console.warn('Backend passthrough sync failed:', e);
  }

  return db.settings;
}

export async function purgeSessions() {
  const db = getDatabase();
  db.matches = db.matches || [];
  const live = db.matches.filter((m) => m.status === 'in-progress');
  live.forEach((m) => {
    m.status = 'completed';
    m.end_time = new Date().toISOString();
  });
  saveDatabase(db);

  try {
    await api.post('/db-import', { matches: live });
  } catch (e) {
    console.warn('Backend purgeSessions sync failed:', e);
  }
  return true;
}

export async function liftAllBans() {
  const bans = await fetchBans();
  const activeBans = bans.filter((b) => b.active);

  for (const b of activeBans) {
    const pid = b.playerId || b.player_id;
    if (pid) {
      try {
        await api.patch(`/moderator-actions/bans/${pid}/lift`, { moderator_id: 0 });
      } catch (e) {
        console.warn(`Failed lifting ban for player ${pid}:`, e);
      }
    }
  }

  const db = getDatabase();
  (db.bans || []).forEach((b) => (b.active = false));
  (db.users || []).forEach((u) => {
    if (u.status === 'banned') u.status = 'active';
  });
  saveDatabase(db);
  return true;
}

export async function archiveAllReports() {
  const reports = await fetchReports();
  const openReports = reports.filter((r) => r.status === 'pending' || r.status === 'under-review');

  for (const r of openReports) {
    const rid = r.report_id || r.id;
    if (rid) {
      try {
        await api.patch(`/reports/${rid}/status`, {
          requester_user_id: 0,
          status: 'resolved',
          actionNote: '[Superuser Batch Resolve] Closed via platform settings'
        });
      } catch (e) {
        console.warn(`Failed resolving report ${rid}:`, e);
      }
    }
  }

  const db = getDatabase();
  (db.reports || []).forEach((r) => {
    if (r.status === 'pending' || r.status === 'under-review') {
      r.status = 'resolved';
      r.actionNote = '[Superuser Batch Resolve] Closed via platform settings';
    }
  });
  saveDatabase(db);
  return true;
}

export async function clearActivityLog() {
  const db = getDatabase();
  db.moderator_actions = [];
  db.activityLog = [];
  saveDatabase(db);

  try {
    await api.post('/db-import', { moderator_actions: [], activityLog: [] });
  } catch (e) {
    console.warn('Backend clearActivityLog sync failed:', e);
  }
  return true;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toISOString().slice(0, 10);
  } catch {
    return String(dateStr);
  }
}

export function normalizeReport(r, users = []) {
  const id = r.report_id != null ? r.report_id : (r.id != null ? r.id : Date.now());
  const type = r.type || 'Behavior';
  const reason = r.reason || r.action_reason || 'Reported for community violation';
  const desc = r.desc || reason;
  const status = (r.status || 'pending').toLowerCase();
  const reportDate = r.report_date || r.reportDate || r.created_at || new Date().toISOString().slice(0, 10);
  const time = r.time || 'recently';
  const session = r.session || (r.sessionId ? `Session #${r.sessionId}` : 'General');
  const actionNote = r.actionNote || '';

  // Reporter lookup
  let reporterName = r.reporterName || r.reporter_name || r.reporter;
  if (!reporterName && r.reported_by != null) {
    const u = users.find(x => String(x.user_id ?? x.id) === String(r.reported_by));
    reporterName = u ? (u.username || u.user_name) : `Player #${r.reported_by}`;
  }
  if (!reporterName) reporterName = 'Anonymous';

  // Reported user lookup
  let reportedName = r.reportedName || r.reported_name || r.reported;
  if (!reportedName && r.reported_user != null) {
    const u = users.find(x => String(x.user_id ?? x.id) === String(r.reported_user));
    reportedName = u ? (u.username || u.user_name) : `Player #${r.reported_user}`;
  }
  if (!reportedName) reportedName = 'Unknown User';

  const reporterId = r.reported_by != null ? String(r.reported_by) : (r.reporterId != null ? String(r.reporterId) : null);
  const reportedId = r.reported_user != null ? String(r.reported_user) : (r.reportedId != null ? String(r.reportedId) : null);

  return {
    ...r,
    id,
    report_id: id,
    reported_by: r.reported_by,
    reported_user: r.reported_user,
    reporterId,
    reportedId,
    type,
    reason,
    desc,
    status,
    report_date: reportDate,
    time,
    session,
    actionNote,
    reporterName,
    reportedName,
    reporter_name: reporterName,
    reported_name: reportedName
  };
}

export async function fetchReports() {
  let users = [];
  try {
    users = await fetchUsers();
  } catch (e) {
    console.warn('Failed to fetch users for report normalization:', e);
  }

  const data = await api.get('/reports');
  if (Array.isArray(data)) {
    const normalized = data.map(r => normalizeReport(r, users));
    const db = getDatabase();
    db.reports = normalized;
    saveDatabase(db);
    return normalized;
  }
  throw new Error('Failed to load reports: response was not an array');
}

export async function resolveReportRecord(reportId, action, notes, requesterUserId = 0) {
  const sid = String(reportId);
  const numId = Number(reportId);
  const actionNote = `[Superuser ${action}] ${notes}`;

  if (!isNaN(numId)) {
    await api.patch(`/reports/${numId}/status`, {
      requester_user_id: requesterUserId ?? 0,
      status: 'resolved',
      actionNote
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  const target = db.reports.find(r => String(r.report_id != null ? r.report_id : r.id) === sid);
  if (target) {
    target.status = 'resolved';
    target.actionNote = actionNote;
    saveDatabase(db);
  }

  return true;
}

export async function reopenReportRecord(reportId, requesterUserId = 0) {
  const sid = String(reportId);
  const numId = Number(reportId);

  if (!isNaN(numId)) {
    await api.patch(`/reports/${numId}/status`, {
      requester_user_id: requesterUserId ?? 0,
      status: 'pending',
      actionNote: ''
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  const target = db.reports.find(r => String(r.report_id != null ? r.report_id : r.id) === sid);
  if (target) {
    target.status = 'pending';
    target.actionNote = '';
    saveDatabase(db);
  }

  return true;
}

export function normalizeBan(b, users = []) {
  const id = b.id != null ? b.id : Date.now();
  const playerId = b.playerId != null ? b.playerId : (b.player_id != null ? b.player_id : null);
  let playerName = b.playerName || b.player_name;
  if (!playerName && playerId != null) {
    const u = users.find(x => String(x.user_id ?? x.id) === String(playerId));
    playerName = u ? (u.username || u.user_name) : `Player #${playerId}`;
  }
  if (!playerName) playerName = 'Unknown Player';

  const duration = b.duration || '7 Days';
  const reason = b.reason || b.action_reason || 'Rule violation';
  const bannedBy = b.bannedBy || b.banned_by || 'Superuser';
  const bannedDate = b.bannedDate || b.banned_date || new Date().toISOString().slice(0, 10);
  const expiresDate = b.expiresDate || b.expires_date || null;
  const active = b.active !== undefined ? Boolean(b.active) : true;
  const level = b.level != null ? b.level : 1;

  return {
    ...b,
    id,
    playerId,
    playerName,
    level,
    duration,
    reason,
    bannedBy,
    bannedDate,
    expiresDate,
    active
  };
}

export async function fetchBans() {
  let users = [];
  try {
    users = await fetchUsers();
  } catch (e) {
    console.warn('Failed to fetch users for ban normalization:', e);
  }

  const data = await api.get('/moderator-actions/bans');
  if (Array.isArray(data)) {
    const normalized = data.map(b => normalizeBan(b, users));
    const db = getDatabase();
    db.bans = normalized;
    saveDatabase(db);
    return normalized;
  }
  throw new Error('Failed to load bans: response was not an array');
}

export async function issueBanRecord({ targetUserId, duration = '7 Days', reason, moderatorId = 0, moderatorName = 'Superuser' }) {
  const numTargetId = Number(targetUserId);

  await api.post('/moderator-actions/handle-violation', {
    moderator_id: moderatorId ?? 0,
    target_user_id: numTargetId,
    action_type: 'ban',
    action_reason: reason,
    violation_type: 'Superuser Ban',
    ban_duration: duration
  });

  try {
    await api.patch(`/users/${numTargetId}/status`, { status: 'banned' });
  } catch {
    // User status update attempted
  }

  const db = getDatabase();
  db.users = db.users || [];
  db.bans = db.bans || [];
  const targetUser = db.users.find(u => String(u.user_id ?? u.id) === String(targetUserId));
  if (targetUser) targetUser.status = 'banned';

  let expiresDateStr = null;
  if (!duration.toLowerCase().includes('permanent')) {
    const days = parseInt(duration, 10) || 7;
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    expiresDateStr = exp.toISOString().slice(0, 10);
  }

  const newBan = {
    id: Date.now(),
    playerId: numTargetId,
    playerName: targetUser ? (targetUser.username || targetUser.user_name) : `Player #${numTargetId}`,
    level: targetUser?.level || 1,
    duration,
    reason,
    bannedBy: moderatorName,
    bannedDate: new Date().toISOString().slice(0, 10),
    expiresDate: expiresDateStr,
    active: true
  };
  db.bans.push(newBan);
  saveDatabase(db);
  return newBan;
}

export async function liftBanRecord(banId, playerId, moderatorId = 0) {
  const sid = String(banId);
  const numPlayerId = playerId != null ? Number(playerId) : null;

  if (numPlayerId) {
    await api.patch(`/moderator-actions/bans/${numPlayerId}/lift`, {
      moderator_id: moderatorId ?? 0
    });
    try {
      await api.patch(`/users/${numPlayerId}/status`, { status: 'active' });
    } catch {
      // User status update attempted
    }
  }

  const db = getDatabase();
  db.bans = db.bans || [];
  db.users = db.users || [];
  const ban = db.bans.find(b => String(b.id) === sid || (numPlayerId && String(b.playerId) === String(numPlayerId)));
  if (ban) ban.active = false;
  const user = db.users.find(u => String(u.user_id ?? u.id) === String(numPlayerId || ban?.playerId));
  if (user) user.status = 'active';
  saveDatabase(db);
  return true;
}

export default {
  getDatabase,
  getPlatformStats,
  fetchPlatformStats,
  getRecentActivity,
  fetchRecentActivity,
  formatActivityTime,
  formatInr,
  getPlatformEconomy,
  saveDatabase,
  normalizeUser,
  fetchUsers,
  isEmailTakenForRole,
  createUserRecord,
  updateUserRecord,
  updateUserStatus,
  sendUserNotification,
  updateUserRole,
  deleteUserRecord,
  normalizeGame,
  fetchGames,
  toggleGameStatus,
  deleteGameRecord,
  getSettings,
  saveSettings,
  purgeSessions,
  liftAllBans,
  archiveAllReports,
  clearActivityLog,
  formatDate,
  normalizeReport,
  fetchReports,
  resolveReportRecord,
  reopenReportRecord,
  normalizeBan,
  fetchBans,
  issueBanRecord,
  liftBanRecord
};
