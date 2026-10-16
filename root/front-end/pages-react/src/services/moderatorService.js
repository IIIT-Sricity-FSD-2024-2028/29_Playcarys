import api from './api.js';

const DB_KEY = 'playcarys_db_store_v5';

export function getDatabase() {
  if (typeof window !== 'undefined' && window.DB && window.DB.reports) {
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
    matches: [],
    notifications: [],
    activityLog: []
  };
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

export async function fetchModeratorDashboardData(sessionUserId) {
  // Fetch real backend data concurrently
  const [reportsRes, bansRes, usersRes, sessionsRes, actionsRes] = await Promise.allSettled([
    api.get('/reports'),
    api.get('/moderator-actions/bans'),
    api.get('/users'),
    api.get('/sessions'),
    api.get('/moderator-actions')
  ]);

  const db = getDatabase();
  const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value) ? reportsRes.value : (db.reports || []);
  const bans = bansRes.status === 'fulfilled' && Array.isArray(bansRes.value) ? bansRes.value : (db.bans || []);
  const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : (db.users || []);
  let matches = [];
  if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
    matches = sessionsRes.value.map((s) => ({
      ...s,
      match_id: s.session_id,
      status: s.status === 'in-progress' || s.status === 'active' ? 'in-progress' : s.status
    }));
  } else {
    matches = db.matches || [];
  }
  const actions = actionsRes.status === 'fulfilled' && Array.isArray(actionsRes.value) ? actionsRes.value : (db.moderator_actions || []);

  // Update in-memory DB
  db.reports = reports;
  db.bans = bans;
  db.users = users;
  db.matches = matches;
  db.moderator_actions = actions;
  saveDatabase(db);

  // Compute live KPIs
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const reviewReports = reports.filter((r) => r.status === 'under-review').length;
  const totalResolved = reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed' || r.status === 'rejected').length;
  const liveNow = matches.filter((m) => m.status === 'in-progress').length;
  const activeBans = bans.filter((b) => b.active !== false).length;
  const todayReports = reports.filter((r) => (r.report_date || '').startsWith(todayStr)).length;

  // Compute performance metrics for this moderator
  const myActions = actions.filter((a) => String(a.moderator_id) === String(sessionUserId));
  const warnsByMe = myActions.filter((a) => a.action_type === 'warning').length;
  const bansByMe = myActions.filter((a) => a.action_type === 'ban').length;
  const totalActions = actions.length || 1;
  const sharePercent = Math.round((myActions.length / totalActions) * 100);

  // Recent reports (first 6)
  const recentReports = reports.slice(0, 6).map((raw) => {
    let rn = raw.reporterName || raw.reporter_name;
    if (!rn && raw.reported_by) {
      const u = users.find((x) => String(x.user_id ?? x.id) === String(raw.reported_by));
      rn = u ? (u.user_name || u.username) : `User #${raw.reported_by}`;
    }
    if (!rn) rn = 'Unknown';

    let dn = raw.reportedName || raw.reported_name;
    if (!dn && raw.reported_user) {
      const u = users.find((x) => String(x.user_id ?? x.id) === String(raw.reported_user));
      dn = u ? (u.user_name || u.username) : `User #${raw.reported_user}`;
    }
    if (!dn) dn = 'Unknown';

    return {
      id: raw.report_id || raw.id,
      reporterName: rn,
      reportedName: dn,
      type: raw.type || 'General',
      status: raw.status || 'pending',
      time: raw.time || raw.report_date || 'recently',
      desc: raw.desc || raw.reason || ''
    };
  });

  // Activity Log: combine activityLog items + resolved reports + pending reports
  const logItems = [
    ...(db.activityLog || []).slice(0, 8).map((l) => ({
      icon: '📌',
      text: l.msg,
      time: l.time || 'recently',
      type: l.type || 'info'
    }))
  ];

  if (logItems.length === 0) {
    actions.slice(0, 5).forEach((act) => {
      logItems.push({
        icon: act.action_type === 'ban' ? '🔨' : act.action_type === 'warning' ? '⚠️' : '🛡️',
        text: `Moderator action: ${act.action_type} - ${act.action_reason || 'Disciplinary action'}`,
        time: act.action_date || 'recently',
        type: act.action_type === 'ban' ? 'ban' : 'warning'
      });
    });
  }

  // Active Live Matches (first 5)
  const activeMatches = matches
    .filter((m) => m.status === 'in-progress')
    .slice(0, 5)
    .map((m) => {
      const g = (db.games || []).find((x) => String(x.game_id ?? x.id) === String(m.game_id));
      const gameTitle = m.game_name || m.game || (g ? g.title || g.game_name : 'Match');
      const pCount = Array.isArray(m.player_ids)
        ? m.player_ids.length
        : (Array.isArray(m.participants) ? m.participants.length : (m.current_players || 2));
      return {
        id: m.match_id != null ? m.match_id : m.id,
        title: m.name || `${gameTitle} #${m.match_id != null ? m.match_id : m.id}`,
        game: gameTitle,
        players: pCount,
        time: m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'
      };
    });

  // Active Bans List
  const activeBansList = bans
    .filter((b) => b.active !== false)
    .slice(0, 5)
    .map((b) => {
      let pName = b.playerName || b.player_name;
      if (!pName && b.playerId) {
        const u = users.find((x) => String(x.user_id ?? x.id) === String(b.playerId));
        pName = u ? (u.user_name || u.username) : `Player #${b.playerId}`;
      }
      return {
        id: b.id,
        playerId: b.playerId,
        playerName: pName || 'Unknown Player',
        reason: b.reason || 'Violation of Community Guidelines',
        duration: b.duration || '7 Days',
        expiresDate: b.expiresDate || b.expires_date || '—'
      };
    });

  // Report Activity Chart: 7 days of incoming vs resolved from live backend reports
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const incoming = days.map((d) => reports.filter((r) => (r.report_date || '').startsWith(d)).length);
  const resolved = days.map((d) => reports.filter((r) => (r.status === 'resolved' || r.status === 'dismissed' || r.status === 'rejected') && (r.report_date || '').startsWith(d)).length);
  const dayLabels = days.map((d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));

  const chartData = {
    labels: dayLabels,
    incoming,
    resolved
  };

  return {
    kpis: {
      pendingReports,
      reviewReports,
      totalResolved,
      liveNow,
      activeBans,
      todayReports
    },
    performance: {
      actionsTaken: myActions.length,
      warnsByMe,
      bansByMe,
      totalByMe: myActions.length,
      sharePercent
    },
    recentReports,
    logItems,
    activeMatches,
    activeBansList,
    chartData,
    users
  };
}

