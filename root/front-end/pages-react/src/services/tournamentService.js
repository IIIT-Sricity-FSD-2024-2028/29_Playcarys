import api from './api';
import { getDatabase, saveDatabase, sameId } from './playerService';

export const KIND_LABEL = {
  all: '🎮 All',
  official: '🏢 Official',
  casual: '🎲 Casual',
  community: '🛡️ Community'
};

export function kindOf(t, db) {
  if (!t) return 'casual';
  if (t.kind) return t.kind;
  const organizerId = t.organizer || t.organizer_id;
  const role = t.organizer_role || (db.users || []).find((u) => sameId(u.user_id || u.id, organizerId))?.role;
  if (role === 'publisher') return 'official';
  if (t.group_id != null) return 'community';
  return 'casual';
}

export function myTeams(userId, db) {
  const uid = String(userId);
  return (db.teams || []).filter((tm) => (tm.member_ids || []).some((m) => sameId(m, uid)));
}

export function myTeamsIn(t, userId, db) {
  const tid = String(t.tournament_id || t.id);
  const entered = new Set(
    (db.team_tournament || [])
      .filter((r) => sameId(r.tournament_id, tid))
      .map((r) => String(r.team_id))
  );
  return myTeams(userId, db).filter((tm) => entered.has(String(tm.team_id)));
}

export function isRegistered(t, userId, db) {
  if (!t) return false;
  if (t.team_size) {
    return myTeamsIn(t, userId, db).length > 0;
  }
  const uid = String(userId);
  const players = t.registeredPlayers || t.registered_player_ids || [];
  if (players.map(String).includes(uid)) return true;
  if (db && Array.isArray(db.player_tournament)) {
    const tid = t.tournament_id || t.id;
    return db.player_tournament.some(
      (pt) => sameId(pt.player_id, uid) && sameId(pt.tournament_id, tid)
    );
  }
  return false;
}

export function entrantCount(t, db) {
  if (!t) return 0;
  if (t.team_size) {
    const tid = String(t.tournament_id || t.id);
    return (db?.team_tournament || []).filter((r) => sameId(r.tournament_id, tid)).length;
  }
  if (t.participants != null && t.participants > 0) {
    return t.participants;
  }
  const players = t.registeredPlayers || t.registered_player_ids || [];
  if (players.length > 0) return players.length;
  if (db && Array.isArray(db.player_tournament)) {
    const tid = t.tournament_id || t.id;
    return db.player_tournament.filter((pt) => sameId(pt.tournament_id, tid)).length;
  }
  return 0;
}

export function entrantName(t, slot, db) {
  if (slot == null) return 'TBD';
  if (String(slot) === 'BYE') return 'BYE';
  if (t && t.team_size) {
    const team = (db.teams || []).find((x) => sameId(x.team_id, slot));
    return team ? team.name : `Team ${slot}`;
  }
  const user = (db.users || []).find((u) => sameId(u.id || u.user_id, slot));
  return user?.user_name || user?.username || String(slot);
}

export function seedOf(uid, db) {
  const sorted = [...(db.player_profiles || [])].sort(
    (a, b) => (b.carys_points || 0) - (a.carys_points || 0)
  );
  const idx = sorted.findIndex((p) => sameId(p.user_id, uid));
  return idx >= 0 ? idx + 1 : '—';
}

export function pcpOf(uid, db) {
  const prof = (db.player_profiles || []).find((p) => sameId(p.user_id, uid));
  return prof?.carys_points || 0;
}

export function dropLocalRows(table, matches) {
  const db = getDatabase();
  if (Array.isArray(db[table])) {
    for (let i = db[table].length - 1; i >= 0; i--) {
      if (matches(db[table][i])) {
        db[table].splice(i, 1);
      }
    }
  }
  saveDatabase(db);
}

