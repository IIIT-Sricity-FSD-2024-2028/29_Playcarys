import api from './api';

const DB_KEY = 'playcarys_db_store_v5';

export const GAME_ASSETS = {
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

export const FEAT_BG_MAP = {
  call_of_duty: 'linear-gradient(135deg,#1a0505 0%,#2a0808 40%,#0a0a0a 100%)',
  chess: 'linear-gradient(135deg,#050520 0%,#0d0d2a 40%,#050515 100%)',
  f1_2022: 'linear-gradient(135deg,#200505 0%,#350808 40%,#0a0505 100%)',
  horror_escape: 'linear-gradient(135deg,#050a05 0%,#0a1a0a 40%,#030a03 100%)',
  hill_climbing: 'linear-gradient(135deg,#050a0a 0%,#0a1a0a 40%,#030808 100%)'
};

export const POINT_TIERS = [
  { min: 25000, name: 'Master', color: '#facc15', bg: 'linear-gradient(135deg, #fef08a, #ca8a04)' },
  { min: 10000, name: 'Diamond', color: '#22d3ee', bg: 'linear-gradient(135deg, #67e8f9, #0891b2)' },
  { min: 5000, name: 'Platinum', color: '#a78bfa', bg: 'linear-gradient(135deg, #c4b5fd, #7c3aed)' },
  { min: 2500, name: 'Gold', color: '#fbbf24', bg: 'linear-gradient(135deg, #fde047, #b45309)' },
  { min: 1000, name: 'Silver', color: '#cbd5e1', bg: 'linear-gradient(135deg, #f1f5f9, #64748b)' },
  { min: 250, name: 'Bronze', color: '#d97706', bg: 'linear-gradient(135deg, #fcd34d, #78350f)' },
  { min: 0, name: 'Iron', color: '#6b7280', bg: 'linear-gradient(135deg, #9ca3af, #374151)' }
];

export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

export function getTierFromPoints(points) {
  const pcp = Number(points) || 0;
  return POINT_TIERS.find((t) => pcp >= t.min) || POINT_TIERS[POINT_TIERS.length - 1];
}

export function getDatabase() {
  if (typeof window !== 'undefined' && window.DB && window.DB.games) {
    return window.DB;
  }
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
    player_profiles: [],
    games: [],
    tournaments: [],
    matches: [],
    match_results: [],
    sessions: [],
    friendships: [],
    player_tournament: []
  };
}

let _sentTables = null;
let _pendingSync = null;

export const BUILTIN_GAMES = {
  '7': { slug: 'chess', supportsAi: true, spectator: true },
  '8': { slug: 'hill_climbing', supportsAi: false, spectator: false }
};

export const BUNDLED_GAMES = {
  '16': { slug: 'hexgl-16', play_path: 'games/hexgl-16' },
  '18': { slug: '2048-18', play_path: 'games/2048-18' },
  '19': { slug: 'hextris-19', play_path: 'games/hextris-19' },
  '25': { slug: 'ancient-beast-25', play_path: 'games/ancient-beast-25' }
};

export function saveDatabase(db, skipSync = false) {
  if (typeof window !== 'undefined' && window.DB) {
    try {
      if (typeof window.DB.save === 'function') {
        window.DB.save();
      } else {
        Object.assign(window.DB, db);
      }
    } catch (e) {
      console.warn('window.DB.save error', e);
    }
  }

  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save DB to localStorage', e);
  }

  if (skipSync) {
    const nextSent = {};
    Object.keys(db).forEach((k) => {
      try { nextSent[k] = JSON.stringify(db[k]); } catch (e) {}
    });
    _sentTables = nextSent;
    return Promise.resolve();
  }

  // Two-way sync: push modified tables back to NestJS backend /api/v1/db-import
  const nextSent = {};
  Object.keys(db).forEach((k) => {
    try { nextSent[k] = JSON.stringify(db[k]); } catch (e) {}
  });

  let delta = null;
  if (_sentTables) {
    delta = {};
    let changed = 0;
    Object.keys(nextSent).forEach((k) => {
      if (nextSent[k] !== _sentTables[k]) {
        delta[k] = db[k];
        changed++;
      }
    });
    if (!changed) {
      return Promise.resolve();
    }
  } else {
    delta = {};
    const MUTABLE_TABLES = [
      'users', 'player_profiles', 'games', 'tournaments',
      'player_tournament', 'team_tournament', 'matches', 'match_results',
      'sessions', 'friendships', 'favorites', 'reviews', 'teams', 'groups'
    ];
    MUTABLE_TABLES.forEach((table) => {
      if (db[table] !== undefined) {
        delta[table] = db[table];
      }
    });
  }

  _sentTables = nextSent;

  try {
    _pendingSync = api.post('/db-import', delta)
      .then((res) => {
        _pendingSync = null;
        if (typeof window !== 'undefined') {
          if (window.playcarysSocket && typeof window.playcarysSocket.emit === 'function') {
            window.playcarysSocket.emit('global_db_update');
          }
          window.dispatchEvent(new CustomEvent('global_db_update', { detail: delta }));
        }
        return res;
      })
      .catch((err) => {
        _pendingSync = null;
        console.warn('[PlayCarys] DB sync to backend /db-import failed, cached in localStorage:', err?.message || err);
      });
  } catch (e) {
    _pendingSync = null;
  }

  return _pendingSync;
}