export async function sendContactAdminNotification({ subject, msg, priority, session, users = [] }) {
  const fromUserId = session?.userId != null ? Number(session.userId) : 3;
  const fromUsername = session?.username || 'ModeratorOne';

  let admins = users.filter((u) => {
    const r = (u.role || '').toLowerCase();
    return r === 'admin' || r === 'superuser' || u.role_id === 1 || u.role_id === 2;
  });

  if (admins.length === 0) {
    admins = [{ user_id: 1, username: 'SuperAdmin' }, { user_id: 0, username: 'GodMode' }];
  }

  const avatar = session?.avatar || fromUsername.slice(0, 2).toUpperCase() || 'M1';

  const notificationPayloads = admins.map((admin) => ({
    toUser: Number(admin.user_id != null ? admin.user_id : admin.id),
    from: fromUsername,
    fromUserId: fromUserId,
    fromRole: 'moderator',
    avatar: avatar,
    msg: `[${priority.toUpperCase()} - Contact Admin] ${subject}\n\n${msg}`,
    type: 'admin_contact'
  }));

  // Call API POST /notifications for each admin
  for (const notif of notificationPayloads) {
    try {
      await api.post('/notifications', notif);
    } catch (e) {
      console.warn('API /notifications post failed, using local fallback:', e.message);
    }
  }

  // Update in local DB
  const db = getDatabase();
  db.notifications = db.notifications || [];
  admins.forEach((admin) => {
    db.notifications.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'admin_contact',
      toUser: admin.username || admin.user_name,
      toUserId: admin.user_id != null ? admin.user_id : admin.id,
      from: fromUsername,
      fromUserId: fromUserId,
      fromRole: 'moderator',
      subject: `[${priority.toUpperCase()}] ${subject}`,
      msg: msg,
      time: new Date().toISOString(),
      read: false,
      replies: []
    });
  });
  saveDatabase(db);

  return { success: true, count: admins.length };
}

export function sendModeratorUserNotification(targetUsername, fromSessionRole, fromSessionName, msg) {
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
    avatar: '🛡️',
    fromRole: fromSessionRole,
    fromUserId: 0,
    msg: msg,
    time: new Date().toISOString(),
    read: false,
    replies: []
  });
  saveDatabase(db);
}

