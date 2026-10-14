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
        (g.game_approval_status === 'approved' || g.status === 'approved')
    );
  },

  getPublisherTournaments(userId) {
    const db = getDatabase();
    const uidStr = String(userId);
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

  saveSingleTournament(tournamentData, editId, userId) {
    const db = getDatabase();
    db.tournaments = db.tournaments || [];
    const uid = parseInt(userId, 10);

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
      const newId = db.tournaments.length
        ? Math.max(...db.tournaments.map((t) => parseInt(t.tournament_id || t.id, 10) || 0)) + 1
        : 1;

      db.tournaments.push({
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
        organizer: uid
      });
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

  deleteSingleTournament(tournamentId) {
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

  startSingleTournament(tournamentId) {
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.generateBracket === 'function') {
      window.DB.generateBracket(tournamentId);
      if (typeof window.DB.save === 'function') window.DB.save();
      return true;
    }
    throw new Error('Bracket generation requires DB engine');
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
  }
};

export default publisherService;


