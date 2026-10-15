import api from './api';

const DB_KEY = 'playcarys_db_store_v5';

const GAME_ASSETS = {
  COLORS: [
    'linear-gradient(135deg,#1a3a2a,#0d2a1a)',
    'linear-gradient(135deg,#1a1a3a,#0d0d2a)',
    'linear-gradient(135deg,#3a1a1a,#2a0d0d)',
    'linear-gradient(135deg,#1a2a3a,#0d1a2a)',
    'linear-gradient(135deg,#3a2a1a,#2a1a0d)'
  ],
  IMG_MAP: {
    call_of_duty: '/images/cod_beta.png',
    deadshot: '/images/deadshot.png',
    carrom: '/images/carrom.png',
    horror_escape: '/images/horror_escape.png',
    f1_2022: '/images/f1_2022.png',
    pubg_lite: '/images/pubg_lite.png',
    chess: '/images/chess.png',
    hill_climbing: '/images/hill_climbing.png',
    candy_crush: '/images/candy_crush.png',
    hexgl: '/images/hexgl.jpg',
    game_2048: '/images/game_2048.png',
    hextris: '/images/hextris.png',
    ancient_beast: '/images/ancient_beast.png'
  },
  EMOJI_MAP: {
    call_of_duty: '🔫',
    deadshot: '🎯',
    carrom: '🎲',
    horror_escape: '👻',
    f1_2022: '🏎️',
    pubg_lite: '🪂',
    chess: '♟️',
    hill_climbing: '🚙',
    candy_crush: '🍬',
    hexgl: '🛸',
    game_2048: '🔢',
    hextris: '⬡',
    ancient_beast: '🐉'
  }
};

export function getDatabase() {
  if (typeof window !== 'undefined' && window.DB && window.DB.games) {
    return window.DB;
  }

  // Fallback to localStorage if window.DB is not yet attached
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load DB from localStorage', e);
  }

  return {
    users: [],
    publisher_profiles: [],
    games: [],
    tournaments: [],
    matches: [],
    telemetry: [],
    live_events: []
  };
}