export function safeReport(r, users = []) {
  const id = r.report_id != null ? r.report_id : (r.id != null ? r.id : Date.now());
  const type = r.type || 'Behavior';
  const reason = r.reason || r.action_reason || 'Reported for community guidelines violation';
  const status = (r.status || 'pending').toLowerCase();
  const reportDate = r.report_date || r.reportDate || r.created_at || new Date().toISOString().slice(0, 10);
  const time = r.time || 'recently';
  const session = r.session || (r.sessionId ? `Session #${r.sessionId}` : 'General');
  const actionNote = r.actionNote || '';
  const severity = r.severity || 'medium';

  // Reporter lookup
  let reporterName = r.reporter_name || r.reporter;
  if (!reporterName && r.reported_by != null) {
    const u = users.find((x) => String(x.user_id ?? x.id) === String(r.reported_by));
    reporterName = u ? (u.username || u.user_name) : `Player #${r.reported_by}`;
  }
  if (!reporterName) reporterName = 'Anonymous';

  // Reported user lookup
  let reportedName = r.reported_name || r.reported;
  if (!reportedName && r.reported_user != null) {
    const u = users.find((x) => String(x.user_id ?? x.id) === String(r.reported_user));
    reportedName = u ? (u.username || u.user_name) : `Player #${r.reported_user}`;
  }
  if (!reportedName) reportedName = 'Unknown User';

  return {
    ...r,
    id,
    report_id: id,
    reported_by: r.reported_by,
    reported_user: r.reported_user,
    type,
    reason,
    desc: reason,
    status,
    report_date: reportDate,
    time,
    session,
    actionNote,
    severity,
    reporterName,
    reportedName,
    isContact: type === 'Contact Admin' || type === 'admin_contact'
  };
}

export async function fetchModeratorReports() {
  const [reportsRes, usersRes] = await Promise.all([
    api.get('/reports'),
    api.get('/users').catch(() => [])
  ]);

  const users = Array.isArray(usersRes) ? usersRes : [];
  if (Array.isArray(reportsRes)) {
    const normalized = reportsRes.map((r) => safeReport(r, users));
    const db = getDatabase();
    db.reports = normalized;
    if (users.length) db.users = users;
    saveDatabase(db);
    return { reports: normalized, users };
  }
  throw new Error('Failed to load moderator reports: invalid response from server');
}

