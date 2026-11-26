import api from './api';
// Control Hub data operations, copied from the old pages/admin/hub.html.
// Each function changes DB the same way the old page did; the section then calls refresh().
import { getDB, getSession, capitalize, dispatchRoleNotification } from './adminService';
import { recordAudit } from './adminAuditService';

// ── Audit log ────────────────────────────────────────────────────
// Entries are kept by the server (see adminAuditService), so they survive a page reload and are
// the same for every admin. This also adds the line to the platform activity feed and tells the
// superusers.
export function addAuditEntry(type, msg, detail) {
  const session = getSession();
  const db = getDB();
  const saved = recordAudit(type, msg, detail);
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.unshift({ type: type, msg: msg, time: 'just now' });
  if (session.role !== 'superuser') {
    dispatchRoleNotification('superuser', session.role, session.username, `Audit Action: ${msg} (${detail})`);
  }
  return saved;
}

// ── Games ────────────────────────────────────────────────────────
export function listHubGames(statusFilter) {
  let games = [...getDB().games];
  if (statusFilter) games = games.filter((g) => g.status === statusFilter);
  return games;
}

export async function toggleGameEnabled(g, addAudit) {
  const nextEnabled = !g.enabled;
  const nextStatus = nextEnabled ? 'enabled' : 'disabled';
  const gameId = Number(g.id || g.game_id);
  const session = getSession() || {};

  if (!isNaN(gameId)) {
    try {
      await api.patch(`/games/${gameId}/state`, {
        game_status: nextStatus,
        publisher_id: Number(g.game_publisher || g.publisher_id || session.userId || 1)
      });
    } catch (err) {
      console.warn('[adminHubService] Backend game state toggle fallback:', err.message);
    }
  }

  g.enabled = nextEnabled;
  g.game_status = nextStatus;
  addAudit('game', `${g.title} ${g.enabled ? 'enabled' : 'blacklisted'}`, `By ${session.username || 'Admin'}`);
  getDB().save();
}

export async function deleteGame(g, addAudit) {
  const db = getDB();
  const gameId = Number(g.id || g.game_id);
  const session = getSession() || {};

  if (!isNaN(gameId)) {
    try {
      await api.delete(`/games/${gameId}`);
    } catch (err) {
      console.warn('[adminHubService] Backend game delete fallback:', err.message);
    }
  }

  db.deleteGame(g.id); // removes the game and records it, so the sync cannot bring it back
  addAudit('game', `Game deleted: ${g.title}`, `By ${session.username || 'Admin'}`);
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

export async function createTournament(name, desc, gameId, maxParticipants, startDate, prize, addAudit) {
  const db = getDB();
  const session = getSession() || {};
  const game = db.games.find((g) => g.id === gameId);
  const regClose = new Date(startDate);
  regClose.setDate(regClose.getDate() - 2);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const numGameId = Number(gameId) || 1;
  const numMax = parseInt(maxParticipants, 10) || 32;
  const orgId = Number(session.userId) || 1;

  let created = null;
  try {
    created = await api.post('/tournaments', {
      tournament_name: name.trim(),
      desc: desc.trim(),
      game_id: numGameId,
      maxParticipants: numMax,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate.toISOString(),
      regClose: regClose.toISOString(),
      prize: prize || '₹0',
      organizer: orgId,
      organizer_role: session.role || 'admin',
      type: 'single',
      visibility: 'public'
    });
  } catch (err) {
    console.warn('[adminHubService] Backend tournament create fallback:', err.message);
  }

  const newId = created && (created.id || created.tournament_id)
    ? (created.id || created.tournament_id)
    : (db.tournaments.length
      ? Math.max(...db.tournaments.map((t) => parseInt(t.tournament_id || t.id, 10) || 0)) + 1
      : 1);

  db.tournaments.push({
    id: newId,
    tournament_id: newId,
    name: name.trim(),
    tournament_name: name.trim(),
    desc: desc.trim(),
    game: game ? game.title : 'Unknown',
    gameId: numGameId,
    game_id: numGameId,
    participants: 0,
    maxParticipants: numMax,
    status: 'upcoming',
    startDate: startDate,
    start_date: new Date(startDate).toISOString(),
    regClose: regClose.toISOString().slice(0, 10),
    prize: prize || 'N/A',
    organizer: orgId,
    registeredPlayers: []
  });
  addAudit('tournament', `Tournament created: ${name}`, `By ${session.username || 'Admin'}`);
  db.save();
}

export function findTournament(id) {
  return getDB().tournaments.find((t) => t.id === id);
}

export async function setTournamentStatus(t, status, label, addAudit) {
  const tourId = Number(t.id || t.tournament_id);
  const session = getSession() || {};

  if (!isNaN(tourId)) {
    try {
      if (status === 'in-progress') {
        await api.post(`/tournaments/${tourId}/start`);
      } else {
        await api.patch(`/tournaments/${tourId}`, { status });
      }
    } catch (err) {
      console.warn('[adminHubService] Backend set tournament status fallback:', err.message);
    }
  }

  t.status = status;
  addAudit('tournament', `${t.name || t.tournament_name} ${label}`, `By ${session.username || 'Admin'}`);
  getDB().save();
}

export async function deleteTournament(t, addAudit) {
  const db = getDB();
  const tourId = Number(t.id || t.tournament_id);
  const session = getSession() || {};

  if (!isNaN(tourId)) {
    try {
      await api.delete(`/tournaments/${tourId}`);
    } catch (err) {
      console.warn('[adminHubService] Backend delete tournament fallback:', err.message);
    }
  }

  const idx = db.tournaments.findIndex((x) => String(x.id || x.tournament_id) === String(t.id || t.tournament_id));
  if (idx !== -1) {
    db.tournaments.splice(idx, 1);
  }
  addAudit('tournament', `Tournament deleted: ${t.name || t.tournament_name}`, `By ${session.username || 'Admin'}`);
  db.save();
}

// ── Platform controls (System Control section) ───────────────────
export function setSystemSetting(key, value) {
  const db = getDB();
  db.settings[key] = value;
  db.save();
}

// "Quick Export": download a CSV of users, games, reports or the audit log.
export function exportData(type, auditLog, addAudit, users) {
  const db = getDB();
  const exports = {
    users: users.map((u) => `${u.username},${u.email},${u.role},${u.status}`).join('\n'),
    games: db.games.map((g) => `${g.title},${g.publisher},${g.genre},${g.status}`).join('\n'),
    // Read the real fields, not the id / reporterName / reportedName helpers: rows that came back from the
    // server carry `_rGetters: true` without the helpers, so those read as undefined (old page has this too).
    reports: db.reports.map((r) => {
      const nameOf = (uid) => {
        const u = users.find((x) => String(x.id) === String(uid));
        return u ? (u.user_name || u.username) : 'Unknown';
      };
      return `${r.report_id},${nameOf(r.reported_by)},${nameOf(r.reported_user)},${r.type},${r.status}`;
    }).join('\n'),
    audit: auditLog.map((e) => `${e.at},${e.type},${e.msg},${e.actor}`).join('\n')
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
      run: async (ctx) => {
        for (const u of ctx.users.filter(u => u.status === 'banned')) await ctx.setStatus(u.id, 'active');
        db.bans.forEach((b) => { b.active = false; });
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