export function formatDate(dateString) {
  if (!dateString) return 'Unknown Date';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'Unknown Date';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

export function getGameVisualInfo(game, index = 0) {
  const imgKey = game.img || '';
  const imgSrc =
    imgKey.startsWith('data:image/') || imgKey.startsWith('http')
      ? imgKey
      : GAME_ASSETS.IMG_MAP[imgKey] || null;
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const bgColor = GAME_ASSETS.COLORS[index % GAME_ASSETS.COLORS.length];

  return {
    imgSrc,
    emoji,
    bgColor,
    title: game.title || game.game_name || 'Game'
  };
}

export function getStatusBadgeData(status) {
  const map = {
    pending: { className: 'badge-pending', label: 'Pending' },
    'under-review': { className: 'badge-review', label: 'Under Review' },
    resolved: { className: 'badge-resolved', label: 'Resolved' },
    approved: { className: 'badge-approved', label: 'Approved' },
    rejected: { className: 'badge-rejected', label: 'Rejected' },
    banned: { className: 'badge-banned', label: 'Banned' },
    active: { className: 'badge-active', label: 'Active' },
    waiting: { className: 'badge-waiting', label: 'Waiting' },
    'in-progress': { className: 'badge-progress', label: 'In Progress' },
    upcoming: { className: 'badge-upcoming', label: 'Upcoming' },
    completed: { className: 'badge-approved', label: 'Completed' },
    player: { className: 'badge-player', label: 'Player' },
    publisher: { className: 'badge-publisher', label: 'Publisher' },
    moderator: { className: 'badge-moderator', label: 'Moderator' },
    admin: { className: 'badge-admin', label: 'Admin' },
    enabled: { className: 'badge-enabled', label: 'Enabled' },
    disabled: { className: 'badge-disabled', label: 'Disabled' }
  };

  const key = String(status || '').toLowerCase();
  return map[key] || { className: 'badge-active', label: String(status || '') };
}

export const publisherService = {
  getDashboardData(userId) {
    const db = getDatabase();
    const uidStr = String(userId);

    const pubUser = (db.users || []).find(
      (u) => String(u.id || u.user_id) === uidStr
    );
    const pubProf = (db.publisher_profiles || []).find(
      (p) => String(p.user_id) === uidStr
    );

    const myGames = (db.games || []).filter(
      (g) => String(g.game_publisher || g.publisherId) === uidStr
    );
    const approved = myGames.filter(
      (g) => g.game_approval_status === 'approved' || g.status === 'approved'
    );
    const pending = myGames.filter(
      (g) => g.game_approval_status === 'pending' || g.status === 'pending'
    );
    const live = myGames.filter(
      (g) => (g.game_status || (g.enabled ? 'enabled' : 'disabled')) === 'enabled'
    );

    const totalViews = myGames.reduce((s, g) => s + (g.views || 0), 0);
    const totalSessions = myGames.reduce((s, g) => s + (g.sessions || 0), 0);
    const revenuePcp = pubProf?.revenue_pcp || 0;

    const myTournaments = (db.tournaments || []).filter(
      (t) => String(t.organizer || t.publisher_id) === uidStr
    );

    // Compute session counts by day from matches
    const sessionsByDay = {};
    (db.matches || []).forEach((s) => {
      const g = (db.games || []).find(
        (gx) => String(gx.game_id || gx.id) === String(s.game_id || s.gameId)
      );
      if (g && String(g.game_publisher || g.publisherId) === uidStr) {
        const rawDate = s.created_at || s.start_time;
        if (rawDate) {
          const d = new Date(rawDate).toISOString().split('T')[0];
          sessionsByDay[d] = (sessionsByDay[d] || 0) + 1;
        }
      }
    });

    const HILL_CLIMBING_ID = 8;
    const hasHillClimbing = myGames.some((g) => Number(g.game_id) === HILL_CLIMBING_ID);

    return {
      pubUser,
      pubProf,
      myGames,
      approved,
      pending,
      liveCount: live.length,
      totalViews,
      totalSessions,
      revenuePcp,
      myTournaments,
      sessionsByDay,
      hasHillClimbing
    };
  },

  async getEarnings(userId) {
    return api.get(`/economy/publishers/${userId}/earnings`);
  },

  fireLiveEvent(gameId, eventCode) {
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.fireLiveEvent === 'function') {
      window.DB.fireLiveEvent(gameId, eventCode);
      return true;
    }

    // Direct fallback
    try {
      const db = getDatabase();
      if (!db.live_events) db.live_events = [];
      db.live_events.push({
        id: Date.now(),
        gameId,
        eventCode,
        active: true,
        time: new Date().toISOString()
      });
      if (db.live_events.length > 20) db.live_events.shift();
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error('Failed to fire live event', e);
      return false;
    }
  },

  getTelemetry(gameId = 8) {
    const db = getDatabase();
    const tel = db.telemetry || [];
    return tel.filter((t) => t.gameId === gameId).slice(-8);
  },

  getGenres() {
    const db = getDatabase();
    if (db.genres && db.genres.length > 0) {
      return db.genres.map((g) => g.name || g);
    }
    return ['FPS', 'Puzzle', 'Horror', 'Racing', 'Battle Royale', 'Board'];
  },

  checkTitleExists(title) {
    const db = getDatabase();
    const titleLower = String(title || '').trim().toLowerCase();
    return (db.games || []).some(
      (g) => String(g.game_name || g.title || '').trim().toLowerCase() === titleLower
    );
  },

  getNextGameId() {
    const db = getDatabase();
    const games = db.games || [];
    if (games.length === 0) return 1;
    return Math.max(...games.map((g) => parseInt(g.game_id || g.id, 10) || 0)) + 1;
  },

  async saveGameRecord(newGame, session) {
    const db = getDatabase();
    db.games = db.games || [];
    db.games.push(newGame);

    db.activityLog = db.activityLog || [];
    db.activityLog.unshift({
      type: 'approval',
      msg: `${newGame.game_name} submitted for approval`,
      time: 'just now'
    });

    if (typeof window !== 'undefined' && typeof window.dispatchRoleNotification === 'function') {
      window.dispatchRoleNotification(
        'admin',
        session.role,
        session.username,
        `submitted a new game for review: <b>${newGame.game_name}</b>.`
      );
      if (session.role !== 'superuser') {
        window.dispatchRoleNotification(
          'superuser',
          session.role,
          session.username,
          `submitted a new game for review: <b>${newGame.game_name}</b>.`
        );
      }
    }

    // Persist via window.DB.save or localStorage / API
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
      try {
        await window.DB.save();
      } catch (e) {
        console.warn('DB.save error:', e);
      }
    } else {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
        fetch(`${api.getBaseUrl()}/db-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ games: db.games, activityLog: db.activityLog })
        }).catch(() => {});
      } catch (err) {
        console.warn('Storage fallback save error:', err);
      }
    }

    return newGame;
  },

  async updateGamePlayPath(gameId, playPath) {
    const db = getDatabase();
    const g = (db.games || []).find((x) => Number(x.game_id || x.id) === Number(gameId));
    if (g) {
      g.play_path = playPath;
      g.playPath = playPath;
    }
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
      try {
        await window.DB.save();
      } catch (e) {}
    } else {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      } catch (e) {}
    }
  },

  async uploadBundle(gameId, publisherId, file) {
    const form = new FormData();
    form.append('bundle', file);
    form.append('publisher_id', String(publisherId));

    const headers = {};
    const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    headers['role'] = 'publisher';

    const res = await fetch(`${api.getBaseUrl()}/games/${gameId}/bundle`, {
      method: 'POST',
      headers,
      body: form
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        msg = body.message || msg;
      } catch (e) {}
      throw new Error(msg || `Upload failed with status ${res.status}`);
    }

    return await res.json();
  },

  async submitAchievements(gameId, publisherId, achievementsList) {
    if (!achievementsList || achievementsList.length === 0) {
      return { created: 0, failed: [] };
    }

    let created = 0;
    const failed = [];

    for (const a of achievementsList) {
      try {
        await api.post(`/games/${gameId}/achievements`, {
          ...a,
          publisher_id: publisherId
        });
        created++;
      } catch (err) {
        failed.push(`${a.code}: ${err.message || 'Server error'}`);
      }
    }

    return { created, failed };
  },

  getPublisherApprovedGames(userId) {
    const db = getDatabase();
    const uidStr = String(userId);
    return (db.games || []).filter(
      (g) =>
        String(g.game_publisher || g.publisherId) === uidStr &&
        (g.game_approval_status === 'approved' || g.status === 'approved') &&
        (g.game_status || 'enabled') === 'enabled'
    );
  },

  async getPublisherTournaments(userId) {
    const uidStr = String(userId);
    try {
      const all = await api.get('/tournaments?includePrivate=true');
      if (Array.isArray(all)) {
        return all.filter(
          (t) => String(t.organizer || t.publisher_id) === uidStr && t.type !== 'multi'
        );
      }
    } catch (e) {
      console.warn('[Tournament Hub] Backend fetch failed, falling back to local DB:', e.message);
    }
    const db = getDatabase();
    return (db.tournaments || []).filter(
      (t) => String(t.organizer || t.publisher_id) === uidStr && t.type !== 'multi'
    );
  },

  async fetchMyFests(userId) {
    try {
      const all = await api.get('/tournaments?includePrivate=true');
      const uidStr = String(userId);
      return (all || []).filter(
        (t) => t.type === 'multi' && String(t.organizer) === uidStr
      );
    } catch (e) {
      console.warn('[Tournament Hub] Could not reach backend for multi-game fests:', e.message);
      return [];
    }
  },

  async createMultiGameFest(payload) {
    return await api.post('/tournaments', payload);
  },

  async saveSingleTournament(tournamentData, editId, userId) {
    const uid = parseInt(userId, 10);
    let result = null;

    if (editId) {
      const payload = {
        tournament_name: tournamentData.name,
        desc: tournamentData.desc,
        prize: tournamentData.prize,
        maxParticipants: parseInt(tournamentData.maxParticipants, 10) || 32,
        start_date: tournamentData.startDate,
        end_date: tournamentData.endDate,
        regClose: tournamentData.regClose,
        visibility: tournamentData.visibility || 'public'
      };
      try {
        result = await api.patch(`/tournaments/${editId}`, payload);
      } catch (e) {
        console.warn('[Tournament Hub] Backend update failed, updating local DB:', e.message);
      }
    } else {
      const payload = {
        organizer: uid,
        organizer_role: 'publisher',
        type: 'single',
        game_id: parseInt(tournamentData.gameId, 10),
        tournament_name: tournamentData.name,
        desc: tournamentData.desc,
        prize: tournamentData.prize,
        maxParticipants: parseInt(tournamentData.maxParticipants, 10) || 32,
        start_date: tournamentData.startDate,
        end_date: tournamentData.endDate,
        regClose: tournamentData.regClose,
        visibility: tournamentData.visibility || 'public'
      };
      result = await api.post('/tournaments', payload);
    }

    // Also sync local in-memory DB for backwards compatibility with any remaining legacy scripts
    try {
      const db = getDatabase();
      db.tournaments = db.tournaments || [];
      const newId = result?.tournament_id || (editId ? parseInt(editId, 10) : (db.tournaments.length ? Math.max(...db.tournaments.map((t) => parseInt(t.tournament_id || t.id, 10) || 0)) + 1 : 1));

      if (editId) {
        const t = db.tournaments.find((x) => String(x.tournament_id || x.id) === String(editId));
        if (t) {
          t.tournament_name = tournamentData.name;
          t.name = tournamentData.name;
          t.desc = tournamentData.desc;
          t.prize = tournamentData.prize;
          t.maxParticipants = parseInt(tournamentData.maxParticipants, 10) || 32;
          t.regClose = tournamentData.regClose;
          t.start_date = tournamentData.startDate;
          t.startDate = tournamentData.startDate;
          t.end_date = tournamentData.endDate;
          t.game_id = parseInt(tournamentData.gameId, 10);
        }
      } else {
        const item = {
          tournament_id: newId,
          id: newId,
          game_id: parseInt(tournamentData.gameId, 10),
          tournament_name: tournamentData.name,
          name: tournamentData.name,
          desc: tournamentData.desc,
          prize: tournamentData.prize,
          maxParticipants: parseInt(tournamentData.maxParticipants, 10) || 32,
          participants: 0,
          status: 'upcoming',
          start_date: tournamentData.startDate,
          startDate: tournamentData.startDate,
          end_date: tournamentData.endDate,
          regClose: tournamentData.regClose,
          organizer: uid,
          visibility: tournamentData.visibility || 'public',
          type: 'single'
        };
        db.tournaments.push(item);
      }

      if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
        window.DB.save();
      } else {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      }
    } catch (err) {
      console.warn('Local DB sync warning:', err);
    }

    return result;
  },

  async deleteSingleTournament(tournamentId) {
    try {
      await api.delete(`/tournaments/${tournamentId}`);
    } catch (e) {
      console.warn('[Tournament Hub] Backend delete failed:', e.message);
    }

    const db = getDatabase();
    const idStr = String(tournamentId);

    if (!db.deleted_tournaments) db.deleted_tournaments = [];
    if (!db.deleted_tournaments.includes(idStr)) db.deleted_tournaments.push(idStr);

    const tIdx = (db.tournaments || []).findIndex(
      (x) => String(x.tournament_id || x.id) === idStr
    );
    if (tIdx !== -1) {
      db.tournaments.splice(tIdx, 1);
    }

    if (db.tournament_matches) {
      for (let i = db.tournament_matches.length - 1; i >= 0; i--) {
        if (String(db.tournament_matches[i].tournamentId) === idStr) {
          db.tournament_matches.splice(i, 1);
        }
      }
    }

    if (db.player_tournament) {
      for (let i = db.player_tournament.length - 1; i >= 0; i--) {
        if (String(db.player_tournament[i].tournament_id) === idStr) {
          db.player_tournament.splice(i, 1);
        }
      }
    }

    if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
      try {
        window.DB.save();
      } catch (e) {}
    } else {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      } catch (e) {}
    }
  },

  async getTournamentDetails(id) {
    try {
      return await api.get(`/tournaments/${id}`);
    } catch (e) {
      const db = getDatabase();
      const t = (db.tournaments || []).find((x) => String(x.tournament_id || x.id) === String(id));
      if (t) return t;
      throw e;
    }
  },

  async getTournamentBracket(id) {
    try {
      const data = await api.get(`/tournaments/${id}/bracket`);
      return data;
    } catch (e) {
      const db = getDatabase();
      const matches = (db.tournament_matches || []).filter(
        (m) => String(m.tournamentId) === String(id)
      );
      return { tournament_id: id, format: 'bracket', matches };
    }
  },

  async startSingleTournament(tournamentId, organizerId) {
    try {
      return await api.post(`/tournaments/${tournamentId}/start`, {
        organizer_id: parseInt(organizerId, 10)
      });
    } catch (e) {
      console.warn('[Tournament Hub] Backend start failed, falling back to local DB:', e.message);
      if (typeof window !== 'undefined' && window.DB && typeof window.DB.generateBracket === 'function') {
        window.DB.generateBracket(tournamentId);
        if (typeof window.DB.save === 'function') window.DB.save();
        return { message: 'Tournament started locally' };
      }
      throw e;
    }
  },

  advanceSingleTournamentRound(tournamentId) {
    const db = getDatabase();
    const t = (db.tournaments || []).find(
      (x) => String(x.tournament_id || x.id) === String(tournamentId)
    );
    if (!t) throw new Error('Tournament not found.');

    const matches = (db.tournament_matches || []).filter(
      (m) => String(m.tournamentId) === String(tournamentId)
    );
    if (!matches.length) throw new Error('No bracket yet — start the tournament first.');

    const round = t.currentRound || 1;
    const thisRound = matches.filter((m) => Number(m.round) === Number(round));
    if (!thisRound.length) throw new Error(`Round ${round} has no matches.`);

    const pending = thisRound.filter((m) => m.status !== 'completed');
    if (pending.length) {
      throw new Error(
        `${pending.length} match${pending.length > 1 ? 'es' : ''} in Round ${round} still need a winner.`
      );
    }

    const nextRound = matches.filter((m) => Number(m.round) === Number(round) + 1);
    if (!nextRound.length) {
      t.status = 'completed';
      if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
        window.DB.save();
      } else {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      }
      return { completed: true };
    }

    t.currentRound = round + 1;
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
      window.DB.save();
    } else {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
    return { completed: false, nextRound: round + 1 };
  },

  forceMatchWinner(matchId, winnerId, p1Id) {
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.advanceMatch === 'function') {
      window.DB.advanceMatch(
        matchId,
        winnerId,
        String(winnerId) === String(p1Id) ? 1 : 0,
        String(winnerId) !== String(p1Id) ? 1 : 0
      );
      if (typeof window.DB.save === 'function') window.DB.save();
      return true;
    }
    return false;
  },

  async getFestDetails(id) {
    const [t, stages, overall] = await Promise.all([
      api.get(`/tournaments/${id}`),
      api.get(`/tournaments/${id}/stages`),
      api.get(`/tournaments/${id}/overall-leaderboard`)
    ]);
    return { t, stages, overall };
  },

  async startFestStage(tournamentId, stageId, organizerId) {
    return await api.post(`/tournaments/${tournamentId}/stages/${stageId}/start`, {
      organizer_id: parseInt(organizerId, 10)
    });
  },

  async completeFestStage(tournamentId, stageId, organizerId) {
    return await api.post(`/tournaments/${tournamentId}/stages/${stageId}/complete`, {
      organizer_id: parseInt(organizerId, 10)
    });
  },

  // ── My Games Methods ──────────────────────────────────────────

  fmtViews(v) {
    const num = Number(v) || 0;
    return num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toLocaleString('en-IN');
  },

  async getPublisherGames(userId) {
    const uidStr = String(userId);
    let backendGames = null;
    try {
      backendGames = await api.get(`/games?publisherId=${userId}`);
    } catch (e) {
      console.warn('[MyGames] Backend fetch failed, falling back to local DB:', e.message);
    }

    const db = getDatabase();
    if (Array.isArray(backendGames)) {
      // Sync local DB games collection with latest backend games
      if (!Array.isArray(db.games)) db.games = [];
      backendGames.forEach((bg) => {
        const idx = db.games.findIndex((g) => String(g.game_id || g.id) === String(bg.game_id || bg.id));
        if (idx !== -1) {
          db.games[idx] = { ...db.games[idx], ...bg };
        } else {
          db.games.push(bg);
        }
      });
      return backendGames;
    }

    return (db.games || []).filter(
      (g) => String(g.game_publisher || g.publisherId) === uidStr
    );
  },

  async updateGameMetadata(gameId, dto, publisherId) {
    return await api.patch(`/games/${gameId}`, {
      publisher_id: parseInt(publisherId, 10),
      ...dto
    });
  },

  async setGameState(gameId, status, publisherId) {
    return await api.patch(`/games/${gameId}/state`, {
      publisher_id: parseInt(publisherId, 10),
      game_status: status
    });
  },

  async saveGameEdit(gameId, editData, publisherId) {
    const pid = parseInt(publisherId, 10);
    const gid = parseInt(gameId, 10);
    const db = getDatabase();
    const g = (db.games || []).find((x) => String(x.game_id || x.id) === String(gameId));

    // 1. Update metadata in backend
    await this.updateGameMetadata(
      gid,
      {
        game_name: editData.title,
        desc: editData.description,
        game_type: editData.genre,
        players: `${editData.minPlayers}-${editData.maxPlayers}`
      },
      pid
    );

    // 2. If approved and enabled state changed, update state in backend
    const currentStatus = g?.game_approval_status || g?.status;
    const currentEnabled = g ? (g.game_status === 'enabled' || !!g.enabled) : false;
    const nextEnabled = !!editData.enabled;

    if (currentStatus === 'approved' && currentEnabled !== nextEnabled) {
      await this.setGameState(gid, nextEnabled ? 'enabled' : 'disabled', pid);
    }

    // 3. Update local DB record and sync via db-import
    if (g) {
      g.game_name = editData.title;
      g.title = editData.title;
      g.desc = editData.description;
      g.game_type = editData.genre;
      g.genre = editData.genre;
      g.players = `${editData.minPlayers}-${editData.maxPlayers}`;
      g.game_status = nextEnabled ? 'enabled' : 'disabled';
      g.enabled = nextEnabled;
      g.maintenance = !!editData.maintenance;

      if (currentStatus === 'rejected') {
        g.game_approval_status = 'pending';
        g.status = 'pending';
        g.game_status = 'disabled';
        g.enabled = false;
      }
    }

    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
        await window.DB.save();
      } else {
        const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
        await fetch(`${api.getBaseUrl()}/db-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ games: db.games, activityLog: db.activityLog || [] })
        });
      }
    } catch (syncErr) {
      console.warn('Sync error on game edit:', syncErr);
    }

    return g;
  },

  async deleteGame(gameId, publisherId) {
    const gidStr = String(gameId);
    const db = getDatabase();

    // Splice from local DB games
    if (!Array.isArray(db.deleted_games)) db.deleted_games = [];
    const idx = (db.games || []).findIndex(
      (g) => String(g.game_id || g.id) === gidStr
    );
    if (idx !== -1) {
      db.games.splice(idx, 1);
    }

    // Push tombstone
    if (!db.deleted_games.some((d) => String(d?.game_id ?? d?.id ?? d) === gidStr)) {
      db.deleted_games.push({ game_id: gidStr, deleted_at: new Date().toISOString() });
    }

    // Call window.DB.deleteGame if available
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.deleteGame === 'function') {
      try {
        window.DB.deleteGame(gameId);
      } catch (e) {}
    }

    // Synchronize to backend via db-import
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
        await window.DB.save();
      } else {
        const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
        await fetch(`${api.getBaseUrl()}/db-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            games: db.games,
            deleted_games: db.deleted_games
          })
        });
      }
    } catch (e) {
      console.warn('Deletion sync warning:', e);
    }

    return true;
  },

  getGameAnalytics(gameId) {
    const db = getDatabase();
    const gid = String(gameId);
    const game = (db.games || []).find((g) => String(g.game_id || g.id) === gid) || null;
    const tourns = (db.tournaments || []).filter(
      (t) => String(t.gameId || t.game_id) === gid
    );
    const matches = (db.matches || []).filter(
      (m) => String(m.game_id || m.gameId) === gid
    );
    const revPerSession = 15;
    const sessionCount = game?.sessions || matches.length;
    const estRevenue = sessionCount * revPerSession;

    return {
      game,
      tourns,
      matches,
      sessionCount,
      estRevenue
    };
  },

  // ── Profile Methods ───────────────────────────────────────────

  async getPublisherFullProfile(userId) {
    const uid = parseInt(userId, 10);
    const uidStr = String(userId);
    const db = getDatabase();

    // 1. Fetch user & publisher profile from backend API where possible
    let backendUser = null;
    let backendProfile = null;
    try {
      [backendUser, backendProfile] = await Promise.all([
        api.get(`/users/${uid}`).catch(() => null),
        api.get(`/publisher-profiles/${uid}`).catch(() => null)
      ]);
    } catch (e) {
      console.warn('[Profile] Failed to fetch backend profile:', e.message);
    }

    const localUser = (db.users || []).find((u) => String(u.id || u.user_id) === uidStr);
    const localProfile = (db.publisher_profiles || []).find((p) => String(p.user_id) === uidStr);

    const mergedUser = {
      ...(localUser || {}),
      ...(backendUser || {})
    };
    const mergedProfile = {
      ...(localProfile || {}),
      ...(backendProfile || {})
    };

    // Calculate game stats
    const games = (db.games || []).filter(
      (g) => String(g.game_publisher || g.publisherId) === uidStr
    );
    const totalGames = games.length;
    const approvedGames = games.filter(
      (g) => g.game_approval_status === 'approved' || g.status === 'approved'
    ).length;
    const activeGames = games.filter(
      (g) => g.game_status === 'enabled' || g.enabled
    ).length;

    const totalViews = games.reduce((sum, g) => sum + (g.views || 0), 0);
    const totalSessions = games.reduce((sum, g) => sum + (g.sessions || 0), 0);
    const avgRating = games.length
      ? (games.reduce((sum, g) => sum + (g.rating || 0), 0) / games.length).toFixed(1)
      : 'N/A';

    const tournaments = (db.tournaments || []).filter(
      (t) => String(t.organizer || t.publisher_id) === uidStr
    );
    const tournamentsHosted = tournaments.length;

    const revenuePcp = mergedProfile?.revenue_pcp || 0;
    const joinDate = mergedUser.joinDate || mergedProfile.founded || '2024-01-01';
    const status = mergedUser.status || 'active';

    // Presence check
    let presence = { state: 'offline', label: 'Offline' };
    if (typeof window !== 'undefined' && window.Presence && typeof window.Presence.statusOf === 'function') {
      presence = window.Presence.statusOf(mergedUser);
    } else if (status === 'active') {
      presence = { state: 'online', label: 'Online' };
    }

    return {
      user: mergedUser,
      profile: mergedProfile,
      totalGames,
      approvedGames,
      activeGames,
      totalViews,
      totalSessions,
      avgRating,
      tournamentsHosted,
      revenuePcp,
      joinDate,
      status,
      presence
    };
  },

  async updatePublisherProfile(userId, updateData) {
    const uid = parseInt(userId, 10);
    const uidStr = String(userId);
    const db = getDatabase();

    const newStudioName = updateData.studioName.trim();
    const newEmail = updateData.email.trim();
    let rawPhone = updateData.phone.trim();
    if (rawPhone && rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1);
    const newPhone = rawPhone.startsWith('+') ? rawPhone : ('+' + rawPhone).replace('++', '+');

    // 1. Uniqueness check for Studio Name / Username
    const existingUserWithName = (db.users || []).find(
      (u) =>
        (u.username || u.user_name || '').toLowerCase() === newStudioName.toLowerCase() &&
        String(u.id || u.user_id) !== uidStr
    );
    if (existingUserWithName) {
      throw new Error('Studio name already taken');
    }

    // 2. Uniqueness check for Email within publisher role
    const existingUserWithEmail = (db.users || []).find(
      (u) =>
        (u.email || '').toLowerCase() === newEmail.toLowerCase() &&
        Number(u.role_id) === 5 &&
        String(u.id || u.user_id) !== uidStr
    );
    if (existingUserWithEmail) {
      throw new Error('Another studio account already uses this email');
    }

    // 3. Update local user record
    const targetUser = (db.users || []).find((u) => String(u.id || u.user_id) === uidStr);
    const newAvatar = newStudioName.slice(0, 2).toUpperCase();

    if (targetUser) {
      targetUser.user_name = newStudioName;
      targetUser.username = newStudioName;
      targetUser.email = newEmail;
      targetUser.phone_number = newPhone;
      targetUser.phone = newPhone;
      targetUser.avatar = newAvatar;
      if (updateData.password && updateData.password.trim()) {
        targetUser.password = updateData.password.trim();
      }
    }

    // 4. Update publisher profile record
    let targetProfile = (db.publisher_profiles || []).find((p) => String(p.user_id) === uidStr);
    if (targetProfile) {
      targetProfile.studio_name = newStudioName;
    } else {
      targetProfile = {
        user_id: uid,
        studio_name: newStudioName,
        total_games: 0,
        approved_games: 0,
        active_games: 0,
        revenue_pcp: 0,
        founded: new Date().toISOString().split('T')[0]
      };
      if (!Array.isArray(db.publisher_profiles)) db.publisher_profiles = [];
      db.publisher_profiles.push(targetProfile);
    }

    // 5. Persist to backend and storage
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      if (typeof window !== 'undefined' && window.DB && typeof window.DB.save === 'function') {
        await window.DB.save();
      } else {
        const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
        await fetch(`${api.getBaseUrl()}/db-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            users: db.users,
            publisher_profiles: db.publisher_profiles
          })
        });
      }
    } catch (err) {
      console.warn('Backend sync warning on profile update:', err);
    }

    return {
      updatedUser: targetUser,
      updatedProfile: targetProfile
    };
  }
};

export default publisherService;