export async function reviewReportAction(reportId, session, reportObj) {
  const sid = String(reportId);
  const numId = Number(reportId);
  const requesterUserId = session?.userId != null ? Number(session.userId) : 3;
  const sRole = session?.role || 'moderator';
  const sName = session?.username || 'ModeratorOne';

  // API call to PATCH /reports/:id/status
  if (!isNaN(numId)) {
    await api.patch(`/reports/${numId}/status`, {
      requester_user_id: requesterUserId,
      status: 'under-review',
      actionNote: `Under review by Moderator ${sName}`
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  const target = db.reports.find(
    (r) => String(r.report_id != null ? r.report_id : r.id) === sid
  );
  if (target) {
    target.status = 'under-review';
    saveDatabase(db);
  }

  const activeRep = reportObj || (target ? safeReport(target, db.users || []) : null);
  if (activeRep) {
    sendModeratorUserNotification(activeRep.reporterName, sRole, sName, `Your report against ${activeRep.reportedName} is now under review.`);
  }

  return { success: true, updated: true, message: 'Report marked as Under Review' };
}

export async function resolveReportAction({ reportId, notes, severity = 'medium', session, report }) {
  const sid = String(reportId);
  const numId = Number(reportId);
  const requesterUserId = session?.userId != null ? Number(session.userId) : 3;
  const sRole = session?.role || 'moderator';
  const sName = session?.username || 'ModeratorOne';

  // API call to PATCH /reports/:id/status
  if (!isNaN(numId)) {
    await api.patch(`/reports/${numId}/status`, {
      requester_user_id: requesterUserId,
      status: 'resolved',
      actionNote: notes
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  db.moderator_actions = db.moderator_actions || [];

  const target = db.reports.find(
    (r) => String(r.report_id != null ? r.report_id : r.id) === sid
  );
  if (target) {
    target.status = 'resolved';
    target.actionNote = notes;
    target.severity = severity;
  }

  db.moderator_actions.push({
    action_id: Date.now(),
    moderator_id: requesterUserId,
    report_id: isNaN(numId) ? 0 : numId,
    action_type: 'resolve',
    action_date: new Date().toISOString().split('T')[0],
    action_reason: notes
  });

  saveDatabase(db);

  const activeRep = report || (target ? safeReport(target, db.users || []) : null);
  if (activeRep) {
    sendModeratorUserNotification(activeRep.reporterName, sRole, sName, `Your report against ${activeRep.reportedName} has been resolved.`);
  }

  return { success: true };
}

export async function dismissReportAction({ reportId, notes, session, report }) {
  const sid = String(reportId);
  const numId = Number(reportId);
  const requesterUserId = session?.userId != null ? Number(session.userId) : 3;
  const sRole = session?.role || 'moderator';
  const sName = session?.username || 'ModeratorOne';

  // Backend DTO allows 'rejected'
  if (!isNaN(numId)) {
    await api.patch(`/reports/${numId}/status`, {
      requester_user_id: requesterUserId,
      status: 'rejected',
      actionNote: notes
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  const target = db.reports.find(
    (r) => String(r.report_id != null ? r.report_id : r.id) === sid
  );
  if (target) {
    target.status = 'rejected';
    target.actionNote = notes;
  }

  saveDatabase(db);

  const activeRep = report || (target ? safeReport(target, db.users || []) : null);
  if (activeRep) {
    sendModeratorUserNotification(activeRep.reporterName, sRole, sName, `Your report against ${activeRep.reportedName} has been dismissed.`);
  }

  return { success: true };
}

export async function submitPlayerWarning({ reportId, customMsg, session, report }) {
  const sid = String(reportId);
  const numId = Number(reportId);
  const requesterUserId = session?.userId != null ? Number(session.userId) : 3;
  const sRole = session?.role || 'moderator';
  const sName = session?.username || 'ModeratorOne';

  const targetName = report.isContact ? report.reporterName : report.reportedName;
  const defaultMsg = `You received a warning regarding ${report.type}. Please follow community guidelines.`;
  const msg = customMsg || defaultMsg;

  const targetUserId = report.isContact
    ? report.reported_by
    : report.reported_user;

  if (targetUserId && !isNaN(Number(targetUserId)) && !isNaN(numId)) {
    await api.post('/moderator-actions/act-on-report', {
      moderator_id: requesterUserId,
      report_id: numId,
      action_type: 'warning',
      action_reason: msg,
      target_user_id: Number(targetUserId)
    });
  }

  const db = getDatabase();
  db.reports = db.reports || [];
  db.moderator_actions = db.moderator_actions || [];

  const targetRep = db.reports.find(
    (r) => String(r.report_id != null ? r.report_id : r.id) === sid
  );
  if (targetRep) {
    targetRep.status = 'under-review';
    targetRep.actionNote = '[Warning Issued] ' + msg;
  }

  db.moderator_actions.push({
    action_id: Date.now(),
    moderator_id: requesterUserId,
    report_id: isNaN(numId) ? 0 : numId,
    action_type: 'warning',
    action_date: new Date().toISOString().split('T')[0],
    action_reason: msg
  });

  saveDatabase(db);

  sendModeratorUserNotification(targetName, sRole, sName, `⚠️ Warning from Moderator ${sName}: ${msg}`);
  return { success: true, targetPlayerName: targetName };
}

export function getPlayers(m, matchResults = []) {
  if (!m) return [];
  if (Array.isArray(m.player_ids) && m.player_ids.length > 0) {
    return m.player_ids.map(String);
  }
  if (Array.isArray(m.participants) && m.participants.length > 0) {
    return m.participants.map(String);
  }
  const mid = String(m.match_id != null ? m.match_id : m.id);
  const fromResults = [
    ...new Set(
      (matchResults || [])
        .filter((r) => String(r.session_id) === mid)
        .map((r) => String(r.player_id))
    )
  ];
  if (fromResults.length > 0) return fromResults;
  if (m.created_by != null) {
    return [String(m.created_by)];
  }
  return [];
}

export async function fetchModeratorSessionsData() {
  const [sessionsRes, usersRes, gamesRes] = await Promise.allSettled([
    api.get('/sessions'),
    api.get('/users'),
    api.get('/games')
  ]);

  const db = getDatabase();
  let matches = [];
  if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value)) {
    matches = sessionsRes.value.map((s) => ({
      ...s,
      match_id: s.session_id,
      id: s.session_id,
      status: s.status === 'in-progress' || s.status === 'active' ? 'in-progress' : s.status
    }));
  } else {
    matches = db.matches || [];
  }

  const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : (db.users || []);
  const games = gamesRes.status === 'fulfilled' && Array.isArray(gamesRes.value) ? gamesRes.value : (db.games || []);

  let matchResults = [];
  try {
    const exp = await api.get('/db-export?tables=match_results');
    if (exp && Array.isArray(exp.match_results)) {
      matchResults = exp.match_results;
    }
  } catch {
    matchResults = db.match_results || [];
  }

  return { matches, matchResults, users, games };
}

export async function endModeratorMatch(matchId) {
  const sid = String(matchId);
  const numId = Number(matchId);

  // In backend, PATCH /sessions/:id/end requires host_id and results.
  // We first fetch the session to obtain host_id.
  let sessionData = null;
  try {
    sessionData = await api.get(`/sessions/${numId}`);
  } catch {
    // Session get failed
  }

  const hostId = sessionData ? (Number(sessionData.hostId ?? sessionData.created_by) || 1) : 1;
  const results = sessionData?.player_ids?.length
    ? sessionData.player_ids.map((pid, idx) => ({ player_id: pid, score: 100 * (idx + 1), player_rank: idx + 1 }))
    : [{ player_id: hostId, score: 100, player_rank: 1 }];

  let ended = false;
  try {
    await api.patch(`/sessions/${numId}/end`, {
      host_id: hostId,
      results
    });
    ended = true;
  } catch (err) {
    // If backend rejects host_id, sync ended status via /db-import
    try {
      await api.post('/db-import', {
        sessions: [{ session_id: numId, status: 'ended' }],
        matches: [{ match_id: numId, status: 'completed' }]
      });
      ended = true;
    } catch {
      throw err;
    }
  }

  const db = getDatabase();
  db.matches = db.matches || [];
  const target = db.matches.find(
    (m) => String(m.match_id != null ? m.match_id : m.id) === sid
  );
  if (target) {
    target.status = 'completed';
    target.end_time = new Date().toISOString();
    saveDatabase(db);
  }

  return { success: ended, match: target };
}

export function sendModeratorRoleNotification(targetRole, fromSessionRole, fromSessionName, msg) {
  if (typeof window !== 'undefined' && typeof window.dispatchRoleNotification === 'function') {
    try {
      window.dispatchRoleNotification(targetRole, fromSessionRole, fromSessionName, msg);
      return;
    } catch (e) {
      console.warn('dispatchRoleNotification failed:', e);
    }
  }

  const db = getDatabase();
  db.notifications = db.notifications || [];
  db.notifications.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'system',
    toRole: targetRole,
    toUser: null,
    from: fromSessionName,
    avatar: '🛡️',
    fromRole: fromSessionRole,
    fromUserId: 0,
    msg: msg,
    time: new Date().toISOString(),
    read: false,
    replies: []
  });
  saveDatabase(db);
}

export function isPlayer(u) {
  if (!u) return false;
  const role = (u.role || '').toLowerCase();
  if (['superuser', 'admin', 'moderator', 'publisher'].includes(role)) {
    return false;
  }
  if ([1, 2, 3, 5].includes(u.role_id)) {
    return false;
  }
  return true;
}

export async function fetchModeratorBansData() {
  const [bansRes, usersRes] = await Promise.all([
    api.get('/moderator-actions/bans'),
    api.get('/users').catch(() => [])
  ]);

  const bans = Array.isArray(bansRes) ? bansRes : [];
  const users = Array.isArray(usersRes) ? usersRes : [];

  let playerProfiles = [];
  try {
    const exp = await api.get('/db-export?tables=player_profiles');
    if (exp && Array.isArray(exp.player_profiles)) {
      playerProfiles = exp.player_profiles;
    }
  } catch (err) {
    console.warn('API /db-export player_profiles failed:', err.message);
  }

  const db = getDatabase();
  if (bans.length) db.bans = bans;
  if (users.length) db.users = users;
  saveDatabase(db);

  return { bans, users, playerProfiles };
}

export async function issueModeratorBan({ targetUserId, duration = '7 Days', reason, session }) {
  if (!reason || reason.trim().length < 10) {
    throw new Error('Ban reason must be at least 10 characters');
  }

  const sid = String(targetUserId);
  const numId = Number(targetUserId);
  const moderatorId = session?.userId != null ? Number(session.userId) : 3;
  const modRole = session?.role || 'moderator';
  const modName = session?.username || 'ModeratorOne';

  // API call POST /moderator-actions/act-on-report with action_type: 'ban'
  if (!isNaN(numId)) {
    await api.post('/moderator-actions/act-on-report', {
      moderator_id: moderatorId,
      action_type: 'ban',
      action_reason: reason.trim(),
      target_user_id: numId,
      ban_duration: duration
    });
    try {
      await api.patch(`/users/${numId}/status`, { status: 'banned' });
    } catch {
      // status update attempted
    }
  }

  const db = getDatabase();
  db.users = db.users || [];
  db.bans = db.bans || [];
  db.moderator_actions = db.moderator_actions || [];

  const targetUser = db.users.find(
    (u) => String(u.user_id != null ? u.user_id : u.id) === sid
  );
  if (targetUser) targetUser.status = 'banned';

  const playerName = targetUser
    ? targetUser.username || targetUser.user_name || `Player #${targetUserId}`
    : `Player #${targetUserId}`;

  const daysMap = { '1 Day': 1, '3 Days': 3, '7 Days': 7, '14 Days': 14, '30 Days': 30, 'Permanent': 3650 };
  const days = daysMap[duration] || 7;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  const newBan = {
    id: 'b_' + Date.now(),
    playerId: targetUser ? (targetUser.user_id != null ? targetUser.user_id : targetUser.id) : numId,
    playerName,
    level: targetUser?.level || 1,
    duration,
    reason: reason.trim(),
    bannedBy: modName,
    bannedDate: new Date().toISOString().slice(0, 10),
    expiresDate: expires.toISOString().slice(0, 10),
    active: true
  };
  db.bans.push(newBan);

  db.moderator_actions.push({
    action_id: Date.now(),
    moderator_id: moderatorId,
    report_id: 0,
    action_type: 'ban',
    action_date: new Date().toISOString().split('T')[0],
    action_reason: reason.trim()
  });

  saveDatabase(db);

  sendModeratorUserNotification(
    playerName,
    modRole,
    modName,
    `You have been banned for ${duration}. Reason: ${reason.trim()}`
  );

  return { success: true, playerName, duration };
}

export async function liftModeratorBan({ targetUserId, session }) {
  const sid = String(targetUserId);
  const numId = Number(targetUserId);
  const moderatorId = session?.userId != null ? Number(session.userId) : 3;
  const modRole = session?.role || 'moderator';
  const modName = session?.username || 'ModeratorOne';

  // API call PATCH /moderator-actions/bans/:playerId/lift
  if (!isNaN(numId)) {
    await api.patch(`/moderator-actions/bans/${numId}/lift`, {
      moderator_id: moderatorId
    });
    try {
      await api.patch(`/users/${numId}/status`, { status: 'active' });
    } catch {
      // status update attempted
    }
  }

  const db = getDatabase();
  db.users = db.users || [];
  db.bans = db.bans || [];

  const targetUser = db.users.find(
    (u) => String(u.user_id != null ? u.user_id : u.id) === sid
  );
  if (targetUser) {
    targetUser.status = 'active';
  }

  const activeBan = db.bans.find(
    (b) => String(b.playerId) === sid && b.active !== false
  );
  if (activeBan) {
    activeBan.active = false;
  }

  saveDatabase(db);

  const playerName = targetUser
    ? targetUser.username || targetUser.user_name || `Player #${targetUserId}`
    : `Player #${targetUserId}`;

  sendModeratorUserNotification(
    playerName,
    modRole,
    modName,
    `Your ban has been removed. Welcome back!`
  );

  return { success: true, playerName };
}

export default {
  getDatabase,
  saveDatabase,
  fetchModeratorDashboardData,
  sendContactAdminNotification,
  sendModeratorUserNotification,
  safeReport,
  fetchModeratorReports,
  reviewReportAction,
  resolveReportAction,
  dismissReportAction,
  submitPlayerWarning,
  getPlayers,
  fetchModeratorSessionsData,
  endModeratorMatch,
  sendModeratorRoleNotification,
  isPlayer,
  fetchModeratorBansData,
  issueModeratorBan,
  liftModeratorBan
};