/**
 * Fetch authoritative server state from /db-export and merge it into
 * the local DB cache. Ensures all pages read live backend data rather than
 * stale localStorage on mount.
 *
 * @param {string[]} tables - Optional list of specific tables to fetch
 * @param {number|null} userId - Optional user ID to scope user-private tables
 */
export async function hydrateFromServer(tables = [], userId = null) {
  try {
    let url = '/db-export';
    const params = [];
    if (tables.length > 0) params.push(`tables=${tables.join(',')}`);
    if (userId) params.push(`userId=${userId}`);
    if (params.length > 0) url += '?' + params.join('&');

    const fresh = await api.get(url);
    if (!fresh || typeof fresh !== 'object') return null;

    const db = getDatabase();
    for (const [key, value] of Object.entries(fresh)) {
      if (Array.isArray(value)) {
        if (key === 'games') {
          const freshIds = new Set(value.map((g) => String(g.game_id || g.id)));
          const preservedLocal = (db.games || []).filter(
            (g) => !freshIds.has(String(g.game_id || g.id))
          );
          db.games = [...value, ...preservedLocal];
        } else if (key === 'tournaments') {
          const freshIds = new Set(value.map((t) => String(t.tournament_id || t.id)));
          const preservedLocal = (db.tournaments || []).filter(
            (t) => !freshIds.has(String(t.tournament_id || t.id))
          );
          db.tournaments = [...value, ...preservedLocal];
        } else if (key === 'player_tournament') {
          db.player_tournament = value;
        } else if (key === 'team_tournament') {
          db.team_tournament = value;
        } else if (key === 'favorites') {
          // Only update if server actually returns valid non-empty favorites
          if (Array.isArray(value) && value.length > 0) {
            db.favorites = value;
          }
        } else {
          db[key] = value;
        }
      } else if (value !== null && typeof value === 'object') {
        db[key] = value;
      }
    }
    if (typeof window !== 'undefined' && window.DB) {
      for (const [key, value] of Object.entries(db)) {
        window.DB[key] = value;
      }
    }
    saveDatabase(db, true);
    return fresh;
  } catch (err) {
    console.warn('[playerService] hydrateFromServer failed:', err);
    return null;
  }
}