export const tournamentService = {
  getTournaments() {
    const db = getDatabase();
    return db.tournaments || [];
  },

  getTournament(id) {
    const db = getDatabase();
    return (db.tournaments || []).find((t) => sameId(t.id || t.tournament_id, id)) || null;
  },

  async registerSolo(tournamentId, userId, inviteCode) {
    const uid = parseInt(userId, 10);
    const tid = encodeURIComponent(tournamentId);
    const body = { player_id: uid };
    if (inviteCode && inviteCode.trim()) {
      body.invite_code = inviteCode.trim().toUpperCase();
    }
    const res = await api.post(`/tournaments/${tid}/register`, body);

    // Update local DB
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.id || x.tournament_id, tournamentId));
    if (t) {
      if (!t.registeredPlayers) t.registeredPlayers = [];
      if (!t.registered_player_ids) t.registered_player_ids = [];
      const uidStr = String(userId);
      if (!t.registeredPlayers.includes(uidStr)) {
        t.registeredPlayers.push(uidStr);
      }
      if (!t.registered_player_ids.includes(uid)) {
        t.registered_player_ids.push(uid);
      }
      t.participants = (t.participants || 0) + 1;
    }
    if (!db.player_tournament) db.player_tournament = [];
    db.player_tournament.push({
      player_id: uid,
      tournament_id: t?.tournament_id || parseInt(tournamentId, 10),
      registered_at: new Date().toISOString()
    });
    saveDatabase(db);

    return res;
  },

  async registerTeam(tournamentId, teamId, userId) {
    const uid = parseInt(userId, 10);
    const tid = encodeURIComponent(tournamentId);
    const res = await api.post(`/teams/${teamId}/register/${tid}?requesterId=${uid}`, {});

    // Update local DB
    const db = getDatabase();
    if (!db.team_tournament) db.team_tournament = [];
    db.team_tournament.push({
      team_id: parseInt(teamId, 10),
      tournament_id: parseInt(tournamentId, 10),
      registered_at: new Date().toISOString()
    });
    saveDatabase(db);

    return res;
  },

  async withdraw(t, userId) {
    if (!t) throw new Error('No tournament specified for withdrawal.');
    const tid = t.tournament_id || t.id;
    if (!tid) throw new Error('Tournament ID is missing.');
    const db = getDatabase();
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) throw new Error('Player ID is missing.');

    if (t.team_size) {
      const team = myTeamsIn(t, userId, db)[0];
      if (!team) throw new Error('No team found for withdrawal');
      if (String(team.captain_id) !== String(userId)) {
        throw new Error(`Only ${team.name}'s captain can withdraw the team.`);
      }
      await api.del(`/teams/${team.team_id}/register/${tid}?requesterId=${uid}`);
      dropLocalRows('team_tournament', (r) => sameId(r.team_id, team.team_id) && sameId(r.tournament_id, tid));
      return { success: true, teamName: team.name };
    } else {
      try {
        await api.del(`/tournaments/${tid}/register/${uid}`);
      } catch (err) {
        // If server confirms player is not registered, sync state with server
        if (err.message && err.message.toLowerCase().includes('not registered')) {
          // Player already unregistered on server, proceed to clean local state
        } else {
          throw err;
        }
      }
      const tItem = (db.tournaments || []).find((x) => sameId(x.id || x.tournament_id, tid));
      if (tItem) {
        if (tItem.registeredPlayers) {
          tItem.registeredPlayers = tItem.registeredPlayers.filter((p) => !sameId(p, userId));
        }
        if (tItem.registered_player_ids) {
          tItem.registered_player_ids = tItem.registered_player_ids.filter((p) => !sameId(p, userId));
        }
        if (typeof tItem.participants === 'number' && tItem.participants > 0) {
          tItem.participants -= 1;
        }
      }
      dropLocalRows('player_tournament', (r) => sameId(r.player_id, uid) && sameId(r.tournament_id, tid));
      saveDatabase(db);
      return { success: true };
    }
  },

  async startTournament(tournamentId, organizerId) {
    const tid = encodeURIComponent(tournamentId);
    const res = await api.post(`/tournaments/${tid}/start`, { organizer_id: parseInt(organizerId, 10) });
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.id || x.tournament_id, tournamentId));
    if (t) {
      t.status = 'in-progress';
      saveDatabase(db);
    }
    return res;
  },

  async fetchLeaderboard(tournamentId) {
    const tid = encodeURIComponent(tournamentId);
    return await api.get(`/tournaments/${tid}/leaderboard`);
  },

  async fetchBracket(tournamentId) {
    const tid = encodeURIComponent(tournamentId);
    return await api.get(`/tournaments/${tid}/bracket`);
  },

  async fetchChat(tournamentId) {
    const tid = encodeURIComponent(tournamentId);
    return await api.get(`/tournaments/${tid}/chat`);
  },

  async sendChat(tournamentId, userId, body) {
    const tid = encodeURIComponent(tournamentId);
    return await api.post(`/tournaments/${tid}/chat`, {
      user_id: parseInt(userId, 10),
      body: String(body || '').trim()
    });
  },

  async enterMatch(tournament, matchId, userId) {
    const tid = tournament.tournament_id || tournament.id;
    const uid = String(userId);

    let tok = null;
    try {
      tok = await api.get(`/tournaments/matches/${encodeURIComponent(matchId)}/token?userId=${uid}`);
    } catch (e) {
      console.info('[Tournament] no match token from API, using fallback launch');
    }

    if (tok && tok.deep_link) {
      window.location.href = tok.deep_link;
      return { success: true };
    }

    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.launch === 'function') {
      const ok = window.GameLaunch.launch(tournament.game_id, {
        mode: 'tournament',
        matchId: matchId,
        tournamentId: tid,
        token: tok ? tok.token : undefined
      });
      if (ok) return { success: true };
      const reason = typeof window.GameLaunch.unplayableReason === 'function'
        ? window.GameLaunch.unplayableReason(tournament.game_id)
        : 'This game could not be launched.';
      return { success: false, reason };
    }

    // Direct game fallback
    const gid = String(tournament.game_id);
    if (gid === '7') {
      window.location.href = `/games/chess/index.html?tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    } else if (gid === '8') {
      window.location.href = `/games/hill_climbing/index.html?tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    } else {
      window.location.href = `/pages/player/play.html?id=${gid}&tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    }
  },

  confirmResult(matchId) {
    const db = getDatabase();
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.confirmResult === 'function') {
      window.DB.confirmResult(matchId);
    }
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      match.status = 'completed';
      saveDatabase(db);
    }
    return true;
  },

  disputeResult(matchId) {
    const db = getDatabase();
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.disputeResult === 'function') {
      window.DB.disputeResult(matchId);
    }
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      match.status = 'disputed';
      saveDatabase(db);
    }
    return true;
  }
};

export default tournamentService;