export const playerService = {
  async fetchServerGames() {
    try {
      const serverGames = await api.get('/games');
      if (serverGames && Array.isArray(serverGames) && serverGames.length > 0) {
        const db = getDatabase();
        db.games = serverGames;
        if (typeof window !== 'undefined' && window.DB) {
          window.DB.games = serverGames;
        }
        saveDatabase(db);
        return serverGames;
      }
    } catch (err) {
      console.warn('Failed to fetch server games:', err);
    }
    return null;
  },

  hasEngine(gameId) {
    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.hasEngine === 'function') {
      try {
        const val = window.GameLaunch.hasEngine(gameId);
        if (val != null) return val;
      } catch (e) {}
    }
    const gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
    if (BUILTIN_GAMES[gid] || BUNDLED_GAMES[gid]) return true;

    const db = getDatabase();
    const g = (db.games || []).find((x) => sameId(x.id || x.game_id, gid));
    if (!g) return false;

    if (g.play_path || g.playPath || g.game_url || g.gameUrl) return true;
    return false;
  },

  resolveGameLaunch(gameId, params = {}) {
    const gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
    const db = getDatabase();
    const g = (db.games || []).find((x) => sameId(x.id || x.game_id, gid)) || {};

    const qs = Object.entries(params)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const qStr = qs ? `?${qs}` : '';

    if (BUILTIN_GAMES[gid]) {
      const slug = BUILTIN_GAMES[gid].slug;
      return {
        kind: 'builtin',
        slug,
        url: `/games/${slug}/index.html${qStr}`,
        embeddable: false,
        game: g
      };
    }

    const playPath = g.play_path || g.playPath || BUNDLED_GAMES[gid]?.play_path;
    if (playPath) {
      const clean = String(playPath).replace(/^\/+|\/+$/g, '');
      const wrapperParams = { gameId: gid, id: gid, ...params };
      const wrapperQs = Object.entries(wrapperParams)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      return {
        kind: 'hosted',
        slug: clean.replace(/^games\//, ''),
        url: `/pages/player/play.html?${wrapperQs}`,
        directUrl: `/${clean}/index.html${qStr}`,
        embeddable: true,
        game: g
      };
    }

    const gameUrl = g.game_url || g.gameUrl;
    if (gameUrl) {
      const wrapperParams = { gameId: gid, id: gid, ...params };
      const wrapperQs = Object.entries(wrapperParams)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      return {
        kind: 'selfhosted',
        slug: null,
        url: `/pages/player/play.html?${wrapperQs}`,
        directUrl: gameUrl,
        embeddable: true,
        game: g
      };
    }

    return null;
  },

  playFast(gameId, userId = 7) {
    return this.launchGame(gameId, userId);
  },

  spectate(sessionId) {
    if (typeof window !== 'undefined' && window.Presence && typeof window.Presence.spectate === 'function') {
      window.Presence.spectate(sessionId);
      return;
    }
    window.location.href = `/games/chess/index.html?sid=${sessionId}&spectate=true`;
  },

  getDashboardData(userId, role) {
    const db = getDatabase();
    const uidStr = String(userId);

    // 1. Resolve User Record
    let user = (db.users || []).find((u) => sameId(u.id || u.user_id, uidStr));
    if (!user) {
      user = {
        id: uidStr,
        user_id: uidStr,
        username: role === 'guest' ? 'Guest Player' : 'Player',
        level: 1,
        wins: 0,
        losses: 0,
        matches: 0,
        xp: 0,
        elo: 1200
      };
    }

    // 2. Resolve Profile & Match results
    const prof = (db.player_profiles || []).find((p) => sameId(p.user_id, uidStr));
    const myResults = (db.match_results || []).filter((r) => sameId(r.player_id, uidStr));
    const derivedWins = myResults.filter((r) => (r.result || '') === 'win').length;
    const derivedMatches = myResults.length;

    // 3. Global Progression calculations
    const pcp = prof?.carys_points || 0;
    const level = user.level || 1;
    const elo = user.elo || 1200;
    const xp = user.xp || 0;
    const nextReq = Math.floor(1000 * Math.pow(level, 1.5));
    const prevReq = level > 1 ? Math.floor(1000 * Math.pow(level - 1, 1.5)) : 0;
    const xpProgress = Math.max(0, xp - prevReq);
    const xpTierSize = Math.max(1, nextReq - prevReq);
    const pct = Math.min(100, Math.round((xpProgress / xpTierSize) * 100));

    // Resolve Tier Info
    let tierInfo;
    if (typeof window !== 'undefined' && window.Economy && typeof window.Economy.getTierFromElo === 'function') {
      tierInfo = window.Economy.getTierFromElo(elo);
    } else if (typeof window !== 'undefined' && window.Economy && typeof window.Economy.getTierFromPoints === 'function') {
      tierInfo = window.Economy.getTierFromPoints(pcp);
    } else {
      tierInfo = getTierFromPoints(pcp);
    }

    const matches = user.matches || derivedMatches;
    const wins = user.wins || derivedWins;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

    // 4. Daily Login Streak & Bonus
    const todayKey = new Date().toISOString().split('T')[0];
    const lastLogin = user.lastLoginDate || null;
    const streak = user.loginStreak || 0;
    let newStreak = streak;
    let bonusMsg = null;

    // Only update once per calendar day
    if (lastLogin !== todayKey) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().split('T')[0];
      newStreak = lastLogin === yKey ? streak + 1 : 1;

      user.lastLoginDate = todayKey;
      user.loginStreak = newStreak;

      const bonusPcp = newStreak >= 7 ? 100 : newStreak >= 3 ? 40 : 15;
      if (prof) {
        prof.carys_points = (prof.carys_points || 0) + bonusPcp;
      }
      bonusMsg = `+${bonusPcp} PCP`;
      saveDatabase(db);
    }

    // 5. Today's Activity
    const myTodaySessions = (db.sessions || []).filter((s) => {
      const inPlayers =
        (s.players || []).some((p) => sameId(p, uidStr)) ||
        sameId(s.created_by, uidStr);
      const isToday = (s.createdAt || s.start_time || '').startsWith(todayKey);
      return inPlayers && isToday;
    });

    const myTodayTourns = (db.tournaments || []).filter((t) => {
      const reg = (db.player_tournament || []).some(
        (pt) => sameId(pt.player_id, uidStr) && sameId(pt.tournament_id, t.tournament_id || t.id)
      );
      return reg && (t.status === 'in-progress' || t.status === 'upcoming');
    });

    const activities = [
      ...myTodaySessions.map((s) => {
        const g = (db.games || []).find((x) => sameId(x.game_id || x.id, s.game_id || s.gameId));
        return {
          icon: '🎮',
          text: `Played ${g?.game_name || g?.title || 'a game'}`,
          color: 'var(--accent-cyan)'
        };
      }),
      ...myTodayTourns.map((t) => ({
        icon: '🏆',
        text: `Registered: ${t.tournament_name || t.name}`,
        color: 'var(--accent-yellow)'
      })),
      ...(bonusMsg ? [{ icon: '💰', text: `Login bonus: ${bonusMsg} earned`, color: 'var(--accent-green)' }] : [])
    ].slice(0, 5);

    // 6. Friends List & Presence
    const friends = [];
    if (role !== 'guest') {
      const friendRows = (db.friendships || []).filter(
        (f) => (sameId(f.user_a, uidStr) || sameId(f.user_b, uidStr)) && !f.removed_at
      );

      friendRows.forEach((f) => {
        const friendId = sameId(f.user_a, uidStr) ? f.user_b : f.user_a;
        const fu = (db.users || []).find((u) => sameId(u.id || u.user_id, friendId));
        if (fu) {
          const name = fu.user_name || fu.username;
          const avatar = fu.avatar || name.slice(0, 2).toUpperCase();

          // Live presence check
          let presence = { label: 'Online', color: '#10b981', canSpectate: false, session: null };
          if (typeof window !== 'undefined' && window.Presence && typeof window.Presence.statusOf === 'function') {
            presence = window.Presence.statusOf(name);
          } else {
            // Fallback presence based on in-progress matches
            const liveMatch = (db.matches || []).find(
              (m) =>
                m.status === 'in-progress' &&
                ((m.participants || []).some((p) => sameId(p, friendId)) || sameId(m.created_by, friendId))
            );
            if (liveMatch) {
              presence = {
                label: 'Playing',
                color: 'var(--accent-cyan)',
                canSpectate: true,
                session: liveMatch
              };
            }
          }

          friends.push({
            id: friendId,
            name,
            avatar,
            presence
          });
        }
      });
    }

    // 7. Featured Games
    const approvedGames = (db.games || []).filter(
      (g) =>
        (g.game_approval_status === 'approved' || g.status === 'approved') &&
        (g.game_status === 'enabled' || g.status === 'enabled' || g.enabled)
    );
    let featGames = approvedGames.filter((g) => g.img).slice(0, 4);
    if (featGames.length === 0) {
      const allWithImg = (db.games || []).filter((g) => g.img).slice(0, 4);
      featGames = allWithImg.length ? allWithImg : (db.games || []).slice(0, 4);
    }

    // 8. Live Events / Tournaments strip
    const tourns = (db.tournaments || [])
      .filter((t) => t.status === 'upcoming' || t.status === 'in-progress')
      .slice(0, 3)
      .map((t) => {
        const g = (db.games || []).find((gx) => sameId(gx.game_id || gx.id, t.game_id));
        return {
          ...t,
          id: t.tournament_id || t.id,
          gameName: g ? g.game_name || g.title : 'Game'
        };
      });

    // 9. Game Library tiles (up to 10)
    const libraryGames = (approvedGames.length ? approvedGames : db.games || []).slice(0, 10);

    return {
      user,
      prof,
      pcp,
      level,
      elo,
      xp,
      xpProgress,
      xpTierSize,
      pct,
      tierInfo,
      matches,
      wins,
      winRate,
      streak: newStreak,
      bonusMsg,
      activities,
      friends,
      featuredGames: featGames,
      tournaments: tourns,
      libraryGames,
      allGames: db.games || []
    };
  },

  getGenres() {
    const db = getDatabase();
    if (db.genres && Array.isArray(db.genres) && db.genres.length > 0) {
      return db.genres.map(g => (typeof g === 'object' ? g.name : g));
    }
    return [
      'Strategy',
      'Casual',
      'Action',
      'Racing',
      'Puzzle',
      'Sports',
      'Shooter',
      'Horror'
    ];
  },

  getFavorites(userId) {
    const db = getDatabase();
    const uid = String(userId || 7);
    let favList = [];

    // 1. Try persistent localStorage first
    try {
      const stored = localStorage.getItem(`playcarys_favs_${uid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          favList = parsed;
        }
      }
    } catch (e) {}

    // 2. Check db.favorites
    if (!favList || !favList.length) {
      if (db.favorites) {
        if (Array.isArray(db.favorites)) {
          // Relational format: [{ user_id: 7, game_id: 1 }]
          favList = db.favorites
            .filter((f) => String(f.user_id || f.userId) === uid)
            .map((f) => String(f.game_id || f.gameId));
        } else if (typeof db.favorites === 'object') {
          // Dictionary format: { "7": ["1", "2"] }
          favList = Array.isArray(db.favorites[uid]) ? db.favorites[uid] : [];
        }
      }
    }

    // 3. Fallback to default seed favorites if empty for default player 7
    if (!favList || !favList.length) {
      if (uid === '7') {
        favList = ['1', '2'];
      }
    }

    // 4. Cleanse phantom IDs (e.g. legacy 7, 8) that don't correspond to real games
    const allGames = db.games || [];
    if (allGames.length > 0) {
      const validGameIds = new Set(allGames.map((g) => String(g.id || g.game_id)));
      const cleaned = favList.filter((id) => validGameIds.has(String(id)));
      if (cleaned.length > 0) {
        favList = cleaned;
      } else if (uid === '7' && validGameIds.size > 0) {
        // If all favorites were phantom, point to the first approved games
        const approved = allGames.filter(
          (g) => (g.status === 'approved' || g.game_approval_status === 'approved') && g.enabled !== false
        );
        favList = approved.slice(0, 2).map((g) => String(g.id || g.game_id));
      }
    }

    // Keep localStorage backup updated
    try {
      localStorage.setItem(`playcarys_favs_${uid}`, JSON.stringify(favList));
    } catch (e) {}

    return (favList || []).map(String);
  },

  toggleFavorite(gameId, userId) {
    const db = getDatabase();
    const uid = String(userId || 7);
    const sid = String(gameId);
    let list = this.getFavorites(uid);

    if (list.includes(sid)) {
      list = list.filter((id) => id !== sid);
    } else {
      list.push(sid);
    }

    // Keep localStorage in sync immediately
    try {
      localStorage.setItem(`playcarys_favs_${uid}`, JSON.stringify(list));
    } catch (e) {}

    // Update db.favorites in both dictionary and relational format
    if (!db.favorites || typeof db.favorites !== 'object') {
      db.favorites = {};
    }

    if (Array.isArray(db.favorites)) {
      db.favorites = db.favorites.filter((f) => String(f.user_id || f.userId) !== uid);
      list.forEach((gid) => {
        db.favorites.push({ user_id: Number(uid), game_id: Number(gid) });
      });
    } else {
      db.favorites[uid] = list;
    }

    // Mirror to window.DB if present
    if (typeof window !== 'undefined' && window.DB) {
      if (!window.DB.favorites || typeof window.DB.favorites !== 'object') {
        window.DB.favorites = {};
      }
      if (Array.isArray(window.DB.favorites)) {
        window.DB.favorites = window.DB.favorites.filter((f) => String(f.user_id || f.userId) !== uid);
        list.forEach((gid) => {
          window.DB.favorites.push({ user_id: Number(uid), game_id: Number(gid) });
        });
      } else {
        window.DB.favorites[uid] = list;
      }
    }

    saveDatabase(db);
    return list;
  },

  async probeSelfHosted(gameId) {
    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.probe === 'function') {
      try {
        return await window.GameLaunch.probe(gameId);
      } catch (e) {
        return false;
      }
    }
    const resolved = this.resolveGameLaunch(gameId);
    if (!resolved) return false;
    if (resolved.kind !== 'selfhosted') return true;

    // Probe self-hosted URL
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 3000);
      await fetch(resolved.directUrl || resolved.url, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      });
      clearTimeout(timer);
      return true;
    } catch (e) {
      return false;
    }
  },

  getMultiplayerMode(gameId) {
    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.multiplayerMode === 'function') {
      try {
        return window.GameLaunch.multiplayerMode(gameId);
      } catch (e) {}
    }
    const gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
    if (gid === '7' || gid === '25') return 'self';
    const db = getDatabase();
    const g = (db.games || []).find((x) => sameId(x.id || x.game_id, gid));
    if (g && g.game_mode) {
      return g.game_mode === 'multi' ? 'self' : 'solo';
    }
    return 'solo';
  },

  launchGame(gameId, userId) {
    const db = getDatabase();
    const uid = String(userId || 7);
    const gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
    let g = (db.games || []).find((x) => sameId(x.id || x.game_id, gid));
    if (!g && (BUILTIN_GAMES[gid] || BUNDLED_GAMES[gid])) {
      g = { game_id: gid, id: gid };
    }
    if (!g) return { success: false, reason: 'Game could not be found.' };

    if (!this.hasEngine(gid)) {
      return { success: false, reason: 'Coming Soon! 🚀 This game engine is currently being integrated.' };
    }

    const newSid = typeof db.startMatch === 'function'
      ? db.startMatch(gid, { created_by: uid })
      : 'M' + Date.now() + Math.floor(Math.random() * 1000);

    // Track view count
    api.post(`/games/${gid.replace(/^g/, '')}/view`, {}).catch(() => {});

    // Try global GameLaunch if present
    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.launch === 'function') {
      try {
        const ok = window.GameLaunch.launch(gid, { sid: newSid, userId: uid });
        if (ok) return { success: true };
      } catch (e) {
        console.warn('GameLaunch.launch fallback triggered:', e);
      }
    }

    const resolved = this.resolveGameLaunch(gid, { sid: newSid, userId: uid });
    if (!resolved) {
      return { success: false, reason: 'Coming Soon! 🚀 This game engine is currently being integrated.' };
    }

    window.location.href = resolved.url;
    return { success: true };
  },

  async fetchAchievements(gameId, userId) {
    if (!gameId || gameId === 'undefined' || isNaN(Number(String(gameId).replace(/^g/, '')))) {
      return [];
    }
    const gid = encodeURIComponent(String(gameId).replace(/^g/, ''));
    const uid = encodeURIComponent(String(userId || 7));
    try {
      const res = await api.get(`/games/${gid}/achievements?viewerId=${uid}`);
      if (Array.isArray(res)) return res;
    } catch (e) {}
    try {
      const resp = await fetch(`/api/v1/games/${gid}/achievements?viewerId=${uid}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
    return [];
  },

  hasPlayedGame(gameId, userId) {
    const db = getDatabase();
    const uid = String(userId || 7);
    const gid = String(gameId);

    const inResults = (db.match_results || []).some(
      r => sameId(r.player_id, uid) && sameId(r.game_id, gid)
    );
    if (inResults) return true;

    return (db.matches || []).some(
      m => sameId(m.game_id, gid) && Array.isArray(m.participants) && m.participants.some(p => sameId(p, uid))
    );
  },

  submitReview(gameId, userId, rating, comment) {
    const db = getDatabase();
    const uid = String(userId || 7);
    const gid = String(gameId);

    if (!db.reviews) db.reviews = [];
    const newReview = {
      id: Date.now(),
      gameId: gid,
      playerId: uid,
      rating: Number(rating),
      comment: String(comment || '').trim(),
      date: new Date().toISOString()
    };
    db.reviews.push(newReview);

    const gReviews = db.reviews.filter(r => sameId(r.gameId, gid));
    const avg = gReviews.reduce((sum, r) => sum + r.rating, 0) / gReviews.length;
    const game = (db.games || []).find(g => sameId(g.id || g.game_id, gid));
    if (game) {
      game.rating = parseFloat(avg.toFixed(1));
    }

    saveDatabase(db);
    return { success: true, newReview, newRating: game?.rating };
  },

  getGameVisuals(game, index = 0) {
    const imgKey = game?.img || '';
    const imgSrc = (imgKey.startsWith('data:image/') || imgKey.startsWith('http'))
      ? imgKey
      : (GAME_ASSETS.IMG_MAP[imgKey] || null);
    const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
    const bgColor = GAME_ASSETS.COLORS[index % GAME_ASSETS.COLORS.length];
    return { imgSrc, emoji, bgColor };
  },

  supportsAi(gameId) {
    const gid = String(gameId);
    if (typeof window !== 'undefined' && window.GameLaunch && window.GameLaunch.BUILTIN && window.GameLaunch.BUILTIN[gid]) {
      return !!window.GameLaunch.BUILTIN[gid].supportsAi;
    }
    return gid === '7';
  }
};

export default playerService;
