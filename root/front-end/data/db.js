// ============================================================
//  PlayCarys — Mock Data Store
//  Exactly mirrors the SQL schema — 12 tables in schema order:
//
//  1. ROLE
//  2. USERS
//  3. PLAYER_PROFILE
//  4. PUBLISHER_PROFILE
//  5. GAME
//  6. TOURNAMENT
//  7. GAME_SESSION
//  8. MATCH_RESULT
//  9. REPORT
// 10. MODERATOR_ACTION
// 11. player_tournament  (junction: PLAYER_PROFILE ↔ TOURNAMENT)
// 12. player_session     (junction: PLAYER_PROFILE ↔ GAME_SESSION)
//
//  All IDs use the SQL numeric PK style (integers as strings for JS safety).
//  Backward-compat getters at the bottom keep every existing page working.
// ============================================================

// ============================================================
//  BACKEND ORIGIN RESOLVER  (single source of truth)
//  The NestJS backend always runs on the SAME machine that serves
//  this page, on port 3000. So we derive its origin from the URL the
//  browser is currently on instead of hardcoding an IP address:
//
//    host laptop opens  http://localhost:8080     → http://localhost:3000
//    other laptop opens http://10.0.99.135:8080   → http://10.0.99.135:3000
//
//  This is what makes "any laptop can be the server" work with no code edit.
//  Override order: ?server=IP  >  saved override  >  same-host autodetect.
// ============================================================
window.PC_BACKEND_PORT = 3000;
window.PC_BACKEND = (function () {
  const loc = window.location;

  // Is the page being served straight off this machine or the local Wi-Fi?
  // Only then is "same host, port 3000" a real address. Anything else — a
  // tunnel domain, a deployed site — reaches us through ONE forwarded port,
  // and port 3000 of that hostname belongs to nobody.
  const host = loc.hostname || 'localhost';
  const isDirectHost =
    loc.protocol === 'http:' && (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host)        // a bare LAN IPv4 literal
    );

  try {
    // 1. Explicit override in the URL: ?server=10.0.99.135  (persisted for later pages)
    const qs = new URLSearchParams(loc.search).get('server');
    if (qs) {
      const url = /^https?:\/\//.test(qs) ? qs : 'http://' + qs + ':' + window.PC_BACKEND_PORT;
      localStorage.setItem('pc_backend_url', url);
      return url;
    }

    // 2. Previously saved override — but ONLY while we are still on a directly
    //    addressable host. A saved "http://192.168.1.7:3000" from a Wi-Fi
    //    session otherwise follows the browser onto the public link and breaks
    //    sign-in there, which is very hard to recognise as a stale setting.
    if (isDirectHost) {
      const saved = localStorage.getItem('pc_backend_url');
      if (saved) return saved;
    }
  } catch (e) { /* localStorage may be blocked — fall through to autodetect */ }

  // 3. Not a direct host: the site is coming through a tunnel or a proxy, so
  //    the API is reachable at the SAME origin. front-end/dev-server.js
  //    forwards /api and /socket.io to the backend for exactly this case.
  //
  //    This is what fixes "Cannot reach the server to verify your password"
  //    on a shared public link: the old code guessed
  //    http://<tunnel-host>:3000, which is both an unforwarded port and a
  //    mixed-content request from an https page.
  if (!isDirectHost) return loc.origin;

  // 4. Direct host: same host as the page, backend port. Works whether or not
  //    the proxy is in front, so an old `http-server` launch still behaves.
  //    file:// pages have an empty hostname — fall back to localhost.
  return 'http://' + host + ':' + window.PC_BACKEND_PORT;
})();
window.PC_API = window.PC_BACKEND + '/api/v1';

// Port that serves game bundles. It is a SEPARATE ORIGIN on purpose: a game
// running on the platform's own origin can read localStorage, and that is
// where the session token lives. See dev-server.js and pages/player/play.html.
window.PC_GAMES_PORT = 8081;

const DB = {

  // ── Matchmaking Queues ──
  quickPlayQueue: [],

  // ── Real-Time Features (Publisher Telemetry) ──
  live_events: [],
  telemetry: [],

  // ── Platform settings (not a DB table — UI config only) ─────
  settings: {
    platformName: "PlayCarys",
    maintenanceMode: false,
    registrationOpen: true,
    twoFactorAuth: true,
    sessionTimeout: 30,
    strongPasswords: true,
    emailNotifications: true,
    reportNotifications: true,
    approvalNotifications: true
  },

  // ── Dynamic Platform Content ──
  genres: [
    { id: 1, name: "FPS", definition: "First-Person Shooter: Focused on weapon-based combat through the character's eyes." },
    { id: 2, name: "Puzzle", definition: "Focused on solving challenges, pattern recognition, and logic." },
    { id: 3, name: "Horror", definition: "Intended to scare, unsettle, or horrify the player." },
    { id: 4, name: "Racing", definition: "Competition in vehicles against other players or a clock." },
    { id: 5, name: "Battle Royale", definition: "Survival of the last player standing in a shrinking arena." },
    { id: 6, name: "Board", definition: "Digital versions of classic tabletop or strategic board games." }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 1 — ROLE
  //  role_id INT PK, role_name VARCHAR(50) NOT NULL
  // ══════════════════════════════════════════════════════════════
  roles: [
    { role_id: 1, role_name: "superuser" },
    { role_id: 2, role_name: "admin" },
    { role_id: 3, role_name: "moderator" },
    { role_id: 4, role_name: "player" },
    { role_id: 5, role_name: "publisher" }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 2 — USERS
  //  user_id INT PK, user_name VARCHAR(50), role_id INT FK→ROLE,
  //  email VARCHAR(255) UNIQUE, password VARCHAR(255)
  //  CONSTRAINT: LENGTH(password) >= 8
  //  IS-A → PLAYER_PROFILE (role 4) or PUBLISHER_PROFILE (role 5)
  //
  //  Extra UI fields (not in schema): avatar, status, joinDate, lastSeen
  // ══════════════════════════════════════════════════════════════
  users: [
    // NOTE: seed accounts deliberately carry NO password. This file is
    // served to every visitor, so a literal here is a public credential —
    // it used to hand out all 12, including the superuser's. Passwords live
    // only on the server now and are checked by POST /auth/login.
    { user_id: 0, user_name: "GodMode", role_id: 1, email: "godmode@playcarys.com", phone_number: "+91 9876543210", avatar: "GM", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-25" },
    { user_id: 1, user_name: "SuperAdmin", role_id: 2, email: "super@playcarys.com", phone_number: "+91 9876543210", avatar: "SA", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-24" },
    { user_id: 2, user_name: "SystemAdmin", role_id: 2, email: "admin@playcarys.com", phone_number: "+91 9876543210", avatar: "SA", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-24" },
    { user_id: 3, user_name: "ModeratorOne", role_id: 3, email: "mod1@example.com", phone_number: "+91 9876543210", avatar: "M1", status: "active", joinDate: "2024-06-15", lastSeen: "2026-03-24" },
    { user_id: 4, user_name: "ModeratorTwo", role_id: 3, email: "mod2@example.com", phone_number: "+91 9876543210", avatar: "M2", status: "active", joinDate: "2024-08-01", lastSeen: "2026-03-20" },
    { user_id: 5, user_name: "EpicGamesStudio", role_id: 5, email: "contact@epicgames.com", phone_number: "+1 4155550198", avatar: "EG", status: "active", joinDate: "2024-03-10", lastSeen: "2026-03-23" },
    { user_id: 6, user_name: "IndieDevStudios", role_id: 5, email: "hello@indiedev.com", phone_number: "+44 7700900077", avatar: "ID", status: "active", joinDate: "2024-05-20", lastSeen: "2026-03-22" },
    { user_id: 7, user_name: "DragonSlayer", role_id: 4, email: "dragon@example.com", phone_number: "+91 9876543210", avatar: "DS", status: "active", joinDate: "2024-02-14", lastSeen: "2026-03-24" },
    { user_id: 8, user_name: "NightHawk", role_id: 4, email: "night@example.com", phone_number: "+91 9876543210", avatar: "NH", status: "active", joinDate: "2024-04-08", lastSeen: "2026-03-23" },
    { user_id: 9, user_name: "PhoenixRise", role_id: 4, email: "phoenix@example.com", phone_number: "+91 9876543210", avatar: "PR", status: "active", joinDate: "2024-07-22", lastSeen: "2026-03-21" },
    { user_id: 10, user_name: "ShadowMaster", role_id: 4, email: "shadow@example.com", phone_number: "+91 9876543210", avatar: "SM", status: "active", joinDate: "2024-09-11", lastSeen: "2026-03-19" },
    { user_id: 11, user_name: "ToxicPlayer", role_id: 4, email: "toxic@example.com", phone_number: "+91 9876543210", avatar: "TP", status: "banned", joinDate: "2024-11-05", lastSeen: "2026-03-15" }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 3 — PLAYER_PROFILE
  //  user_id INT PK FK→USERS, player_name VARCHAR(50) UNIQUE,
  //  carys_points INT DEFAULT 0  CHECK >= 0,
  //  play_time    INT DEFAULT 0  CHECK >= 0,
  //  matches_won  INT DEFAULT 0  CHECK >= 0,
  //  player_status BOOLEAN
  // ══════════════════════════════════════════════════════════════
  player_profiles: [
    { user_id: 7, player_name: "DragonSlayer", carys_points: 4680, play_time: 892, matches_won: 234, player_status: true },
    { user_id: 8, player_name: "NightHawk", carys_points: 3780, play_time: 741, matches_won: 189, player_status: true },
    { user_id: 9, player_name: "PhoenixRise", carys_points: 1960, play_time: 403, matches_won: 98, player_status: true },
    { user_id: 10, player_name: "ShadowMaster", carys_points: 6200, play_time: 1120, matches_won: 310, player_status: true },
    { user_id: 11, player_name: "ToxicPlayer", carys_points: 940, play_time: 214, matches_won: 47, player_status: false }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 4 — PUBLISHER_PROFILE
  //  user_id INT PK FK→USERS,
  //  total_games INT DEFAULT 0,
  //  approved_games INT DEFAULT 0,
  //  active_games INT DEFAULT 0
  // ══════════════════════════════════════════════════════════════
  publisher_profiles: [
    { user_id: 5, total_games: 4, approved_games: 3, active_games: 3, revenue_pcp: 45000, studio_name: "Epic Games Studio", founded: "2024-03-10" },
    { user_id: 6, total_games: 3, approved_games: 2, active_games: 2, revenue_pcp: 12500, studio_name: "Indie Dev Studios", founded: "2024-05-20" }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 5 — GAME
  //  game_id INT PK, game_name VARCHAR(100) UNIQUE NOT NULL,
  //  game_type VARCHAR(50), game_status VARCHAR(20),
  //  game_approval_status VARCHAR(20),
  //  game_publisher INT FK→USERS
  //
  //  Extra UI fields (not in schema): desc, players, img, rating,
  //  views, submittedDate, sessions
  // ══════════════════════════════════════════════════════════════
  games: [
    {
      game_id: 1, game_name: "Call of Duty",
      game_type: "FPS", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 5,
      desc: "Intense tactical FPS warfare with realistic combat mechanics and squad-based multiplayer action",
      players: "2-64", tournamentFormat: 4, img: "call_of_duty", rating: 0, views: 0, submittedDate: "2025-11-15", sessions: 0
    },
    {
      game_id: 2, game_name: "DEADshot",
      game_type: "FPS", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 5,
      desc: "Stealth sniper gameplay in a cyberpunk world — precision kills and tactical assassinations",
      players: "1", img: "deadshot", rating: 0, views: 0, submittedDate: "2025-12-01", sessions: 0
    },
    {
      game_id: 3, game_name: "Carrom",
      game_type: "Puzzle", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 6,
      desc: "Classic Indian board game brought online — flick the striker and pocket all your coins to win",
      players: "2-4", img: "carrom", rating: 0, views: 0, submittedDate: "2025-12-20", sessions: 0
    },
    {
      game_id: 4, game_name: "HorrorEscape",
      game_type: "Horror", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 6,
      desc: "Survive a haunted mansion filled with puzzles, traps and terrifying creatures lurking in shadows",
      players: "1-6", img: "horror_escape", rating: 0, views: 0, submittedDate: "2026-01-08", sessions: 0
    },
    {
      game_id: 5, game_name: "F1 2022",
      game_type: "Racing", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 5,
      desc: "High-octane Formula 1 racing with realistic physics, pit strategies and iconic global circuits",
      players: "2-20", img: "f1_2022", rating: 0, views: 0, submittedDate: "2026-02-01", sessions: 0
    },
    {
      game_id: 6, game_name: "PUBG Lite",
      game_type: "Battle Royale", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 6,
      desc: "Experience intense Battle Royale action optimized for lighter devices with classic maps and modes.",
      players: "1-60", img: "pubg_lite", rating: 0, views: 0, submittedDate: "2026-03-31", sessions: 0
    },
    {
      game_id: 7, game_name: "Chess Pro",
      game_type: "Board", game_status: "enabled", game_approval_status: "approved",
      game_publisher: 5,
      desc: "Classic game of strategy. Play against friends or challenge the grandmaster engine.",
      players: "2", tournamentFormat: 2, img: "chess", rating: 4.9, views: 10400, submittedDate: "2026-04-01", sessions: 3
    },
    {
      game_id: 8, game_name: "Hill Climbing",
      game_type: "Racing", game_status: "enabled", game_approval_status: "approved",
      game_publisher: 6,
      desc: "Master high-torque physics and precise throttle control on treacherous off-road terrain. Push your limits and conquer the ultimate peaks.",
      players: "1", img: "hill_climbing", rating: 4.6, views: 8200, submittedDate: "2026-04-02", sessions: 1
    },
    {
      game_id: 9, game_name: "Candy Crush Clone",
      game_type: "Puzzle", game_status: "disabled", game_approval_status: "pending",
      game_publisher: 5,
      desc: "Match 3 colorful candies to progress through beautifully sweet puzzle levels.",
      players: "1", img: "candy_crush", rating: 0, views: 0, submittedDate: "2026-04-03", sessions: 0
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 6 — TOURNAMENT
  //  tournament_id INT PK, game_id INT FK→GAME,
  //  tournament_name VARCHAR(100) UNIQUE NOT NULL,
  //  start_date DATE NOT NULL, end_date DATE NOT NULL
  //  CONSTRAINT: start_date <= end_date
  //
  //  Extra UI fields: desc, participants, maxParticipants, status,
  //  regClose, prize, organizer
  //  NOTE: registered players now live in TABLE 11 — player_tournament
  // ══════════════════════════════════════════════════════════════
  tournaments: [
    {
      tournament_id: 1, game_id: 7, tournament_name: "Grandmaster Elite Series",
      desc: "Full FIDE professional rules. Classical time control (90min+30s). Swiss pairing system.",
      participants: 12, maxParticipants: 32, status: "cancelled",
      start_date: "2026-04-09", end_date: "2026-05-09", regClose: "2026-04-08",
      prize: "$5000", organizer: 5
    },
    {
      tournament_id: 2, game_id: 8, tournament_name: "Apex Distance Marathon",
      desc: "Ultimate endurance test. Player covering the maximum distance on 'Infinite Hills' wins. No restarts allowed.",
      participants: 24, maxParticipants: 100, status: "upcoming",
      start_date: "2026-04-16", end_date: "2026-05-16", regClose: "2026-04-14",
      prize: "$2500", organizer: 5
    },
    {
      tournament_id: 3, game_id: 7, tournament_name: "Strategic Blitz Cup",
      desc: "Fast-paced professional blitz. 5-minute strict timers. FIDE blitz appendix rules apply.",
      participants: 8, maxParticipants: 16, status: "upcoming",
      start_date: "2026-04-20", end_date: "2026-05-20", regClose: "2026-04-18",
      prize: "$1000", organizer: 6
    },
    {
      tournament_id: 4, game_id: 8, tournament_name: "Mountain Peak Sprint",
      desc: "Metric: Absolute maximum distance reached on the Vertical Mountain track. Precision throttle control required.",
      participants: 15, maxParticipants: 50, status: "upcoming",
      start_date: "2026-04-25", end_date: "2026-05-25", regClose: "2026-04-23",
      prize: "$1500", organizer: 6
    },
    {
      tournament_id: 5, game_id: 7, tournament_name: "Candidates Invitational",
      desc: "Professional round-robin series. Deep theory and precision required to qualify for our World Championship.",
      participants: 4, maxParticipants: 8, status: "upcoming",
      start_date: "2026-05-01", end_date: "2026-06-01", regClose: "2026-04-30",
      prize: "$3000", organizer: 5
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 7 — GAME_SESSION
  //  session_id INT PK, game_id INT FK→GAME,
  //  created_by INT FK→USERS,
  //  start_time TIMESTAMP NOT NULL, end_time TIMESTAMP NOT NULL,
  //  status VARCHAR(20)
  //  CONSTRAINT: start_time < end_time
  //
  //  Extra UI fields: name, host, hostId, maxPlayers, mode, duration,
  //  createdAt  (start_time used as createdAt when session is "waiting")
  //  NOTE: who is IN the session now lives in TABLE 12 — player_session
  //
  //  QUICK PLAY RULE: session_id=1 has 3 players joined (via player_session)
  //  so it wins as "busiest COD room" when Quick Play sorts by player count.
  // ══════════════════════════════════════════════════════════════
  sessions: [
    // ── Call of Duty ─────────────────────────────────────────────
    {
      session_id: 1, game_id: 1, created_by: 8,
      name: "Tactical Ops Room", game: "Call of Duty", host: "NightHawk", hostId: 8,
      maxPlayers: 8, status: "waiting", mode: "casual",
      start_time: "2026-03-29T10:00:00Z", end_time: "2026-03-29T12:00:00Z",
      duration: 0, createdAt: "2026-03-29T10:00:00Z"
    },

    {
      session_id: 7, game_id: 1, created_by: 101,
      name: "Ranked Warfare", game: "Call of Duty", host: "FragMaster", hostId: 101,
      maxPlayers: 10, status: "waiting", mode: "ranked",
      start_time: "2026-03-29T09:10:00Z", end_time: "2026-03-29T11:10:00Z",
      duration: 0, createdAt: "2026-03-29T09:10:00Z"
    },

    // ── DEADshot ─────────────────────────────────────────────────
    {
      session_id: 2, game_id: 2, created_by: 9,
      name: "Sniper Elite Squad", game: "DEADshot", host: "PhoenixRise", hostId: 9,
      maxPlayers: 4, status: "waiting", mode: "ranked",
      start_time: "2026-03-29T09:30:00Z", end_time: "2026-03-29T11:30:00Z",
      duration: 0, createdAt: "2026-03-29T09:30:00Z"
    },

    // ── Carrom ───────────────────────────────────────────────────
    {
      session_id: 3, game_id: 3, created_by: 10,
      name: "Carrom Champions", game: "Carrom", host: "ShadowMaster", hostId: 10,
      maxPlayers: 4, status: "waiting", mode: "casual",
      start_time: "2026-03-29T09:45:00Z", end_time: "2026-03-29T11:45:00Z",
      duration: 0, createdAt: "2026-03-29T09:45:00Z"
    },

    // ── HorrorEscape ─────────────────────────────────────────────
    {
      session_id: 4, game_id: 4, created_by: 102,
      name: "Haunted Manor Run", game: "HorrorEscape", host: "GhostRunner", hostId: 102,
      maxPlayers: 6, status: "waiting", mode: "casual",
      start_time: "2026-03-29T10:15:00Z", end_time: "2026-03-29T12:15:00Z",
      duration: 0, createdAt: "2026-03-29T10:15:00Z"
    },

    // ── F1 2022 ──────────────────────────────────────────────────
    {
      session_id: 5, game_id: 5, created_by: 103,
      name: "Monaco Grand Prix", game: "F1 2022", host: "SpeedKing", hostId: 103,
      maxPlayers: 20, status: "waiting", mode: "casual",
      start_time: "2026-03-29T10:20:00Z", end_time: "2026-03-29T12:20:00Z",
      duration: 0, createdAt: "2026-03-29T10:20:00Z"
    },

    {
      session_id: 6, game_id: 5, created_by: 104,
      name: "Championship Season", game: "F1 2022", host: "RaceAce", hostId: 104,
      maxPlayers: 12, status: "waiting", mode: "ranked",
      start_time: "2026-03-29T10:40:00Z", end_time: "2026-03-29T12:40:00Z",
      duration: 0, createdAt: "2026-03-29T10:40:00Z"
    },

    // ── Chess Pro (completed) ─────────────────────────────
    {
      session_id: 10, game_id: 7, created_by: 8,
      name: "Grandmaster Blitz #1", game: "Chess Pro", host: "NightHawk", hostId: 8,
      maxPlayers: 2, status: "completed", mode: "ranked",
      start_time: "2026-04-10T18:00:00Z", end_time: "2026-04-10T18:42:00Z",
      duration: 42, createdAt: "2026-04-10T18:00:00Z"
    },
    {
      session_id: 11, game_id: 7, created_by: 7,
      name: "Classic Rapid #7", game: "Chess Pro", host: "DragonSlayer", hostId: 7,
      maxPlayers: 2, status: "completed", mode: "casual",
      start_time: "2026-04-11T20:00:00Z", end_time: "2026-04-11T20:28:00Z",
      duration: 28, createdAt: "2026-04-11T20:00:00Z"
    },
    {
      session_id: 12, game_id: 7, created_by: 8,
      name: "Grandmaster Blitz #2", game: "Chess Pro", host: "NightHawk", hostId: 8,
      maxPlayers: 2, status: "completed", mode: "ranked",
      start_time: "2026-04-12T10:00:00Z", end_time: "2026-04-12T10:55:00Z",
      duration: 55, createdAt: "2026-04-12T10:00:00Z"
    },

    // ── Hill Climbing (completed) ─────────────────────────
    {
      session_id: 13, game_id: 8, created_by: 7,
      name: "Hill Climb Solo Run", game: "Hill Climbing", host: "DragonSlayer", hostId: 7,
      maxPlayers: 1, status: "completed", mode: "casual",
      start_time: "2026-04-12T15:00:00Z", end_time: "2026-04-12T15:18:00Z",
      duration: 18, createdAt: "2026-04-12T15:00:00Z"
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 8 — MATCH_RESULT
  //  (session_id, player_id) COMPOSITE PK
  //  session_id INT FK→GAME_SESSION, player_id INT FK→PLAYER_PROFILE,
  //  score INT, player_rank INT CHECK >= 0,
  //  joined_at TIMESTAMP NOT NULL
  // ══════════════════════════════════════════════════════════════
  match_results: [
    // Session 1 — COD Tactical Ops Room
    { session_id: 1, player_id: 8, score: 4200, player_rank: 1, joined_at: "2026-03-28T14:10:00Z", game_id: 1 },
    { session_id: 1, player_id: 7, score: 3800, player_rank: 2, joined_at: "2026-03-28T14:12:00Z", game_id: 1 },
    // Session 2 — DEADshot
    { session_id: 2, player_id: 9, score: 2900, player_rank: 1, joined_at: "2026-03-28T15:00:00Z", game_id: 2 },
    // Session 3 — Carrom
    { session_id: 3, player_id: 10, score: 5100, player_rank: 1, joined_at: "2026-03-28T16:30:00Z", game_id: 3 },
    // Session 5 — F1 Monaco
    { session_id: 5, player_id: 10, score: 8800, player_rank: 1, joined_at: "2026-03-27T11:00:00Z", game_id: 5 },
    { session_id: 5, player_id: 8, score: 7600, player_rank: 2, joined_at: "2026-03-27T11:05:00Z", game_id: 5 },
    // Session 10 — Chess Blitz #1: NightHawk(W) vs DragonSlayer — NightHawk won
    {
      session_id: 10, player_id: 8, score: 2, player_rank: 1, joined_at: "2026-04-06T18:00:00Z", game_id: 7,
      color: "w", result: "win",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O", "h3", "Nb8", "d4", "Nbd7", "Nh2", "Bb7", "Nhf1", "exd4", "cxd4", "Nb6", "Ng3", "Nbd5", "Bc2", "c5", "dxc5", "dxc5", "Nf5", "Bxf5", "exf5", "Qd6"]
    },
    {
      session_id: 10, player_id: 7, score: 0, player_rank: 2, joined_at: "2026-04-06T18:05:00Z", game_id: 7,
      color: "b", result: "loss",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O", "h3", "Nb8", "d4", "Nbd7", "Nh2", "Bb7", "Nhf1", "exd4", "cxd4", "Nb6", "Ng3", "Nbd5", "Bc2", "c5", "dxc5", "dxc5", "Nf5", "Bxf5", "exf5", "Qd6"]
    },
    // Session 11 — Chess Rapid #7: DragonSlayer(W) vs NightHawk — DragonSlayer won
    {
      session_id: 11, player_id: 7, score: 2, player_rank: 1, joined_at: "2026-04-07T20:00:00Z", game_id: 7,
      color: "w", result: "win",
      moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5", "Nf3", "c5", "O-O", "dxc4", "Bxc4", "Nbd7", "Qe2", "b6", "e4", "cxd4", "Nxd4", "Bb7", "Bg5", "Bxc3", "bxc3", "Qc7", "f3", "e5", "Nf5", "g6", "Bxf6", "Nxf6", "Nh6+", "Kg7", "Qg4"]
    },
    {
      session_id: 11, player_id: 8, score: 0, player_rank: 2, joined_at: "2026-04-07T20:02:00Z", game_id: 7,
      color: "b", result: "loss",
      moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5", "Nf3", "c5", "O-O", "dxc4", "Bxc4", "Nbd7", "Qe2", "b6", "e4", "cxd4", "Nxd4", "Bb7", "Bg5", "Bxc3", "bxc3", "Qc7", "f3", "e5", "Nf5", "g6", "Bxf6", "Nxf6", "Nh6+", "Kg7", "Qg4"]
    },
    // Session 12 — Chess Blitz #2: Draw
    {
      session_id: 12, player_id: 8, score: 1, player_rank: 1, joined_at: "2026-04-08T10:00:00Z", game_id: 7,
      color: "w", result: "draw",
      moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e6", "f3", "b5", "g4", "h6", "Qd2", "Nbd7", "O-O-O", "Bb7", "h4", "b4", "Na4", "Qa5"]
    },
    {
      session_id: 12, player_id: 7, score: 1, player_rank: 1, joined_at: "2026-04-08T10:01:00Z", game_id: 7,
      color: "b", result: "draw",
      moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e6", "f3", "b5", "g4", "h6", "Qd2", "Nbd7", "O-O-O", "Bb7", "h4", "b4", "Na4", "Qa5"]
    },
    // Session 13 — Hill Climbing Solo
    {
      session_id: 13, player_id: 7, score: 340, player_rank: 1, joined_at: "2026-04-09T15:00:00Z", game_id: 8,
      result: "win", distance: 340, coins: 18, diamonds: 2
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 9 — REPORT
  //  report_id INT PK, reported_by INT FK→USERS,
  //  reported_user INT FK→USERS,
  //  reason TEXT NOT NULL, status VARCHAR(30) DEFAULT 'inreview',
  //  report_date DATE
  //
  //  Extra UI fields: type, session, sessionId, time, actionNote,
  //  reportedName (denormalised for display only)
  // ══════════════════════════════════════════════════════════════
  reports: [
    {
      report_id: 1, reported_by: 7, reported_user: 11,
      type: "Toxic Behavior",
      reason: "Player was using offensive language and harassing other players",
      status: "pending", report_date: "2026-03-29",
      session: "Tactical Ops Room", sessionId: 1, time: "2h ago", actionNote: ""
    },

    {
      report_id: 2, reported_by: 9, reported_user: 11,
      type: "Cheating",
      reason: "Suspected use of aimbot or wallhacks",
      status: "under-review", report_date: "2026-03-29",
      session: "Sniper Elite Squad", sessionId: 2, time: "5h ago", actionNote: ""
    },

    {
      report_id: 3, reported_by: 8, reported_user: 10,
      type: "Griefing",
      reason: "Intentionally sabotaging team gameplay",
      status: "resolved", report_date: "2026-03-28",
      session: "Carrom Champions", sessionId: 3, time: "24h ago", actionNote: "Warned player about fair play rules"
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 10 — MODERATOR_ACTION
  //  action_id INT PK, moderator_id INT FK→USERS,
  //  report_id INT FK→REPORT,
  //  action_type VARCHAR(50), action_date DATE, action_reason TEXT
  // ══════════════════════════════════════════════════════════════
  moderator_actions: [
    {
      action_id: 1, moderator_id: 3, report_id: 3,
      action_type: "warning", action_date: "2026-03-28",
      action_reason: "Warned ShadowMaster about fair play rules — first offence"
    },
    {
      action_id: 2, moderator_id: 3, report_id: 1,
      action_type: "review", action_date: "2026-03-29",
      action_reason: "Reviewing toxic behaviour report — monitoring ToxicPlayer"
    },
    {
      action_id: 3, moderator_id: 4, report_id: 2,
      action_type: "ban", action_date: "2026-03-29",
      action_reason: "Confirmed cheating via replay analysis — banned for 7 days"
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 11 — player_tournament  (JUNCTION)
  //  player_id INT FK→PLAYER_PROFILE,  tournament_id INT FK→TOURNAMENT
  //  PK (player_id, tournament_id)
  //
  //  Replaces the old registeredPlayers[] arrays on tournaments.
  // ══════════════════════════════════════════════════════════════
  player_tournament: [
    // DEADshot League (t2) — NightHawk, PhoenixRise, ShadowMaster
    { player_id: 8, tournament_id: 2 },
    { player_id: 9, tournament_id: 2 },
    { player_id: 10, tournament_id: 2 },
    // Carrom Championship (t3) — DragonSlayer, NightHawk
    { player_id: 7, tournament_id: 3 },
    { player_id: 8, tournament_id: 3 },
    // HorrorEscape Marathon (t4) — all five players
    { player_id: 7, tournament_id: 4 },
    { player_id: 8, tournament_id: 4 },
    { player_id: 9, tournament_id: 4 },
    { player_id: 10, tournament_id: 4 },
    { player_id: 11, tournament_id: 4 },
    // F1 Grand Prix (t5) — DragonSlayer, NightHawk, PhoenixRise, ShadowMaster
    { player_id: 7, tournament_id: 5 },
    { player_id: 8, tournament_id: 5 },
    { player_id: 9, tournament_id: 5 },
    { player_id: 10, tournament_id: 5 }
  ],

  // ══════════════════════════════════════════════════════════════
  //  TABLE 12 — player_session  (JUNCTION) — REMOVED
  //
  //  It recorded who was sitting in which ROOM right now: rows appeared when
  //  somebody joined a lobby and disappeared when they left or were kicked.
  //  That is a question about occupancy, and there is nothing to occupy.
  //
  //  The question it was also being used to answer — "who took part in this
  //  match" — was never really its job, and it answered it badly: the reaper
  //  deleted any session with no rows here, so a finished match often lost its
  //  membership and its record together. match_results has always held one row
  //  per player per match, and a live match now carries a plain `participants`
  //  array. Neither has side effects; this table's virtual `players` getter did.
  // ══════════════════════════════════════════════════════════════

  // ── Bans — UI table (derived from MODERATOR_ACTION, kept for display) ──
  bans: [
    {
      id: 1, playerId: 11, playerName: "ToxicPlayer", level: 9,
      duration: "7 Days",
      reason: "Repeated toxic behaviour and harassing other players",
      bannedBy: "ModeratorTwo", bannedById: 4,
      bannedDate: "2026-03-17", expiresDate: "2026-03-24", active: true
    }
  ],

  // ══════════════════════════════════════════════════════════════
  //  FRIENDSHIPS  (junction: USERS <-> USERS)
  //  { user_a INT, user_b INT, since ISO, removed_at ISO|null }
  //  INVARIANT: user_a < user_b, so one pair is exactly one row.
  //
  //  This replaces `user.friends = [{name, avatar, status, statusColor}]`,
  //  a nested array stored ON the user row. That had four defects:
  //
  //   1. It keyed friendships on USERNAME, which the profile page lets you
  //      edit — renaming yourself silently broke every friendship you had.
  //   2. It froze the friend's avatar and online status at the moment the
  //      request was accepted, and stored a CSS variable ('var(--accent-green)')
  //      as data, so the little green dot never changed again.
  //   3. Accepting a request wrote to the OTHER person's user row. Since
  //      db-import replaces a user row with whatever the last client sent,
  //      their next save quietly dropped the friendship you had just made.
  //      That is the "friends workflow is not working" report.
  //   4. It was not a table, so it had no key, no constraint, and could not
  //      be reasoned about relationally.
  //
  //  Unfriending TOMBSTONES with removed_at rather than splicing, because
  //  this table is append-only across the sync (same reason notifications
  //  are): a client holding a stale copy must never be able to delete rows
  //  for everybody.
  // ══════════════════════════════════════════════════════════════
  friendships: [
    { user_a: 7, user_b: 8,  since: "2026-02-10T00:00:00Z", removed_at: null },
    { user_a: 7, user_b: 10, since: "2026-02-14T00:00:00Z", removed_at: null },
    { user_a: 8, user_b: 9,  since: "2026-03-01T00:00:00Z", removed_at: null }
  ],

  // ── Favourites — UI convenience (not a DB table) ─────────────
  // Structure: { userId: [gameId, gameId, ...] }
  favorites: {
    7: ["7", "8"],
    8: ["7"],
    9: ["8"],
    10: ["7"]
  },

  // ── Activity Log — UI convenience (not a DB table) ───────────
  activityLog: [
    { type: "publisher", msg: "Epic Games Studio joined the platform", time: "2 hours ago" },
    { type: "approval", msg: "1 game(s) waiting for approval", time: "5 hours ago" },
    { type: "player", msg: "5 active players on the platform", time: "1 day ago" },
    { type: "tournament", msg: "Call of Duty Warzone Cup started", time: "2 days ago" },
    { type: "ban", msg: "ToxicPlayer banned for 7 days", time: "7 days ago" }
  ],

  // ── Game Reviews ─────────────────────────────────────────────
  reviews: [
    { id: 1, gameId: "7", playerId: "8", rating: 5, comment: "Incredible AI and mechanics. A must-play!", date: "2026-04-12T10:30:00Z" },
    { id: 2, gameId: "7", playerId: "10", rating: 4, comment: "Great game, but the Blitz timer is ruthless.", date: "2026-04-13T15:20:00Z" },
    { id: 3, gameId: "8", playerId: "7", rating: 5, comment: "Physics feel very grounded and rewarding.", date: "2026-04-14T09:15:00Z" }
  ],

  // ── Notifications — toRole = broadcast, toUser = direct DM
  // fromRole: sender's role, fromUserId: sender's user_id, toUser: recipient user_id (null = broadcast)
  //
  // RULE: a broadcast row (toUser === null) is ONE row shared by every user in
  // that role, so it may only carry text that is true for all of them. Anything
  // phrased "your game / your queue / your report" is per-user and MUST be a
  // direct row with toUser set — otherwise every publisher reads a message about
  // another publisher's game. Rows 5, 6, 7 and 10 were exactly that mistake.
  // A row must never set BOTH toRole and toUser (see dispatchRoleNotification).
  notifications: [
    { id: 1, toRole: "admin", toUser: null, from: "GodMode", avatar: "GM", fromRole: "superuser", fromUserId: 0, msg: "Platform audit scheduled for next Monday. Ensure all reports are filed.", time: "1h ago", read: false, replies: [] },
    { id: 2, toRole: "admin", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "New publisher IndieDevStudios needs their game reviewed urgently.", time: "3h ago", read: false, replies: [] },
    { id: 3, toRole: "superuser", toUser: null, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "Server load is at 87%. Consider scaling up resources.", time: "30m ago", read: false, replies: [] },
    { id: 4, toRole: "superuser", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "ModeratorOne has flagged an unusual activity pattern on session #7.", time: "2h ago", read: false, replies: [] },
    // "your queue" — belongs to one moderator (ModeratorOne, user_id 3), not to every moderator.
    { id: 5, toRole: null, toUser: 3, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "You have 2 new reports pending review under your queue.", time: "45m ago", read: false, replies: [] },
    // A player's private appeal. Broadcast to the whole moderator role it leaked
    // one player's account dispute to every moderator, and any reply landed in a
    // shared thread the rest of them could read.
    { id: 6, toRole: null, toUser: 3, from: "DragonSlayer", avatar: "DS", fromRole: "player", fromUserId: 7, msg: "I'd like to appeal the warning issued to my account. Can we discuss?", time: "4h ago", read: false, replies: [] },
    // THE REPORTED BUG: a per-publisher approval notice sent to toRole "publisher",
    // so EpicGamesStudio was told IndieDevStudios' game had gone live. Now direct to
    // the owning publisher (user_id 6). Game corrected too: HorrorEscape (game_id 4)
    // is still `pending` in this seed — the genuinely approved+enabled title for
    // publisher 6 is Hill Climbing (game_id 8), so the text now matches the data.
    { id: 7, toRole: null, toUser: 6, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "Your game 'Hill Climbing' has been approved and is now live!", time: "2h ago", read: false, replies: [] },
    // Genuinely the same message for every publisher — a legitimate broadcast.
    { id: 8, toRole: "publisher", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "Please update your publisher profile with a valid contact address.", time: "1d ago", read: true, replies: [] },
    { id: 9, toRole: null, toUser: 7, from: "ModeratorOne", avatar: "M1", fromRole: "moderator", fromUserId: 3, msg: "Your report on ToxicPlayer has been reviewed and resolved.", time: "5h ago", read: false, replies: [] },
    // Tournament registration is per player: only 7, 8, 9 and 10 are in F1 Grand Prix
    // (tournament_id 5) — ToxicPlayer (11) is not, yet the old broadcast told them
    // they were registered.
    { id: 10, toRole: null, toUser: 7, from: "System", avatar: "SY", fromRole: "admin", fromUserId: 2, msg: "You have been registered for the F1 2022 World Grand Prix. Good luck!", time: "1d ago", read: true, replies: [] },
    { id: 13, toRole: null, toUser: 8, from: "System", avatar: "SY", fromRole: "admin", fromUserId: 2, msg: "You have been registered for the F1 2022 World Grand Prix. Good luck!", time: "1d ago", read: true, replies: [] },
    { id: 14, toRole: null, toUser: 9, from: "System", avatar: "SY", fromRole: "admin", fromUserId: 2, msg: "You have been registered for the F1 2022 World Grand Prix. Good luck!", time: "1d ago", read: true, replies: [] },
    { id: 15, toRole: null, toUser: 10, from: "System", avatar: "SY", fromRole: "admin", fromUserId: 2, msg: "You have been registered for the F1 2022 World Grand Prix. Good luck!", time: "1d ago", read: true, replies: [] },
    // ── Direct messages (toUser) — visible only to that user ──────
    { id: 11, toRole: null, toUser: 8, from: "DragonSlayer", avatar: "DS", fromRole: "player", fromUserId: 7, msg: "Hey NightHawk! Want to queue for COD tonight? I saved a spot in Tactical Ops.", time: "2h ago", read: false, replies: [] },
    { id: 12, toRole: null, toUser: 8, from: "ModeratorOne", avatar: "M1", fromRole: "moderator", fromUserId: 3, msg: "NightHawk, your account has been flagged for review. Avoid session #7 until cleared.", time: "1h ago", read: false, replies: [] }
  ],

  // ── MATCHES — the record of a game actually being played ──
  //
  // This replaces `sessions`. They are not the same idea wearing a new name:
  //
  //   A SESSION was a ROOM. It had a host, a name, a maximum number of seats,
  //   and a list of who was currently sitting in it. It existed BEFORE anyone
  //   played and could exist without a game ever starting.
  //
  //   A MATCH is a PLAY. It comes into existence because someone played, it
  //   records what happened, and it is finished when the game is finished.
  //
  // The distinction is the whole point of this change. Playing Hill Climbing on
  // your own is a match — one player, no lobby, no third party — and the
  // platform telling that player "session ended" was describing machinery that
  // had nothing to do with what they just did. Multiplayer games matchmake
  // inside their own engine, so a platform room in front of them was a second
  // lobby the player had to pass through to reach the real one.
  //
  // A match row carries no host, no seat count and no member list. Who took
  // part is already recorded in `match_results`, one row per player per match,
  // which is where it always belonged — `getPlayerMatchHistory` reads opponents
  // from there today rather than from the junction.
  matches: [],

  // ── Tournament Engine Core ──
  tournament_matches: [],
  tournament_results: [],
  // Stages of a multi-game tournament. Server-driven, same as tournament_matches
  // above — this array is a cache of what /db-export sends, never written to
  // directly by client code.
  tournament_games: [],
  deleted_tournaments: [], // Tombstone tracking to prevent deleted seed tournaments from reappearing
  // Same idea for games. The backend treats `games` as append-only (a stale tab
  // was deleting freshly submitted games server-side just by syncing), so a
  // deletion now has to be declared here rather than implied by the game
  // missing from this array. DB.deleteGame() is the only thing that writes it.
  deleted_games: [],
  // Same mechanism for accounts. `users` is append-only on both sides of the
  // sync (a stale tab used to wipe every registered account), so removing a
  // row is not enough to delete an account — the next client that still has it
  // in localStorage posts it straight back. A tombstone here is how a deletion
  // is stated so it actually sticks.
  deleted_users: [],
};

// ============================================================
//  BACKWARD-COMPAT LAYER & LOCAL STORAGE HYDRATION
// ============================================================

(function () {
  // ── Critical DB Methods — defined FIRST, before any hydration check ──
  // These must always exist regardless of whether saved data is present.

  const DB_KEY = 'playcarys_db_store_v5';

  // Tracks the in-flight POST to the backend so navigation can wait for it.
  // Without this, "create room / save profile / register for tournament" followed
  // immediately by a page change lost the write: the browser cancels in-flight
  // requests on navigation, and the next page hydrates from the backend (which
  // never received the data) and overwrites the local copy.
  //
  // These are module-scope, NOT properties of DB — DB.save() serialises every
  // non-function property, so storing the payload on DB would nest each save
  // inside the next one and the body would grow until the server rejected it.
  let _pendingSync = null;
  let _lastPayload = null;

  // ── Append-only tables and how to identify a row in them ────────────────────
  // A match you played is a historical fact. Nothing arriving from the server or
  // another tab is allowed to delete one, so these tables are UNIONED on sync
  // rather than overwritten. Everything else still takes the server's copy,
  // which is what lets admin edits propagate.
  const APPEND_ONLY = {
    match_results: r => String(r.session_id) + '|' + String(r.player_id),
    sessions: r => String(r.session_id || r.id),
    // A match that was played is a historical fact, exactly like the
    // match_results rows that hang off it — same union treatment, so no stale
    // tab can delete someone's play out from under them.
    matches: r => String(r.match_id),
    telemetry: r => String(r.id),
    highlights: r => String(r.userId) + '|' + String(r.gameId) + '|' + String(r.time),
    // ACCOUNTS TOO. Registered users were being destroyed by exactly the same
    // mechanism as the matches: any client whose local user list was still the
    // 12-user seed deleted every real account from the backend on its next save.
    // Four registered accounts were lost that way.
    //
    // Keyed on USER_ID, not email. Email was chosen originally because user_id had
    // been corrupted to the string "undefined" — that bug is fixed and ids are now
    // normalised on load, whereas email is USER-EDITABLE. Keying on a mutable field
    // meant that editing your email changed your identity: the union saw the
    // pre-edit row as one "the client didn't send" and preserved it, so every
    // profile edit forked the account into two rows. The stale one still answered
    // to the old username and password, which is exactly why profile changes
    // looked like they had not applied. Fall back to email only for a row with no
    // usable id at all.
    users: u => (u.user_id != null && String(u.user_id) !== 'undefined')
      ? 'id:' + String(u.user_id)
      : 'em:' + String(u.email),
    player_profiles: p => String(p.user_id),
    // NOTIFICATIONS TOO. Every client POSTs its whole DB, and notifications were
    // truncate-and-replaced on both ends — so a friend request or chat message
    // created on one laptop was deleted by the very next routine save from the
    // other (a login-streak write, a presence heartbeat) before the recipient ever
    // saw it. Measured: a notification written straight to the backend vanished
    // within seconds. Unioning by id keeps every message; "Clear All" now
    // tombstones with `cleared` instead of splicing, so clearing still works.
    notifications: n => String(n.id),
    // player_tournament is NOT append-only because players can withdraw/unregister.
    // FRIENDSHIPS. The backend has always treated this as append-only; the
    // frontend did not, so a client with a stale copy could delete a friendship
    // for BOTH people just by saving. One row per pair, user_a always the lower
    // id, so (7,8) and (8,7) can never become two rows. Unfriending sets
    // removed_at, which is an ordinary field update on the surviving row.
    friendships: f => String(f.user_a) + '|' + String(f.user_b),
    // Requests are historical facts too — and the rejection timestamp is what
    // the re-request cooldown reads, so losing one would reopen that hole.
    friend_requests: r => String(r.id),
    // The tombstone lists must be append-only themselves, or the protection
    // they provide unravels: a client that has never seen the deletion sends an
    // empty list, that wipes the tombstone, and the next sync from a tab still
    // holding the account re-creates it.
    deleted_users: d => String(d && typeof d === 'object' ? (d.user_id != null ? d.user_id : d.id) : d),
    deleted_games: d => String(d && typeof d === 'object' ? (d.game_id != null ? d.game_id : d.id) : d)
  };

  /** ids of accounts deleted on purpose, from both the local and remote lists. */
  function removedUserIds(remote) {
    const out = new Set();
    [].concat(DB.deleted_users || [], (remote && remote.deleted_users) || []).forEach(d => {
      if (d == null) return;
      out.add(String(typeof d === 'object' ? (d.user_id != null ? d.user_id : d.id) : d));
    });
    return out;
  }

  // Everything a deleted account leaves behind. The account row itself is only
  // half of it: match_results, sessions and player_session are APPEND-ONLY on
  // both sides of the sync, so without this the account disappears while its
  // matches, rooms and notifications keep coming back from the first stale tab
  // that syncs — orphan history rows pointing at a player who no longer exists,
  // which is what the leaderboard and Match History then try to render.
  const USER_REFS = {
    users:              ['user_id'],
    player_profiles:    ['user_id'],
    publisher_profiles: ['user_id'],
    match_results:      ['player_id'],
    player_tournament:  ['player_id'],
    sessions:           ['created_by', 'hostId'],
    // A match has no host and no member list — `created_by` is simply who
    // started the play. Deleting an account still has to take their matches
    // with it, for the same reason it takes their match_results.
    matches:            ['created_by'],
    // Deleting an account must take its friendships and requests with it, or
    // the friends list renders rows pointing at a player who no longer exists.
    friendships:        ['user_a', 'user_b'],
    friend_requests:    ['from_user', 'to_user'],
    notifications:      ['toUser', 'fromUserId'],
    reviews:            ['playerId'],
    highlights:         ['userId'],
    transactions:       ['user_id'],
    user_cosmetics:     ['user_id'],
    subscriptions:      ['user_id']
  };

  // A player reference that is not an identifier at all. These come from writes
  // that ran before the id was resolved, and they are unfixable rather than
  // merely orphaned: there is no account to tombstone, so cleaning the server
  // alone never held — match_results is append-only, so the first browser to
  // sync pushed its copy straight back. They have to be rejected on the way in.
  //
  // NaN does not survive JSON — JSON.stringify writes it as null — so a missing
  // owner has to be caught as null too. That is only safe on tables where a row
  // without an owner is meaningless, hence this explicit list: `sessions` and
  // `notifications` are excluded because a null there is legitimate (an unhosted
  // room; a notification addressed to a whole role through toRole).
  const OWNER_REQUIRED = {
    match_results: 'player_id',
    player_tournament: 'player_id',
    player_profiles: 'user_id',
    publisher_profiles: 'user_id',
    reviews: 'playerId'
  };
  const JUNK_REF = new Set(['nan', 'null', 'undefined', '']);

  /** Drop rows whose owner is NaN / null / "" — nobody, not just nobody yet. */
  function dropUnidentifiableRows() {
    let dropped = 0;
    Object.keys(OWNER_REQUIRED).forEach(table => {
      if (!Array.isArray(DB[table])) return;
      const owner = OWNER_REQUIRED[table];
      const before = DB[table].length;
      DB[table] = DB[table].filter(r => {
        if (!r) return false;
        if (r[owner] == null) return false;
        return !JUNK_REF.has(String(r[owner]).trim().toLowerCase());
      });
      dropped += before - DB[table].length;
    });
    return dropped;
  }

  /** Drop every row belonging to a deleted account. Returns how many went. */
  function dropRowsForRemovedUsers(removed) {
    if (!removed || !removed.size) return 0;
    let dropped = 0;
    Object.keys(USER_REFS).forEach(table => {
      if (!Array.isArray(DB[table])) return;
      const fields = USER_REFS[table];
      const before = DB[table].length;
      DB[table] = DB[table].filter(r =>
        !(r && fields.some(f => r[f] != null && removed.has(String(r[f]))))
      );
      dropped += before - DB[table].length;
    });
    if (DB.favorites && typeof DB.favorites === 'object' && !Array.isArray(DB.favorites)) {
      Object.keys(DB.favorites).forEach(k => {
        if (removed.has(String(k))) { delete DB.favorites[k]; dropped++; }
      });
    }
    return dropped;
  }

  /** Of two ISO timestamps return the later one (either may be missing/invalid). */
  function newerStamp(a, b) {
    const ta = a ? Date.parse(a) : NaN;
    const tb = b ? Date.parse(b) : NaN;
    if (isNaN(ta)) return b;
    if (isNaN(tb)) return a;
    return ta >= tb ? a : b;
  }

  // ── Repair mis-addressed notification rows ──────────────────────────────────
  //
  // Two defects wrote rows that reach the wrong people, and both left data behind
  // in live_database.json and in every client's localStorage — fixing the code
  // alone is not enough, the existing rows have to be repaired:
  //
  //  (a) dispatchRoleNotification() set BOTH toRole and toUser on each of its
  //      per-recipient copies. Every visibility filter ORs the two fields, so each
  //      copy was ALSO delivered to the whole role: with 2 admins each admin saw
  //      the message twice, and a per-user message written this way went to
  //      everyone in the role.
  //  (b) Seed rows 5, 6, 7 and 10 are personal messages ("your game", "your
  //      queue") addressed to a whole role. Row 7 is the reported bug: every
  //      publisher was told a game had been approved, including the ones who do
  //      not own it.
  //
  // This runs on every merge, not once behind a localStorage flag, because the
  // server and any stale tab keep re-sending the unrepaired rows — a boot-only
  // pass was undone by the next live sync a few seconds later. It is idempotent
  // and only touches rows still carrying the defect.
  const NOTIF_RETARGET = {
    5: { toUser: 3 },   // "your queue" → ModeratorOne
    6: { toUser: 3 },   // a player's private appeal → the moderator handling it
    7: { toUser: 6, msg: "Your game 'Hill Climbing' has been approved and is now live!" },
    10: { toUser: 7 }    // F1 registration → the player who actually registered
  };
  DB.repairNotificationAddressing = function () {
    let changed = false;
    (DB.notifications || []).forEach(n => {
      if (n.toRole != null && n.toUser != null) {          // (a)
        n.toRole = null;
        changed = true;
      }
      const fix = NOTIF_RETARGET[n.id];                     // (b)
      if (fix && n.toUser == null) {
        n.toRole = null;
        n.toUser = fix.toUser;
        if (fix.msg) n.msg = fix.msg;
        changed = true;
      }
    });
    return changed;
  };

  // Folds a remote snapshot into DB without losing local history.
  DB.mergeRemoteState = function (remote) {
    if (!remote || typeof remote !== 'object') return 0;
    let kept = 0;
    Object.keys(remote).forEach(table => {
      const keyOf = APPEND_ONLY[table];
      if (!keyOf || !Array.isArray(remote[table]) || !Array.isArray(DB[table])) {
        DB[table] = remote[table];               // ordinary table: server wins
        return;
      }
      // Update matching rows IN PLACE instead of swapping in the remote object.
      //
      // Pages hold live references into these arrays — room-lobby keeps
      // `currentSession` pointing at a DB.sessions row for the whole lobby. Now that
      // a merge happens every few seconds (live sync) rather than only at boot,
      // replacing the row object would leave the page mutating a detached copy: the
      // host would set status='in-progress' on an orphan and DB.save() would write
      // the untouched original. Copying the fields across keeps every reference —
      // and every compat getter already attached to the row — valid.
      const localByKey = new Map();
      DB[table].forEach(r => localByKey.set(keyOf(r), r));

      const merged = [];
      const seen = new Set();
      remote[table].forEach(remoteRow => {
        const k = keyOf(remoteRow);
        const localRow = localByKey.get(k);
        if (localRow && localRow !== remoteRow) {
          Object.keys(remoteRow).forEach(field => {
            // Never write through a back-compat getter: those are derived values
            // with no setter, and assigning to one silently drops the update.
            const d = Object.getOwnPropertyDescriptor(localRow, field);
            if (d && d.get && !d.set) return;
            // lastSeen only ever moves FORWARD.
            //
            // Presence is a heartbeat, but every client POSTs the whole user list —
            // so laptop A's snapshot carries a stale lastSeen for laptop B and would
            // drag B's fresh stamp backwards on every sync, flapping B between
            // Online and Offline. Whoever holds the newer stamp wins.
            if (field === 'lastSeen' && newerStamp(localRow.lastSeen, remoteRow.lastSeen) === localRow.lastSeen) return;
            // readBy / clearedBy are per-user state on a SHARED broadcast row, so
            // they union rather than overwrite. Field-level "server wins" would
            // mean laptop B's older copy erased laptop A's "I read this" — the
            // announcement would pop back up unread for A on the next sync.
            if ((field === 'readBy' || field === 'clearedBy') && Array.isArray(remoteRow[field])) {
              const union = new Set((localRow[field] || []).map(String));
              remoteRow[field].forEach(x => union.add(String(x)));
              localRow[field] = [...union];
              return;
            }
            localRow[field] = remoteRow[field];
          });
          merged.push(localRow);
        } else {
          merged.push(remoteRow);
        }
        seen.add(k);
      });
      DB[table].forEach(localRow => {
        const k = keyOf(localRow);
        if (!seen.has(k)) { merged.push(localRow); seen.add(k); kept++; }  // local-only survives
      });
      DB[table] = merged;
    });
    // Apply account tombstones AFTER the union. The union is what keeps real
    // accounts alive through a stale sync; this is the one thing allowed to
    // override it, and only for rows an admin deliberately deleted.
    dropRowsForRemovedUsers(removedUserIds(remote));
    dropUnidentifiableRows();

    // The server still holds unrepaired rows from before this fix, and it re-sends
    // them on every sync — repair them on the way in, or the badge and the drawer
    // go back to showing other people's notifications a few seconds after boot.
    DB.repairNotificationAddressing();

    // Same reasoning for friendships. The stored user rows still carry the old
    // nested `friends` arrays, so every sync re-delivers them; folding them here
    // is what stops the server's copy landing on top of the migrated table and
    // resurrecting a format we no longer read.
    if (typeof DB.foldLegacyFriendArrays === 'function') DB.foldLegacyFriendArrays();

    if (kept) console.info('[PlayCarys] Sync kept ' + kept + ' local row(s) the server did not have.');
    return kept;
  };

  // Per-table snapshot of what was last POSTed, so save() can send only what
  // actually changed. Keyed by table name, value is that table's JSON.
  let _sentTables = null;

  DB.save = function () {
    attachBackCompatGetters();
    const toSave = {};
    Object.keys(DB).forEach(key => {
      if (typeof DB[key] !== 'function') toSave[key] = DB[key];
    });
    const payload = JSON.stringify(toSave);
    // Persist to localStorage for instant offline access. This stays WHOLE —
    // the cache is the offline fallback and has to hold everything.
    localStorage.setItem(DB_KEY, payload);
    _lastPayload = payload;

    // ── Send only the tables that changed ─────────────────────
    // Every save used to POST the entire database back, so moving one row in
    // one table re-uploaded all of them. db-import merges per table and skips
    // any table absent from the body, so omitting an unchanged table means
    // "no change" — which is exactly what it is.
    //
    // The first save of a page still sends everything: with no baseline to
    // diff against, "unchanged" cannot be established, and guessing wrong
    // silently drops a write.
    let body = payload;
    const nextSent = {};
    Object.keys(toSave).forEach(k => { nextSent[k] = JSON.stringify(toSave[k]); });

    if (_sentTables) {
      const delta = {};
      let changed = 0;
      Object.keys(nextSent).forEach(k => {
        if (nextSent[k] !== _sentTables[k]) { delta[k] = toSave[k]; changed++; }
      });
      // Nothing to say. Skipping the request entirely is the point: the idle
      // save loop used to re-POST the whole database on a timer.
      if (!changed) { _sentTables = nextSent; return; }
      body = JSON.stringify(delta);
    }
    _sentTables = nextSent;

    // Sync to NestJS backend
    try {
      _pendingSync = fetch(window.PC_API + '/db-import', {
        method: 'POST',
        // Carry the signed token when there is one. The backend refuses role
        // and status changes from an unsigned sync — that is what stops an
        // anonymous POST here from promoting an account to superuser — so the
        // staff pages must identify themselves to keep working.
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          (typeof Auth !== 'undefined' && Auth.apiAuthHeaders) ? Auth.apiAuthHeaders() : {}
        ),
        body: body
      }).then(res => {
        _pendingSync = null;
        // Report rejections instead of hiding them — a silent failure here means
        // the other laptop never sees the change, with nothing in the console.
        if (!res.ok) {
          console.error('[PlayCarys] Backend rejected DB sync:', res.status, res.statusText,
            '(payload ' + Math.round(payload.length / 1024) + ' KB)');
          return;
        }
        if (window.playcarysSocket) {
          window.playcarysSocket.emit('global_db_update');
        }
      }).catch((err) => {
        _pendingSync = null;
        console.warn('[PlayCarys] DB sync failed, using localStorage only:', err && err.message);
      });
    } catch (e) { _pendingSync = null; }
    return _pendingSync;
  };

  // Resolve once the backend has the latest state (or after `timeoutMs`, so a
  // dead backend can never freeze navigation). Used by navigate()/navigateTo().
  DB.whenSynced = function (timeoutMs) {
    if (!_pendingSync) return Promise.resolve();
    return Promise.race([
      _pendingSync,
      new Promise(resolve => setTimeout(resolve, timeoutMs || 1500))
    ]);
  };

  // Backstop for code paths that set window.location directly instead of going
  // through navigate(). sendBeacon is not cancelled when the page goes away.
  DB.flushSync = function () {
    if (!_pendingSync || !_lastPayload) return;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          window.PC_API + '/db-import',
          new Blob([_lastPayload], { type: 'application/json' })
        );
      }
    } catch (e) { /* best effort */ }
  };
  window.addEventListener('pagehide', DB.flushSync);

  // localStorage-only save — used on beforeunload to avoid blocking page navigation
  // with a pending network request.
  /**
   * Remove a game AND record why it is gone.
   *
   * Splicing DB.games alone is no longer enough: the backend keeps game rows a
   * client did not send, because a tab holding a pre-submission snapshot was
   * silently deleting other people's newly published games on every save. The
   * tombstone is how this client states the absence is deliberate.
   */
  DB.deleteGame = function (gameId) {
    const sid = String(gameId);
    if (!Array.isArray(DB.deleted_games)) DB.deleted_games = [];
    const idx = DB.games.findIndex(g => String(g.game_id != null ? g.game_id : g.id) === sid);
    if (idx !== -1) DB.games.splice(idx, 1);
    if (!DB.deleted_games.some(d => String(d && d.game_id != null ? d.game_id : d) === sid)) {
      DB.deleted_games.push({ game_id: sid, deleted_at: new Date().toISOString() });
    }
    return idx !== -1;
  };

  /** Normalise an account to a lowercase role name, from either `role` or `role_id`. */
  DB.roleKeyOf = function (user) {
    if (!user) return '';
    if (user.role) return String(user.role).trim().toLowerCase();
    const r = (DB.roles || []).find(x => String(x.role_id) === String(user.role_id));
    return r ? String(r.role_name).trim().toLowerCase() : '';
  };

  /**
   * Is this email already used by an account of the SAME role?
   *
   * Email deliberately is NOT globally unique. Nothing signs in with it —
   * doPanelLogin() matches on username (or a publisher's phone) and then
   * enforces the role of the panel that was used, so a shared email creates no
   * ambiguity anywhere in the login path. Enforcing global uniqueness
   * therefore protected nothing while blocking a legitimate, common case: one
   * person who plays games AND runs a studio has two accounts and one inbox.
   *
   * Uniqueness WITHIN a role is still enforced, so an email can never produce
   * two player accounts or two studios. Username stays globally unique,
   * because that is the actual login identifier.
   *
   * @param {string} email          address being claimed
   * @param {string|number} role    role name ('player') or role_id (4)
   * @param {string|number} [excludeUserId]  ignore this account (edit flows)
   */
  DB.emailTakenForRole = function (email, role, excludeUserId) {
    const target = String(email || '').trim().toLowerCase();
    if (!target) return false;

    let wantRole = String(role || '').trim().toLowerCase();
    if (/^\d+$/.test(wantRole)) {
      const r = (DB.roles || []).find(x => String(x.role_id) === wantRole);
      wantRole = r ? String(r.role_name).trim().toLowerCase() : wantRole;
    }

    const skip = excludeUserId == null ? null : String(excludeUserId);

    return (DB.users || []).some(u => {
      const uid = String(u.user_id != null ? u.user_id : u.id);
      if (skip !== null && uid === skip) return false;
      if (String(u.email || '').trim().toLowerCase() !== target) return false;
      return DB.roleKeyOf(u) === wantRole;
    });
  };

  DB.recordMatchResult = function (sessionId, playerId, gameId, result, gameScore, extraData) {
    if (!DB.match_results) DB.match_results = [];
    // Prevent duplicate entries
    const exists = DB.match_results.find(m => String(m.session_id) === String(sessionId) && String(m.player_id) === String(playerId));
    if (exists) return false;

    // Generic Default Fallback Formula (used only if a game doesn't specify its own rules)
    const cBase = result === 'win' ? 100 : result === 'draw' ? 25 : (result === 'loss' ? 15 : 10);
    const gidStr = String(gameId);
    const cMulti = gidStr === '7' ? 1.5 : gidStr === '8' ? 1.1 : 1.0;
    let pcp = Math.round(cBase * cMulti);

    let xp = result === 'win' ? 150 : result === 'draw' ? 75 : (result === 'loss' ? 25 : 25);

    // ── DELEGATION: Let games define their own rules ──
    if (extraData && extraData.carys_earned !== undefined) pcp = extraData.carys_earned;
    if (extraData && extraData.xp_gained !== undefined) xp = extraData.xp_gained;

    const rankMap = { win: 1, draw: 1, loss: 2, completed: 2 };

    const newResult = {
      session_id: String(sessionId),
      player_id: playerId,
      game_id: gameId,
      // A game that did not report a score scores 0. This used to fabricate one
      // with Math.random()*3000 + 1000, which wrote a believable-looking number
      // into permanent match history and onto the leaderboard - indistinguishable
      // afterwards from a score somebody actually earned.
      score: gameScore != null ? gameScore : 0,
      player_rank: rankMap[result] || 2,
      joined_at: new Date().toISOString(),
      result: result,
      carys_earned: pcp,
      xp_gained: xp
    };

    // A game may attach its own result metrics, but NOT its private economy.
    //
    // The platform's ledger is PlayCarys Points. Hill Climbing's coins and
    // diamonds are that game's internal currency and now live in the game's own
    // store; elo_delta was a chess rating the platform had no use for (Hill
    // Climbing was passing a meaningless 0 on every run just to fill the column).
    // Anything a game sends under these names is dropped here rather than
    // silently entering the platform's schema.
    const GAME_PRIVATE_FIELDS = ['coins', 'diamonds', 'elo_delta'];
    if (extraData) {
      Object.keys(extraData).forEach(k => {
        if (GAME_PRIVATE_FIELDS.includes(k)) return;
        newResult[k] = extraData[k];
      });
    }

    DB.match_results.unshift(newResult);

    // Award PCP to profile
    if (DB.awardPoints) DB.awardPoints(playerId, pcp);

    // XP is a platform stat; elo is not, and is no longer tracked here.
    const user = DB.users.find(u => String(u.id || u.user_id) === String(playerId));
    if (user && user.xp !== undefined) user.xp += xp;

    return true;
  };

  // ── MATCHES ────────────────────────────────────────────────────────────────
  //
  // One place that creates a match, instead of the four hand-written session
  // literals this replaces (the catalogue, the dashboard, Hill Climbing and the
  // dead tournament path). Each of those built the row slightly differently —
  // different fields present, different status spellings, `created_by` a string
  // in one and a number in another — and every difference became a special case
  // somewhere downstream.

  /** True while a match row is being played. */
  function nowIso() { return new Date().toISOString(); }

  /**
   * Start a match. Returns its match_id.
   *
   * There is no host, no seat count and no member list: a match records that a
   * play happened, and who took part is recorded per player in match_results
   * when the result comes in.
   */
  DB.startMatch = function (gameId, opts) {
    opts = opts || {};
    if (!Array.isArray(DB.matches)) DB.matches = [];

    const g = DB.games.find(x => String(x.game_id != null ? x.game_id : x.id) === String(gameId)) || {};
    const gidNum = parseInt(gameId, 10);
    const started = nowIso();

    // Ids are strings everywhere now. A timestamp plus a small random suffix,
    // because two players starting a match in the same millisecond is exactly
    // the kind of thing that happens once and is then impossible to debug.
    const match_id = String(
      opts.match_id != null ? opts.match_id : 'M' + Date.now() + Math.floor(Math.random() * 1000)
    );

    const uid = opts.created_by != null ? parseInt(opts.created_by, 10) : NaN;

    // Who is playing. Defaults to just the creator, which is the whole story for
    // a single-player game; chess passes both players. Written once, here, and
    // never edited — a match does not gain or lose players the way a lobby did.
    const participants = [...new Set(
      (Array.isArray(opts.participants) && opts.participants.length ? opts.participants : [opts.created_by])
        .map(p => parseInt(p, 10))
        .filter(p => !isNaN(p))
    )];

    const match = {
      match_id: match_id,
      game_id: isNaN(gidNum) ? gameId : gidNum,
      game: g.game_name || opts.game || 'Unknown game',
      status: 'in-progress',
      mode: opts.mode === 'ranked' ? 'ranked' : 'casual',
      start_time: started,
      end_time: null,
      duration: 0,
      created_at: started,
      created_by: isNaN(uid) ? null : uid,
      participants: participants
    };

    DB.matches.push(match);
    DB.save();
    return match_id;
  };

  /**
   * Finish a match.
   *
   * Kept separate from recording the result because they are different facts:
   * a game may report several players' results for one match, but the match
   * itself ends once.
   */
  DB.endMatch = function (match_id, opts) {
    opts = opts || {};
    if (!Array.isArray(DB.matches)) return false;
    const m = DB.matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return false;

    m.status = 'completed';
    m.end_time = opts.end_time || nowIso();
    if (Number.isFinite(Number(opts.duration))) {
      m.duration = Number(opts.duration);
    } else if (m.start_time) {
      // Seconds, rounded. Derived rather than trusted from the game: duration
      // feeds play_time on the profile, so a game reporting its own is a game
      // reporting its own leaderboard position.
      const secs = Math.round((Date.parse(m.end_time) - Date.parse(m.start_time)) / 1000);
      if (Number.isFinite(secs) && secs >= 0) m.duration = secs;
    }
    DB.save();
    return true;
  };

  /**
   * Unlock an achievement from a BUILTIN game.
   *
   * Chess and Hill Climbing are shipped inside the platform and run on its own
   * origin, so they never load the SDK and never go through play.html's
   * postMessage bridge — which is where PLAYCARYS_UNLOCK_ACHIEVEMENT is handled.
   * The consequence was that the achievements seeded against games 7 and 8
   * ("First Descent", "Summit Seeker", "Winner", "Tactician") could not fire at
   * all: nothing in either game had any way to report them.
   *
   * This is the equivalent path for a builtin — the same endpoint the SDK
   * reaches, called directly. It sends a CODE and nothing else, exactly like an
   * uploaded game would: the reward, the once-per-player rule and the approval
   * check all stay server-side, so being first-party buys no extra trust.
   *
   * Fire-and-forget on purpose. An achievement is a bonus; failing to record one
   * must never interrupt the end of a match.
   */
  DB.unlockAchievement = function (gameId, code, matchId) {
    try {
      const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      if (!s || s.userId == null || !code) return Promise.resolve(null);

      return fetch(window.PC_API + '/achievements/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: parseInt(String(gameId).replace('g', ''), 10),
          user_id: parseInt(s.userId, 10),
          code: String(code),
          session_id: matchId ? String(matchId) : undefined
        })
      }).then(function (res) { return res.ok ? res.json() : null; })
        .then(function (result) {
          if (result && result.unlocked && typeof Toast !== 'undefined') {
            Toast.success('🏅 ' + ((result.achievement && result.achievement.name) || 'Achievement') +
              (result.carys_granted ? ' · +' + result.carys_granted + ' Carys' : ''));
          }
          return result;
        }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  };

  /**
   * Ask the platform to grant any PLATFORM achievements this player now
   * qualifies for ("play your first match", "make 5 friends").
   *
   * The platform measures these from its own data — a game cannot see how many
   * friends someone has, and should not be trusted with it if it could.
   */
  DB.evaluatePlatformAchievements = function () {
    try {
      const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      if (!s || s.userId == null) return Promise.resolve(null);
      return fetch(window.PC_API + '/players/' + parseInt(s.userId, 10) + '/achievements/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(function (res) { return res.ok ? res.json() : null; })
        .then(function (out) {
          if (out && out.granted && typeof Toast !== 'undefined') {
            out.achievements.forEach(function (g) {
              Toast.success('🌟 ' + ((g.achievement && g.achievement.name) || 'Achievement') +
                (g.carys_granted ? ' · +' + g.carys_granted + ' Carys' : ''));
            });
          }
          return out;
        }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  };

  /**
   * The match a player is in right now, or null. Replaces Presence.liveSessionOf.
   *
   * `maxAgeMs` is required evidence that the match is genuinely live. Nothing
   * closes a match if the player simply shuts the tab, so without an age limit
   * anyone who had ever pressed Play would read as "Playing" for ever — which is
   * exactly what used to happen with abandoned solo sessions.
   */
  DB.liveMatchOf = function (userId, maxAgeMs) {
    if (!Array.isArray(DB.matches)) return null;
    const uid = String(userId);
    const limit = Number.isFinite(maxAgeMs) ? maxAgeMs : 3 * 60 * 60 * 1000;

    const mine = DB.matches.filter(m => {
      if (m.status !== 'in-progress') return false;
      // Either player of a chess game is playing it, not just whoever started it.
      const inIt = Array.isArray(m.participants)
        ? m.participants.some(p => String(p) === uid)
        : String(m.created_by) === uid;
      if (!inIt) return false;
      const started = Date.parse(m.start_time || m.created_at || '');
      if (isNaN(started)) return false;
      return Date.now() - started <= limit;
    });

    if (!mine.length) return null;
    // Newest first — an abandoned older row must not mask the current play.
    mine.sort((a, b) => Date.parse(b.start_time || 0) - Date.parse(a.start_time || 0));
    return mine[0];
  };

  DB.saveLocal = function () {
    attachBackCompatGetters();

    // REMOVED: the auto-generate-match-results loop.
    //
    // On EVERY save it walked every completed session, worked out who had been
    // in it (from `players_arr`, or the virtual `players` getter, or the
    // junction), guessed each player's result from their POSITION in that list
    // — index 0 is White — and wrote a match_result for them.
    //
    // Two things were wrong with it. Inferring a chess result from list order
    // is a coin flip dressed as a fact, and recordMatchResult dedupes on
    // (session, player), so whatever it guessed the first time was frozen
    // permanently into carys_earned, matches_won and the leaderboard. And it
    // was a write hiding inside a save: calling saveLocal() for any reason at
    // all could mint match history as a side effect.
    //
    // A game now reports its own result when it finishes, which is the only
    // place the truth is actually known. Chess writes both players' rows with
    // their real colours; Hill Climbing writes its own run.

    const toSave = {};
    Object.keys(DB).forEach(key => {
      if (typeof DB[key] !== 'function') toSave[key] = DB[key];
    });
    localStorage.setItem(DB_KEY, JSON.stringify(toSave));
  };

  DB.attachReportGetters = function (r) {
    if (!r || r._rGetters) return r;
    Object.defineProperties(r, {
      id: { get() { return String(r.report_id || r._dynId || 'N/A'); }, enumerable: false, configurable: true },
      reporterId: { get() { const uid = r.reported_by || r.reporterId; return uid != null ? String(uid) : null; }, enumerable: false, configurable: true },
      reporterName: {
        get() {
          if (r._reporterName) return r._reporterName;
          const uid = r.reported_by;
          const u = DB.users.find(u => u.user_id === uid || String(u.user_id) === String(uid));
          return u ? (u.user_name || u.username) : 'Unknown';
        }, enumerable: false, configurable: true
      },
      reportedId: { get() { const uid = r.reported_user || r.reportedId; return uid != null ? String(uid) : null; }, enumerable: false, configurable: true },
      reportedName: {
        get() {
          if (r._reportedName) return r._reportedName;
          const uid = r.reported_user;
          if (uid == null) return '—';
          const u = DB.users.find(u => u.user_id === uid || String(u.user_id) === String(uid));
          return u ? (u.user_name || u.username) : 'Unknown';
        }, enumerable: false, configurable: true
      },
      desc: { get() { return r.reason || r._desc || ''; }, enumerable: false, configurable: true }
    });
    r._rGetters = true;
    return r;
  };

  // ── Tournament Engine Methods ──

  // ── Shared helpers (used by getPlayerMatchHistory AND getPlayerStats) ──────────────────
  function _deriveResult(r) {
    if (r.result && typeof r.result === 'string') {
      const res = r.result.toLowerCase();
      if (['win', 'loss', 'draw'].includes(res)) return res;
      return 'draw'; // completed, unknown, etc
    }
    if (r.player_rank != null) return Number(r.player_rank) === 1 ? 'win' : 'loss';
    return 'draw';
  }

  // Carys awarded for a result.
  //
  // `score` IS NOT CARYS. It is the in-game score — 4200 for a Call of Duty
  // match, 9826 for a Hill Climbing run — and the seeded rows carry ONLY that
  // field, with no carys_earned at all. Falling back to it meant a match that
  // should award ~110 Carys was reported as awarding 4200, which is why the
  // Match History summary read "+5124 Carys earned" and why individual rows
  // showed things like "+340 Carys" for a 340m run (that row's score was 340).
  //
  // Rows written by recordMatchResult() always set carys_earned explicitly, so
  // the formula below is only ever used for legacy/seed rows that never had it.
  function _computeCarys(r) {
    if (r.carys_earned != null) return r.carys_earned;
    const result = _deriveResult(r);
    const base = result === 'win' ? 100 : result === 'draw' ? 25 : 15;
    const gid = String(r.game_id || '');
    const multi = gid === '7' ? 1.5 : gid === '8' ? 1.1 : 1.0;
    return Math.round(base * multi);
  }

  function _computeXP(r) {
    if (r.xp_gained != null) return r.xp_gained;
    const result = _deriveResult(r);
    return result === 'win' ? 150 : result === 'draw' ? 75 : 25;
  }

  function _computeEloDelta(r) {
    if (r.elo_delta != null) return r.elo_delta;
    const result = _deriveResult(r);
    return result === 'win' ? 25 : result === 'draw' ? 5 : -25;
  }

  DB.generateBracket = function (tournament_id) {
    const t = this.tournaments.find(x => String(x.id) === String(tournament_id) || String(x.tournament_id) === String(tournament_id));
    // Throw instead of returning quietly: the caller (publish-tournament.html)
    // reports "Tournament Started! Bracket generated." on anything that is not an
    // exception, so a silent return told the publisher it had worked while nothing
    // had been created.
    if (!t) throw new Error('Tournament not found.');

    // Get registered players and sort by PCP (seed 1 = highest points)
    const pids = this.player_tournament
      .filter(pt => String(pt.tournament_id) === String(tournament_id))
      .map(pt => String(pt.player_id))
      .sort((a, b) => {
        const uA = this.users.find(u => String(u.id) === a || String(u.user_id) === a);
        const uB = this.users.find(u => String(u.id) === b || String(u.user_id) === b);
        return (uB?.carys_points || 0) - (uA?.carys_points || 0);
      });

    if (pids.length < 2) throw new Error('At least 2 players are required to start a tournament.');

    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(pids.length)));

    // Mathematical tournament fold algorithm (1v8, 4v5, 2v7, 3v6...)
    let order = [1];
    for (let i = 1; i <= Math.log2(nextPow2); i++) {
      const nextOrder = [];
      const sum = Math.pow(2, i) + 1;
      for (let j = 0; j < order.length; j++) {
        nextOrder.push(order[j], sum - order[j]);
      }
      order = nextOrder;
    }

    const seeds = order.map(slot => slot <= pids.length ? pids[slot - 1] : "BYE");

    for (let i = 0; i < nextPow2; i += 2) {
      this.tournament_matches.push({
        match_id: `T${tournament_id}R1M${i / 2}`,
        tournamentId: tournament_id, round: 1,
        player1: seeds[i], player2: seeds[i + 1],
        score1: 0, score2: 0, status: (seeds[i] === "BYE" || seeds[i + 1] === "BYE") ? "completed" : "waiting",
        winnerId: seeds[i + 1] === "BYE" ? seeds[i] : (seeds[i] === "BYE" ? seeds[i + 1] : null),
        parentMatchId: `T${tournament_id}R2M${Math.floor(i / 4)}`
      });
    }

    const totalRounds = Math.log2(nextPow2);
    let currentRoundMatches = nextPow2 / 4;
    for (let r = 2; r <= totalRounds; r++) {
      for (let i = 0; i < currentRoundMatches; i++) {
        this.tournament_matches.push({
          match_id: `T${tournament_id}R${r}M${i}`,
          tournamentId: tournament_id, round: r,
          player1: null, player2: null, score1: 0, score2: 0, status: "waiting",
          winnerId: null, parentMatchId: r < totalRounds ? `T${tournament_id}R${r + 1}M${Math.floor(i / 2)}` : null
        });
      }
      currentRoundMatches /= 2;
    }

    // Auto-advance players with a BYE.
    // Compare the tournament id as a string: startTournament() passes it in from an
    // inline onclick (always a string) while seeded rows store a number, so a strict
    // === here matched nothing and byes were left stranded in round 1 — the bracket
    // then could never be advanced because those matches had no winner fed forward.
    this.tournament_matches
      .filter(m => String(m.tournamentId) === String(tournament_id) && Number(m.round) === 1 && m.status === 'completed' && m.winnerId)
      .forEach(m => this.advanceMatch(m.match_id, m.winnerId));

    t.status = 'in-progress';
    this.save();
  };

  DB.reportResult = function (match_id, winner_id, reporter_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return;
    m.status = 'pending';
    m.reportedWinner = winner_id;
    m.reportedBy = reporter_id;
    this.save();
  };

  DB.confirmResult = function (match_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m || !m.reportedWinner) return;
    this.advanceMatch(match_id, m.reportedWinner);
  };

  DB.disputeResult = function (match_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return;
    m.status = 'disputed';
    this.save();
  };

  DB.advanceMatch = function (match_id, winner_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return;

    m.status = 'completed';
    m.winnerId = winner_id;
    m.score1 = (winner_id === m.player1 ? 1 : 0);
    m.score2 = (winner_id === m.player2 ? 1 : 0);

    if (m.parentMatchId) {
      const parent = this.tournament_matches.find(x => String(x.match_id) === String(m.parentMatchId));
      if (parent) {
        if (!parent.player1) parent.player1 = winner_id;
        else parent.player2 = winner_id;
      }
    } else {
      const t = this.tournaments.find(x => String(x.id) === String(m.tournamentId));
      if (t) t.status = 'completed';
    }
    this.save();
  };

  DB.awardPoints = function (userId, points, isRanked = false, opponentLevel = null) {
    const prof = DB.player_profiles.find(p => String(p.user_id) === String(userId));
    if (prof) {
      let currentLevel = 1;
      let req = 250, curPcp = prof.carys_points || 0;
      while (curPcp >= req) { curPcp -= req; currentLevel++; req = 200 + Math.floor(Math.pow(currentLevel, 1.8) * 50); }

      let finalPoints = points;

      // Level Tax (diminishing returns for high level in casual matches)
      if (!isRanked) {
        let gainMultiplier = Math.max(0.2, 1.0 - (currentLevel * 0.01));
        finalPoints = points * gainMultiplier;
      }

      // Underdog Bonus
      if (opponentLevel !== null && opponentLevel > currentLevel) {
        let bonus = 1.0 + ((opponentLevel - currentLevel) * 0.05);
        finalPoints = finalPoints * bonus;
      }

      prof.carys_points = Math.max(0, (prof.carys_points || 0) + Math.floor(finalPoints));
      DB.save();
      return true;
    }
    return false;
  };

  // ── getPlayerMatchHistory ──────────────────────────────────────────────────
  // Returns paginated match history for a player with joined game name and opponents.
  // Options: { gameId, result, page, limit }
  DB.getPlayerMatchHistory = function (userId, opts) {
    opts = opts || {};
    const uid = String(userId);
    const page = Math.max(1, opts.page || 1);
    const limit = opts.limit || 15;
    // Use shared helpers defined at module scope (see _deriveResult, _computeCarys, etc.)
    const deriveResult = _deriveResult;
    const computeCarys = _computeCarys;
    const computeXP = _computeXP;
    const computeEloDelta = _computeEloDelta;

    let rows = DB.match_results.filter(r => String(r.player_id) === uid);

    if (opts.gameId) rows = rows.filter(r => String(r.game_id) === String(opts.gameId));
    if (opts.result) {
      rows = rows.filter(r => deriveResult(r) === opts.result.toLowerCase());
    }

    // Sort newest first
    rows = rows.slice().sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const data = rows.slice((page - 1) * limit, page * limit).map(r => {
      // Match history hangs off match_results, and always has — this lookup is
      // only for the two optional extras a result row does not carry (duration
      // and mode). 80 of the 134 existing result rows already point at a match
      // that no longer exists, and the list has always rendered fine without it.
      const session = (DB.matches || []).find(m => String(m.match_id) === String(r.session_id))
                   || (DB.sessions || []).find(s => String(s.session_id) === String(r.session_id));
      const gameId = r.game_id || session?.game_id;
      const game = DB.games.find(g => String(g.game_id) === String(gameId));
      const resultStr = deriveResult(r);
      const carys_earned = computeCarys(r);
      const xp_gained = computeXP(r);
      const elo_delta = computeEloDelta(r);

      // Find opponents in same session — wrapped in try/catch so a bad record never crashes the list
      let opponents = [];
      try {
        opponents = (DB.match_results || [])
          .filter(o => String(o.session_id) === String(r.session_id) && String(o.player_id) !== uid)
          .slice(0, 3)
          .map(o => {
            const ou = (DB.users || []).find(u => String(u.user_id != null ? u.user_id : u.id) === String(o.player_id));
            const name = ou ? (ou.user_name || ou.username || '??') : '??';
            const avatar = ou ? (ou.avatar || name.slice(0, 2).toUpperCase()) : name.slice(0, 2).toUpperCase();
            return { player_name: name, avatar };
          });
      } catch (e) { opponents = []; }

      return {
        ...r,
        result: resultStr,
        carys_earned,
        xp_gained,
        elo_delta,
        game_name: game ? (game.game_name || game.title) : 'Unknown Game',
        game_image: game ? game.img : null,
        duration_seconds: session ? (session.duration || 0) * 60 : 1800,
        opponents
      };
    });

    return { data, page, totalPages, total };
  };


  // ── getPlayerStats ─────────────────────────────────────────────────────────
  // Returns aggregate stats for a player, optionally filtered to a single game.
  DB.getPlayerStats = function (userId, gameId) {
    const uid = String(userId);
    let rows = DB.match_results.filter(r => String(r.player_id) === uid);
    if (gameId) rows = rows.filter(r => String(r.game_id) === String(gameId));

    function deriveResult(r) {
      if (r.result && typeof r.result === 'string') {
        const res = r.result.toLowerCase();
        if (['win', 'loss', 'draw'].includes(res)) return res;
        return 'draw';
      }
      if (r.player_rank != null) return Number(r.player_rank) === 1 ? 'win' : 'loss';
      return 'draw';
    }

    // Same rule as _computeCarys() above — and the same fix: `score` is the
    // in-game score, never a Carys amount. See the note on that function.
    function computeCarys(r) {
      if (r.carys_earned != null) return r.carys_earned;
      const result = deriveResult(r);
      const base = result === 'win' ? 100 : result === 'draw' ? 25 : 15;
      const gid = String(r.game_id || '');
      const multi = gid === '7' ? 1.5 : gid === '8' ? 1.1 : 1.0;
      return Math.round(base * multi);
    }

    const total_matches = rows.length;
    const wins = rows.filter(r => deriveResult(r) === 'win').length;
    const losses = rows.filter(r => deriveResult(r) === 'loss').length;
    const win_rate = total_matches > 0 ? Math.round(wins / total_matches * 100) : 0;
    const total_carys = rows.reduce((sum, r) => sum + computeCarys(r), 0);

    return { total_matches, wins, losses, win_rate, total_carys };
  };


  DB.pushTelemetry = function (gameId, eventType, data) {
    if (!DB.telemetry) DB.telemetry = [];
    DB.telemetry.unshift({ id: Date.now(), gameId, eventType, data, time: new Date().toISOString() });
    if (DB.telemetry.length > 500) DB.telemetry.pop();
    DB.save();
  };

  DB.fireLiveEvent = function (gameId, eventCode) {
    if (!DB.live_events) DB.live_events = [];
    DB.live_events.push({ id: Date.now(), gameId, eventCode, active: true, time: new Date().toISOString() });
    if (DB.live_events.length > 20) DB.live_events.shift();
    DB.save();
  };

  DB.consumeLiveEvent = function (gameId, eventCode) {
    if (!DB.live_events) return false;
    const ev = DB.live_events.find(e => e.gameId === gameId && e.eventCode === eventCode && e.active);
    if (ev) { ev.active = false; DB.save(); return true; }
    return false;
  };

  DB.updateGame = function (id, data) {
    const g = DB.games.find(gx => String(gx.id || gx.game_id) === String(id));
    if (!g) return false;
    if (data.title !== undefined) g.game_name = data.title;
    if (data.desc !== undefined) g.desc = data.desc;
    if (data.genre !== undefined) g.game_type = data.genre;
    if (data.enabled !== undefined) g.enabled = data.enabled;
    if (data.maintenance !== undefined) g.maintenance = data.maintenance;
    if (data.status !== undefined) g.status = data.status;
    DB.save();
    return true;
  };

  // DB.resetCarysPoints() was DELETED on 2026-08-14. It did:
  //
  //     p.carys_points = Math.floor(winRate * 5000) + Math.floor(Math.random() * 500);
  //
  // i.e. it threw away every player's real balance and replaced it with a
  // formula plus a random number of up to 500 points. Its only caller was an
  // auto-run at the bottom of this file guarded by a per-browser localStorage
  // flag, so it fired again on every fresh browser and corrupted the balances
  // for everybody. Both are gone.
  //
  // If you ever need to reset the economy, write the intended balance
  // explicitly — never derive one, and never randomise one.

  DB.evaluateTournaments = function () {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let changed = false;
    DB.tournaments.forEach(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return;
      const end = new Date(t.end_date); end.setHours(23, 59, 59, 999);
      const start = new Date(t.start_date || t.end_date); start.setHours(0, 0, 0, 0);
      const reg = DB.player_tournament.filter(pt => pt.tournament_id === t.tournament_id);
      if (today >= start && reg.length < 2) { t.status = 'cancelled'; changed = true; return; }
      if (today >= start && t.status === 'upcoming') { t.status = 'in-progress'; changed = true; }
      if (today > end) {
        t.status = 'completed'; changed = true;
        if (reg.length > 0) {
          const sorted = reg.map(pt => {
            const pInfo = DB.player_profiles.find(p => p.user_id === pt.player_id);
            return { id: pt.player_id, carys: pInfo ? (pInfo.carys_points || 0) : 0 };
          }).sort((a, b) => b.carys - a.carys);
          const basePrize = t.prize ? parseInt(t.prize.replace(/[^0-9]/g, '')) * 10 : 10000;
          [0.5, 0.3, 0.2].forEach((pct, i) => {
            if (i < sorted.length) {
              DB.awardPoints(sorted[i].id, Math.floor(basePrize * pct));
              DB.notifications.push({ id: Date.now() + i, toRole: null, toUser: sorted[i].id, from: 'System', avatar: 'SY', fromRole: 'admin', fromUserId: 0, msg: `Rank #${i + 1} in [${t.tournament_name}]! Smart contract awarded you ${Math.floor(basePrize * pct)} PCP.`, time: 'just now', read: false, replies: [] });
            }
          });
        }
      }
    });
    if (changed) DB.save();
  };

  // DB_KEY is defined at top of IIFE (see above)

  window._hydrateDB = function () {
    let savedData = null;
    // Declared here, not inside the try: the seed-restore block further down
    // reads it to decide whether a row missing from the response is genuinely
    // missing or merely filtered out by the scope.
    const scope = window.PC_SCOPE || null;

    // ── Priority 1: Fetch from backend to ensure real-time network sync ─────────────────────────
    try {
      const xhr = new XMLHttpRequest();
      // Cache-bust, hard.
      //
      // This request had no cache directives, so the browser was free to answer
      // it from its own HTTP cache. That is worse than a stale read: the client
      // hydrates from the cached body and then POSTs it straight back to
      // /db-import, where `games`, `sessions`, `match_results` and friends are
      // APPEND-ONLY by identity. A row deleted server-side therefore came back
      // to life on the next page load, from a response body the browser had
      // kept — and no amount of cleaning the server or live_database.json could
      // hold, because the very next visit re-uploaded the old copy.
      //
      // Reproduced 2026-08-04: server verified clean at 94 sessions / 120 match
      // rows, frontend restarted, ONE page load from a browser with cleared
      // localStorage, no service worker and no caches — server back to 96/123.
      // A unique query string is enough, and it is the ONLY safe way to do it
      // here: sending Cache-Control/Pragma as REQUEST headers turns this into a
      // preflighted cross-origin request, and the backend's CORS allowlist is
      // just Content-Type/Authorization/role. The preflight was rejected, so
      // db-export failed outright and the client silently fell back to its own
      // stale localStorage — then pushed that back on the next save. That is
      // what kept resurrecting deleted rows and reverting server-side edits.
      // ── Partial sync ────────────────────────────────────────
      // A page may declare the tables it actually reads:
      //
      //     <script>window.PC_TABLES = ['games','tournaments'];</script>
      //     <script src="../../data/db.js"></script>
      //
      // Only those are fetched. Declaring nothing fetches everything, so every
      // page that has not been converted behaves exactly as it always did —
      // this is opt-in on purpose, because a page that under-declares reads
      // stale seed defaults for the tables it forgot, which is a silent bug.
      const wanted = Array.isArray(window.PC_TABLES) && window.PC_TABLES.length
        ? window.PC_TABLES.slice()
        : null;
      // The merge below reads these to recover local rows, and hydrate needs
      // the tombstones or deleted rows come back. Pull them whenever a page
      // asks for the table they tombstone.
      if (wanted) {
        if (wanted.includes('games') && !wanted.includes('deleted_games')) wanted.push('deleted_games');
        if (wanted.includes('tournaments') && !wanted.includes('deleted_tournaments')) wanted.push('deleted_tournaments');
        if (wanted.includes('users') && !wanted.includes('deleted_users')) wanted.push('deleted_users');
      }

      // Row scoping. A page that only ever shows the signed-in player's own
      // history declares it, and the server filters instead of shipping every
      // match on the platform:
      //
      //     window.PC_SCOPE = { userId: 7, historyLimit: 100 };
      //
      // Opt-in for the same reason as PC_TABLES — a leaderboard or a staff
      // console genuinely needs everyone's rows, and scoping one of those
      // would make it read short with no error.
      let scopeQ = '';
      if (scope && scope.userId != null) scopeQ += '&userId=' + encodeURIComponent(scope.userId);
      if (scope && scope.historyLimit) scopeQ += '&historyLimit=' + encodeURIComponent(scope.historyLimit);
      // Which tables the userId applies to. Omitted means all four, which is
      // only right for a page that never looks at anyone else's rows.
      if (scope && Array.isArray(scope.scope) && scope.scope.length) {
        scopeQ += '&scope=' + encodeURIComponent(scope.scope.join(','));
      }

      const bust = (window.PC_API + '/db-export').indexOf('?') >= 0 ? '&' : '?';
      const tableQ = wanted ? '&tables=' + encodeURIComponent(wanted.join(',')) : '';
      xhr.open('GET', window.PC_API + '/db-export' + bust + '_=' + Date.now() + tableQ + scopeQ, false);
      xhr.send(null);
      if (xhr.status === 200) {
        // Do NOT blindly trust the backend copy over what is already on disk.
        //
        // This used to assign the response straight into localStorage. The
        // backend loads live_database.json only at boot and dies on any compile
        // error under `nest start --watch`, so a run whose POST never landed was
        // destroyed by the very next page load. Measured: 61 rows with two real
        // runs present, one reload, 58 rows and both runs gone from memory AND
        // localStorage, match history rendering zero items. That is the whole
        // reason finished games "never appeared".
        //
        // Local append-only rows the server has never seen are folded back in
        // and the union is what gets cached.
        savedData = xhr.responseText;
        try {
          // Only safe on an UNSCOPED read. This merge exists to recover rows the
          // server never received, and it decides that by their absence from
          // the response. Under ?userId/?historyLimit absence means "filtered",
          // not "lost" — so running it would fold every row the scope just
          // excluded straight back in, and the request would have saved nothing.
          const localRaw = (scope || wanted) ? null : localStorage.getItem(DB_KEY);
          if (localRaw) {
            const remote = JSON.parse(savedData);
            const local = JSON.parse(localRaw);
            let recovered = 0;
            Object.keys(APPEND_ONLY).forEach(table => {
              const keyOf = APPEND_ONLY[table];
              if (!Array.isArray(remote[table]) || !Array.isArray(local[table])) return;
              const seen = new Set(remote[table].map(keyOf));
              local[table].forEach(row => {
                if (!seen.has(keyOf(row))) { remote[table].push(row); seen.add(keyOf(row)); recovered++; }
              });
            });
            if (recovered) {
              savedData = JSON.stringify(remote);
              console.warn('[PlayCarys] Recovered ' + recovered +
                ' local row(s) missing from the backend copy.');
            }
          }
        } catch (e) { console.warn('[PlayCarys] Merge on hydrate failed; using backend copy.', e); }

        // Cache write. On a PARTIAL fetch the response holds only the tables
        // this page asked for, so writing it straight to DB_KEY would delete
        // every other table from the cache — and the next page to load while
        // the backend is down would hydrate from a stump. Merge instead.
        if (wanted) {
          try {
            const cached = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
            Object.assign(cached, JSON.parse(savedData));
            localStorage.setItem(DB_KEY, JSON.stringify(cached));
          } catch (e) {
            localStorage.setItem(DB_KEY, savedData);
          }
        } else {
          localStorage.setItem(DB_KEY, savedData); // Repopulate cache
        }
        console.info('[PlayCarys] Fetched state from backend DB directly.');
      } else {
        throw new Error('Non-200 response');
      }
    } catch (err) {
      console.warn('[PlayCarys] Backend offline — falling back to localStorage.');
      // ── Priority 2: localStorage (fallback if backend offline) ─────────────────────────
      savedData = localStorage.getItem(DB_KEY);
    }

    if (!savedData) return false;

    try {
      const parsed = JSON.parse(savedData);

      Object.keys(parsed).forEach(key => {
        if (DB[key] && Array.isArray(DB[key])) {
          // Keep a reference to the hardcoded defaults
          const defaults = [...DB[key]];

          DB[key].length = 0;
          parsed[key].forEach(item => {
            // Force sync game properties that we updated in the hardcoded DB
            if (key === 'games') {
              const defaultGame = defaults.find(g => g.game_id === item.game_id);
              if (defaultGame) {
                item.players = defaultGame.players;
              }
            }
            // Merge seed data without overwriting user edits
            if (key === 'tournaments') {
              const defaultT = defaults.find(t => t.tournament_id === item.tournament_id);
              if (defaultT) {
                // Keep the parsed data (user edits) as the source of truth,
                // but pull in any new schema fields from the default.
                const merged = Object.assign({}, defaultT, item);
                Object.assign(item, merged);
              }
            }
            DB[key].push(item);
          });

          // Ensure if new defaults were added to tournaments or match_results but not in parsed, they get added
          if (key === 'tournaments') {
            const deletedSet = new Set((parsed.deleted_tournaments || []).map(String));
            defaults.forEach(dt => {
              const strId = String(dt.tournament_id);
              if (!DB.tournaments.find(t => String(t.tournament_id) === strId) && !deletedSet.has(strId)) {
                DB.tournaments.push(dt);
              }
            });
          }
          if (key === 'users') {
            DB.users.forEach(u => {
              const defaultUser = defaults.find(du => String(du.user_id) === String(u.user_id) && String(du.user_name) === String(u.user_name));
              if (defaultUser && (!u.password || String(u.password).startsWith('$2'))) {
                u.password = defaultUser.password;
              }
            });
            defaults.forEach(du => {
              if (!DB.users.find(u => String(u.user_id) === String(du.user_id) || String(u.user_name) === String(du.user_name))) {
                DB.users.push(du);
              }
            });
          }
          // Seed rows are only re-added on an UNSCOPED read. Under ?userId the
          // response deliberately holds this player's rows alone, so every other
          // player's seed row counts as 'missing from parsed' and would be put
          // straight back — undoing the filter the request just asked for.
          if (key === 'match_results' && !scope) {
            defaults.forEach(dr => {
              if (!DB.match_results.find(r => String(r.session_id) === String(dr.session_id) && String(r.player_id) === String(dr.player_id))) {
                DB.match_results.push(dr);
              }
            });
          }
          if (key === 'sessions') {
            defaults.forEach(ds => {
              if (!DB.sessions.find(s => String(s.session_id) === String(ds.session_id))) {
                DB.sessions.push(ds);
              }
            });
          }
        } else if (DB[key] !== null && typeof DB[key] === 'object') {
          Object.assign(DB[key], parsed[key]);
        } else {
          DB[key] = parsed[key];
        }
      });

      // Cleanup corrupted users and save the cleanly filtered state
      // Cleanup corrupted users
      if (DB.users && Array.isArray(DB.users)) {
        const initialLen = DB.users.length;
        DB.users = DB.users.filter(u => u.user_name && u.user_name !== 'undefined');
        if (DB.users.length !== initialLen) DB.save();
      }

      // Drop deliberately deleted accounts.
      //
      // Needed HERE as well as in mergeRemoteState because the seed-restore
      // loop a few lines up pushes every default back in, and because an
      // offline boot hydrates from localStorage without ever reaching a merge.
      // Without it a deleted account reappears on the next page load and, since
      // this client then POSTs its whole DB, on the server too.
      const _dropped = dropRowsForRemovedUsers(removedUserIds(parsed)) + dropUnidentifiableRows();
      if (_dropped) {
        console.info('[PlayCarys] Removed ' + _dropped +
          ' row(s) belonging to deleted account(s) or to no account at all.');
        DB.save();
      }

      // Cleanup finished/stale sessions
      if (DB.sessions && Array.isArray(DB.sessions)) {
        let sessionsChanged = false;
        const nowMs = Date.now();
        DB.sessions.forEach(s => {
          // Auto-complete ended chess games
          if (s.chess?.gameEnded && s.status !== 'completed') {
            s.status = 'completed';
            sessionsChanged = true;
          }
          // Auto-complete stale QP sessions (>2 hours and still in-progress)
          if (s.isQuickPlay && s.status === 'in-progress') {
            const created = new Date(s.createdAt || s.start_time).getTime();
            if (nowMs - created > 2 * 60 * 60 * 1000) {
              s.status = 'completed';
              sessionsChanged = true;
            }
          }
        });

        // Remove ghost sessions (more than 24h old and waiting with no players)
        const beforeLen = DB.sessions.length;
        DB.sessions = DB.sessions.filter(s => {
          const createdAt = new Date(s.createdAt || s.start_time).getTime();
          const isStale = (nowMs - createdAt) > (24 * 60 * 60 * 1000);
          if (isStale && s.status === 'waiting') return false;
          return true;
        });
        if (DB.sessions.length !== beforeLen) sessionsChanged = true;

        // Purge stale quick play queue entries (>60s)
        if (DB.quickPlayQueue && Array.isArray(DB.quickPlayQueue)) {
          DB.quickPlayQueue = DB.quickPlayQueue.filter(q => (nowMs - q.joinedAt) < 60000);
        }

        if (sessionsChanged) DB.save();
      }
    } catch (e) { console.error("Could not load DB from localStorage:", e); return false; }

    attachBackCompatGetters();
    return true;
  };

  function roleIdFromName(roleName) {
    const role = String(roleName || '').toLowerCase();
    if (role === 'superuser') return 1;
    if (role === 'admin') return 2;
    if (role === 'moderator') return 3;
    if (role === 'player') return 4;
    if (role === 'publisher') return 5;
    return null;
  }

  function coerceStoredId(value) {
    if (value == null || value === '') return value;
    if (typeof value === 'number') return value;
    const raw = String(value).trim();
    if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
    if (/^[a-zA-Z]+-?\d+$/.test(raw)) return raw;
    return value;
  }

  function normalizeSessionStatus(status) {
    if (status === 'active') return 'in-progress';
    if (status === 'ended') return 'completed';
    return status || 'waiting';
  }

  function roleNameFromId(roleId) {
    return (DB.roles.find(r => String(r.role_id) === String(roleId)) || {}).role_name || String(roleId);
  }

  // REMOVED: readSessionPlayers / writeSessionPlayers / seedSessionPlayers —
  // the three functions that backed the virtual `players` property. They were
  // the only readers and writers of the player_session junction, which no
  // longer exists. See the note in attachSessionCompat().

  function readTournamentPlayers(tournament) {
    const linked = (DB.player_tournament || [])
      .filter(pt => String(pt.tournament_id) === String(tournament.tournament_id))
      .map(pt => String(pt.player_id));
    if (linked.length) return linked;
    return Array.isArray(tournament._registeredPlayers) ? tournament._registeredPlayers.map(String) : [];
  }

  function writeTournamentPlayers(tournament, players) {
    const uniquePlayers = [...new Set((players || []).map(pid => String(pid)))];
    DB.player_tournament = (DB.player_tournament || []).filter(pt => String(pt.tournament_id) !== String(tournament.tournament_id));
    uniquePlayers.forEach(pid => {
      const numId = parseInt(pid, 10);
      DB.player_tournament.push({
        player_id: isNaN(numId) ? pid : numId,
        tournament_id: tournament.tournament_id
      });
    });
  }

  function seedTournamentPlayers(tournament) {
    const seeded = Array.isArray(tournament._registeredPlayers) ? tournament._registeredPlayers : [];
    if (!seeded.length) return;
    const merged = [...new Set([...readTournamentPlayers(tournament), ...seeded.map(String)])];
    if (merged.length) writeTournamentPlayers(tournament, merged);
  }

  function ensureHiddenArraySeed(obj, propName, values) {
    if (!Array.isArray(values)) return;
    if (!Object.prototype.hasOwnProperty.call(obj, propName)) {
      Object.defineProperty(obj, propName, {
        value: values.map(String),
        writable: true,
        configurable: true,
        enumerable: false
      });
      return;
    }
    obj[propName] = values.map(String);
  }

  function attachUserCompat(u) {
    if (!u) return u;
    // GUARD AGAINST THE STRING "undefined".
    //
    // This line ran BEFORE the `_compatUser` early-return below, while the `id`
    // getter defined further down returns String(u.user_id). So on the second
    // pass over a user that never had a user_id, `u.id` evaluated to the string
    // "undefined" and that got written into user_id permanently. Because
    // attachBackCompatGetters() runs on every DB.save() and every hydrate, the
    // corruption was guaranteed, not rare — it is exactly how the live data
    // ended up with an account whose user_id is the literal text "undefined",
    // 358 carys points earned and zero match_results it could still own.
    if (u.user_id == null && u.id != null && String(u.id) !== 'undefined') {
      u.user_id = coerceStoredId(u.id);
    }
    // NORMALISE THE ID *TYPE*, not just its presence.
    //
    // The 12 seeded accounts have numeric user_ids (7, 8, …) but every account
    // registered through the sign-up form was stored with a STRING id (the
    // `id: String(numId)` field in doRegister leaked into user_id). The app then
    // compares ids strictly all over the place — `n.toUser === parseInt(session.userId,10)`
    // in buildNavbar/updateNavBadge/injectSideDrawer, `parseInt(g.game_publisher,10) === uid`
    // in publish-tournament — so a string id silently matched NOTHING: real
    // (non-demo) accounts never saw a friend request, a DM, a notification badge
    // or their own published games. Coercing here makes every numeric id a number
    // exactly once, at the single place every user row already passes through.
    // Safe for persistence: every APPEND_ONLY identity key already String()s its id.
    else if (typeof u.user_id === 'string' && /^-?\d+$/.test(u.user_id.trim())) {
      u.user_id = coerceStoredId(u.user_id);
    }
    if (!u.user_name && u.username) u.user_name = u.username;
    if (u.role_id == null && u.role) {
      const mappedRoleId = roleIdFromName(u.role);
      if (mappedRoleId != null) u.role_id = mappedRoleId;
    }
    // `u.friends = []` used to be created here. Friendships are a table now
    // (DB.friendships / DB.getFriends), and re-adding an empty array on every
    // compat pass would leave a second, always-empty source of truth on the
    // user row for a future reader to trust by mistake.
    if (u._compatUser) return u;
    Object.defineProperties(u, {
      // Return null rather than the string "undefined" when there is no id, so
      // that a round-trip through this getter cannot manufacture a bogus one.
      id: { get() { return u.user_id == null ? null : String(u.user_id); }, enumerable: false, configurable: true },
      username: { get() { return u.user_name; }, enumerable: false, configurable: true },
      role: {
        get() {
          return roleNameFromId(u.role_id);
        },
        enumerable: false,
        configurable: true
      },
      level: {
        get() {
          const pp = DB.player_profiles.find(p => String(p.user_id) === String(u.user_id));
          if (!pp) return 1;
          let lvl = 1;
          let req = 250;
          let cur = pp.carys_points || 0;
          while (cur >= req) {
            cur -= req;
            lvl++;
            req = 200 + Math.floor(Math.pow(lvl, 1.8) * 50);
          }
          return lvl;
        },
        enumerable: false,
        configurable: true
      },
      wins: {
        get() {
          const pp = DB.player_profiles.find(p => String(p.user_id) === String(u.user_id));
          return pp ? pp.matches_won : 0;
        },
        enumerable: false,
        configurable: true
      },
      losses: {
        get() {
          const pp = DB.player_profiles.find(p => String(p.user_id) === String(u.user_id));
          return pp ? Math.max(0, Math.round(pp.matches_won * 0.45)) : 0;
        },
        enumerable: false,
        configurable: true
      },
      matches: {
        get() {
          const pp = DB.player_profiles.find(p => String(p.user_id) === String(u.user_id));
          return pp ? pp.matches_won + Math.max(0, Math.round(pp.matches_won * 0.45)) : 0;
        },
        enumerable: false,
        configurable: true
      }
    });
    Object.defineProperty(u, '_compatUser', { value: true, writable: true, configurable: true, enumerable: false });
    return u;
  }

  function attachGameCompat(g) {
    if (!g) return g;
    if (g.game_id == null && g.id != null) g.game_id = coerceStoredId(g.id);
    if (!g.game_name && g.title) g.game_name = g.title;
    if (!g.game_type && g.genre) g.game_type = g.genre;
    if (!g.game_approval_status && g.status) g.game_approval_status = g.status;
    if (!g.game_status && g.enabled != null) g.game_status = g.enabled ? 'enabled' : 'disabled';
    if (g.game_publisher == null && g.publisherId != null) g.game_publisher = coerceStoredId(g.publisherId);
    if (g._compatGame) return g;
    Object.defineProperties(g, {
      id: { get() { return String(g.game_id); }, enumerable: false, configurable: true },
      title: { get() { return g.game_name; }, enumerable: false, configurable: true },
      genre: {
        get() {
          const genreId = parseInt(g.genre_id, 10);
          const genre = DB.genres.find(gn => gn.id === genreId);
          return genre ? genre.name : (g.game_type || "General");
        },
        enumerable: false,
        configurable: true
      },
      status: {
        get() { return g.game_approval_status; },
        set(v) { g.game_approval_status = v; },
        enumerable: false,
        configurable: true
      },
      enabled: {
        get() { return g.game_status === "enabled"; },
        set(v) { g.game_status = v ? "enabled" : "disabled"; },
        enumerable: false,
        configurable: true
      },
      maintenance: {
        get() { return !!g._maintenance; },
        set(v) { g._maintenance = !!v; },
        enumerable: false,
        configurable: true
      },
      publisherId: { get() { return String(g.game_publisher); }, enumerable: false, configurable: true },
      publisher: {
        get() {
          const pub = DB.users.find(u => String(u.user_id) === String(g.game_publisher));
          return pub ? pub.user_name : "Unknown";
        },
        enumerable: false,
        configurable: true
      }
    });
    Object.defineProperty(g, '_compatGame', { value: true, writable: true, configurable: true, enumerable: false });
    return g;
  }

  function attachSessionCompat(s, seedLinks) {
    if (!s) return s;
    if (s.session_id == null && s.id != null) s.session_id = coerceStoredId(s.id);
    if (s.game_id == null && s.gameId != null) s.game_id = coerceStoredId(String(s.gameId).replace(/^g/, ''));
    s.status = normalizeSessionStatus(s.status);

    // The `players` getter/setter is GONE.
    //
    // It was the most quietly dangerous thing in this file. `players` looked
    // like an ordinary array on the session row, but it was a virtual property:
    // reading it queried the player_session junction, and ASSIGNING to it —
    // including an innocent-looking `s.players.push(uid)` — rewrote that
    // junction for the whole session. Every `.length`, `.includes()` and
    // `.push()` on it anywhere in the codebase was a disguised database write.
    //
    // It is also what made the empty-room reaper impossible to read correctly:
    // the reaper's `|| !s.players` escape hatch could never fire, because this
    // getter guaranteed `players` was always a defined array. That one line was
    // deleting 35 of 65 sessions on every page load.
    //
    // Who played a match is now an ordinary `participants` array on the match
    // row, plus match_results — both plain data, neither with side effects.
    if (!s._compatSession) {
      Object.defineProperties(s, {
        id: { get() { return String(s.session_id); }, enumerable: false, configurable: true },
        gameId: { get() { return String(s.game_id); }, enumerable: false, configurable: true }
      });
      Object.defineProperty(s, '_compatSession', { value: true, writable: true, configurable: true, enumerable: false });
    }

    return s;
  }

  function attachTournamentCompat(t, seedLinks) {
    if (!t) return t;
    if (t.tournament_id == null && t.id != null) t.tournament_id = coerceStoredId(t.id);
    if (!t.tournament_name && t.name) t.tournament_name = t.name;
    if (t.game_id == null && t.gameId != null) t.game_id = coerceStoredId(String(t.gameId).replace(/^g/, ''));
    if (!t.start_date && t.startDate) t.start_date = t.startDate;
    if (!t.end_date && t.endDate) t.end_date = t.endDate;
    if (t.organizer == null && t.publisherId != null) t.organizer = coerceStoredId(t.publisherId);

    const rawRegisteredPlayers = Array.isArray(t.registeredPlayers) ? t.registeredPlayers : [];
    if (rawRegisteredPlayers.length) ensureHiddenArraySeed(t, '_registeredPlayers', rawRegisteredPlayers);

    if (!t._compatTournament) {
      Object.defineProperties(t, {
        id: { get() { return String(t.tournament_id); }, enumerable: false, configurable: true },
        name: { get() { return t.tournament_name; }, enumerable: false, configurable: true },
        gameId: { get() { return String(t.game_id); }, enumerable: false, configurable: true },
        game: {
          get() {
            const game = DB.games.find(gx => String(gx.game_id) === String(t.game_id));
            return game ? game.game_name : "Unknown Game";
          },
          enumerable: false,
          configurable: true
        },
        startDate: { get() { return t.start_date; }, enumerable: false, configurable: true },
        publisherId: { get() { return String(t.organizer); }, enumerable: false, configurable: true },
        publisherName: {
          get() {
            const user = DB.users.find(u => String(u.user_id) === String(t.organizer));
            return user ? user.user_name : 'PlayCarys';
          },
          enumerable: false,
          configurable: true
        },
        registeredPlayers: {
          get() {
            return readTournamentPlayers(t);
          },
          set(arr) {
            writeTournamentPlayers(t, arr);
          },
          enumerable: false,
          configurable: true
        }
      });
      Object.defineProperty(t, '_compatTournament', { value: true, writable: true, configurable: true, enumerable: false });
    }

    if (seedLinks) seedTournamentPlayers(t);
    return t;
  }

  function wrapCompatPush(arrayName, type) {
    const arr = DB[arrayName];
    if (!Array.isArray(arr)) return;
    if (arr.push && arr.push._compatWrapped) return;
    const originalPush = arr.push;
    arr.push = function (...items) {
      const compatItems = items.map(item => DB.attachGetters(item, type));
      return originalPush.apply(this, compatItems);
    };
    arr.push._compatWrapped = true;
  }

  function wireCompatArrayPushes() {
    wrapCompatPush('users', 'user');
    wrapCompatPush('games', 'game');
    wrapCompatPush('sessions', 'session');
    wrapCompatPush('tournaments', 'tournament');
    wrapCompatPush('reports', 'report');
  }

  DB.attachGetters = function (obj, type) {
    if (!obj) return obj;
    switch (type) {
      case 'user':
        return attachUserCompat(obj);
      case 'game':
        return attachGameCompat(obj);
      case 'session':
        return attachSessionCompat(obj, false);
      case 'tournament':
        return attachTournamentCompat(obj, false);
      case 'report':
        return DB.attachReportGetters(obj);
      default:
        return obj;
    }
  };

  function attachBackCompatGetters() {
    DB.users.forEach(u => attachUserCompat(u));
    DB.games.forEach(g => attachGameCompat(g));
    DB.sessions.forEach(s => attachSessionCompat(s, true));

    // REMOVED: the empty-room reaper.
    //
    // It read:
    //   DB.sessions = DB.sessions.filter(s => (s.players && s.players.length > 0) || !s.players);
    //
    // and looked like it was skipping rows that have no `players` at all. It was
    // not. The line above hands every session a `players` GETTER backed by the
    // player_session junction, so `s.players` is always a defined array and the
    // `!s.players` escape hatch can never fire. What actually ran was:
    //
    //   "delete every session with zero player_session rows" — on EVERY load.
    //
    // That is a room rule ("nobody is in this lobby, bin it") being applied to
    // the permanent record of a match. A single-player match writes no junction
    // row at all, so its record was destroyed on the next page load; 80 of the
    // 134 match_results already point at a session that no longer exists,
    // which is this line's work.
    //
    // Rooms are going away and `player_session` with them, so this had to go
    // first: anything that touches the junction while this line still runs
    // silently deletes match rows as it works.

    // â”€â”€ REPORTS â”€â”€ hydrate all existing reports using the global method
    DB.reports.forEach(r => DB.attachReportGetters(r));

    DB.tournaments.forEach(t => attachTournamentCompat(t, true));

    if (!localStorage.getItem('favs_migration_v2')) {
      DB.favorites = {};
      localStorage.setItem('favs_migration_v2', 'true');
    } else {
      const norm = {};
      Object.keys(DB.favorites).forEach(k => {
        norm[String(k)] = (DB.favorites[k] || []).map(String);
      });
      DB.favorites = norm;
    }

    wireCompatArrayPushes();
  }

  // Initialize DB on load
  const hydrated = window._hydrateDB();
  attachBackCompatGetters(); // MUST run every time so the frontend properties (g.status, g.id) work
  if (!hydrated) {
    DB.save();
  }

  // ── Startup: fix stale data + deduplicate notifications ──────────────────────────────
  (function deduplicateNotifications() {
    let changed = false;

    // One-time migration: old broadcast moderator notifications (toRole:"player", toUser:null)
    // caused every player to see report-action messages on every page load. Mark them read.
    if (!localStorage.getItem('notif_migration_v1')) {
      DB.notifications.forEach(n => {
        if (n.toRole === 'player' && n.toUser == null && n.fromRole === 'moderator') {
          n.read = true;
          changed = true;
        }
      });
      localStorage.setItem('notif_migration_v1', 'true');
    }

    // Repair mis-addressed rows (see DB.repairNotificationAddressing) — at boot
    // as well as on every merge, since hydration from localStorage does not go
    // through mergeRemoteState.
    if (DB.repairNotificationAddressing()) changed = true;

    // Deduplicate: remove duplicate unread messages for the same user/role
    const seen = new Set();
    const before = DB.notifications.length;
    DB.notifications = DB.notifications.filter(n => {
      const key = (n.toUser != null ? 'u:' + n.toUser : 'r:' + n.toRole) + '|' + n.msg + '|' + (n.read ? '1' : '0');
      if (!n.read && seen.has(key)) { changed = true; return false; }
      seen.add(key);
      return true;
    });

    if (changed || DB.notifications.length !== before) {
      DB.save();
      console.log('[PlayCarys] Notifications cleaned up.');
    }
  })();

  // ── REMOVED 2026-08-14: the Carys randomiser ────────────────────────
  //
  // This used to be:
  //
  //     if (!localStorage.getItem('points_reset_v1')) {
  //       DB.resetCarysPoints();                    // see below - it used Math.random()
  //       localStorage.setItem('points_reset_v1', 'true');
  //     }
  //
  // It is the SAME footgun documented immediately below for the date sync: a
  // localStorage flag guarding a mutation of data that is SHARED through the
  // backend. The flag is per-browser; the damage is global. So every new
  // browser, incognito window, cleared cache, second laptop or fresh profile
  // re-ran it and overwrote EVERY player's balance, then synced that out to
  // everyone else.
  //
  // Measured 2026-08-14 on one first visit, with nobody having played:
  //     ShadowMaster -222, ToxicPlayer -311, Akhil +305, NightHawk +246
  //
  // A balance is the sum of what a player earned. It is never recomputed from
  // a formula, and never from Math.random(). Nothing replaces this block.

  // Auto-sync mock dates to real time.
  //
  // 🚨 This ran ONCE PER BROWSER (localStorage flag) but mutated data that is
  // SHARED through the backend. So every new browser, profile, incognito window
  // or cleared-storage visit shifted the whole database forward by another
  // `now - anchor` — about four months per run. Measured 2026-08-04: all 115
  // match_results sat between 2026-12 and 2027-03 while "today" was 2026-08.
  //
  // What that did to the player: Match History sorts newest-first, so a game you
  // just finished (stamped with the real now) sorted BELOW every one of those
  // impossible rows. The page showed old data at the top and your actual match
  // nowhere in sight — which reads as "match history isn't updating", even though
  // the row was written and synced correctly.
  //
  // The flag is gone. The shift is now derived FROM THE DATA: line everything up
  // so the newest existing timestamp lands at "now". Run it twice and the second
  // run computes a delta of ~0, so it is a no-op. No flag can get out of step with
  // shared data, because there is no flag.
  /**
   * Keep one tournament's dates in a sane order: regClose <= start <= end.
   *
   * Idempotent, and it only ever moves a date that is actually wrong, so it is
   * safe to run on every load. Where a date has to be invented it keeps the
   * tournament's own duration if that is knowable, and falls back to a month —
   * which is what every seeded tournament used.
   */
  function repairTournamentDates(t) {
    const DAY = 24 * 60 * 60 * 1000;
    const asDay = (ms) => new Date(ms).toISOString().split('T')[0];
    const parse = (s) => { const v = Date.parse(s); return isNaN(v) ? null : v; };

    let start = parse(t.start_date);
    let end   = parse(t.end_date);
    let reg   = parse(t.regClose);

    if (start === null && end === null) return;          // nothing to work from
    if (start === null) start = end - 30 * DAY;
    if (end === null || end < start) end = start + 30 * DAY;
    if (reg === null || reg > start) reg = start - DAY;

    t.start_date = asDay(start);
    t.end_date   = asDay(end);
    t.regClose   = asDay(reg);
    if (t.startDate) t.startDate = t.start_date;
    if (t.endDate)   t.endDate   = t.end_date;
  }

  (function autoSyncDates() {
    const now = Date.now();

    // Newest timestamp anywhere in the mock data — that is the point we align to.
    let anchor = 0;
    const consider = (s) => {
      if (!s || typeof s !== 'string') return;
      const t = new Date(s).getTime();
      if (!isNaN(t) && t > anchor) anchor = t;
    };
    (DB.match_results || []).forEach(m => consider(m.joined_at));
    (DB.sessions || []).forEach(s => { consider(s.start_time); consider(s.end_time); consider(s.createdAt); });
    (DB.users || []).forEach(u => consider(u.joinDate));

    if (!anchor) return;
    const delta = now - anchor;

    // Already aligned (or the data is ahead — repairFutureDates below handles that).
    if (delta <= 1000 * 60 * 60) return;

    function shiftStr(str) {
      if (!str || typeof str !== 'string') return str;
      // ANY four-digit year, not /^202[456]-/.
      //
      // That hardcoded list was a genuine data-corrupting bug. This function
      // shifts every date forward by the same delta, and the whole point of one
      // shared delta is that RELATIVE order survives — a tournament that ran for
      // a month still runs for a month afterwards.
      //
      // The year whitelist broke that invariant. As soon as a date was pushed
      // past 2026-12-31 it stopped matching, so it FROZE while its siblings kept
      // moving on every subsequent load. Three of the five seeded tournaments
      // ended up ending before they started: start_date was still in 2026 and
      // kept advancing, end_date had already reached 2027 and stopped.
      //
      // Matching any year keeps every field moving together, which is the
      // property the delta was supposed to guarantee.
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        let d = new Date(str);
        if (!isNaN(d.getTime())) {
          d = new Date(d.getTime() + delta);
          if (str.length === 10) return d.toISOString().split('T')[0];
          return d.toISOString();
        }
      }
      return str;
    }

    DB.users.forEach(u => { u.joinDate = shiftStr(u.joinDate); u.lastSeen = shiftStr(u.lastSeen); });
    DB.games.forEach(g => { g.submittedDate = shiftStr(g.submittedDate); });
    DB.tournaments.forEach(t => {
      t.start_date = shiftStr(t.start_date); t.startDate = shiftStr(t.startDate);
      t.end_date = shiftStr(t.end_date); t.endDate = shiftStr(t.endDate);
      t.regClose = shiftStr(t.regClose);
      // Belt and braces: a tournament's three dates only make sense in order.
      // The shift above preserves that, but this data has already been through
      // a version that did not, so repair rather than propagate nonsense.
      repairTournamentDates(t);
    });
    DB.sessions.forEach(s => {
      s.start_time = shiftStr(s.start_time); s.end_time = shiftStr(s.end_time);
      s.createdAt = shiftStr(s.createdAt);
    });
    DB.match_results.forEach(m => m.joined_at = shiftStr(m.joined_at));
    DB.reports.forEach(r => r.report_date = shiftStr(r.report_date));
    if (DB.moderator_actions) DB.moderator_actions.forEach(a => a.action_date = shiftStr(a.action_date));
    if (DB.bans) DB.bans.forEach(b => { b.bannedDate = shiftStr(b.bannedDate); b.expiresDate = shiftStr(b.expiresDate); });

    // (No "already synced" flag is written any more — see the note above. The
    // line that used to do it survived the removal of the constant it referenced
    // and threw ReferenceError: DB_SYNC_KEY is not defined on every page load,
    // which aborted the rest of this file: the future-date repair, the duplicate
    // account cleanup, evaluateTournaments() and the beforeunload save hook all
    // stopped running the moment the dates needed shifting.)
    DB.save();
  })();

  // ── Repair: tournament dates that are out of order ──────────────────────
  //
  // Runs UNCONDITIONALLY, unlike the block above which returns early once the
  // data is already aligned to "now". That early return is why this needs to be
  // separate: the corruption it repairs was left behind by an older version of
  // the shift, so by the time anyone noticed, the delta was already ~0 and the
  // repair inside autoSyncDates would never have run.
  //
  // Idempotent — it only moves a date that is genuinely wrong.
  (function repairTournamentWindows() {
    if (!Array.isArray(DB.tournaments)) return;
    let fixed = 0;
    DB.tournaments.forEach(t => {
      const before = t.start_date + '|' + t.end_date + '|' + t.regClose;
      repairTournamentDates(t);
      if (before !== (t.start_date + '|' + t.end_date + '|' + t.regClose)) fixed++;
    });
    if (fixed) {
      console.log('[PlayCarys] Repaired the date window on ' + fixed + ' tournament(s).');
      DB.save();
    }
  })();

  // ── Repair: matches dated in the future ─────────────────────────────────
  // autoSyncDates() above shifts every mock date by ONE fixed delta, measured
  // from a single anchor (2026-04-09). Any seeded row already dated later than
  // that anchor is therefore pushed past "now" — measured on this dataset, 44
  // of 50 match_results ended up in 2027 while today was 2026-07-29.
  //
  // What that did to the player: Match History sorts newest-first, so those 44
  // impossible rows sat on top of the list, and a game you had just finished
  // landed at index 30 — page three of a 15-per-page list. It looked exactly
  // like your own matches were never being recorded, when in fact they were
  // saved correctly and simply buried.
  //
  // A recorded result cannot be in the future, so this rebases the seeded block
  // to end a day ago, keeping the relative spacing between rows intact. Only
  // things that have already happened are touched: match results, and sessions
  // that are actually finished. Tournament dates are left alone because an
  // upcoming tournament is legitimately in the future.
  // Runs on EVERY boot, with no localStorage flag, and clamps ROW BY ROW.
  //
  // Both of those matter, and the previous version got both wrong:
  //
  //   * The flag was per browser. Once a browser had run the repair it never ran
  //     it again — so when a *different* browser later re-ran autoSyncDates and
  //     pushed the shared data back into the future, the first browser had no way
  //     to notice. It just kept rendering impossible rows at the top of Match
  //     History forever.
  //
  //   * It rebased the whole block by one shift derived from the newest row. With
  //     a genuine match sitting alongside corrupt future rows, that single shift
  //     dragged the genuine row backwards too — corrupting real history in the
  //     act of repairing fake history.
  //
  // Clamping each future row individually leaves every already-valid row exactly
  // where it is, so running this a hundred times changes nothing after the first.
  (function repairFutureDates() {
    const now = Date.now();
    const SKEW = 5 * 60 * 1000;      // two laptops never agree to the second
    const threshold = now + SKEW;    // beyond this is not skew, it is bad data
    const ts = s => (s && typeof s === 'string') ? new Date(s).getTime() : NaN;

    // Every timestamp that is genuinely impossible, gathered first so the shift
    // can be derived from the worst one.
    const fields = [];
    (DB.match_results || []).forEach(m => fields.push([m, 'joined_at']));
    (DB.sessions || []).forEach(s => {
      // Only finished sessions. One still waiting or in progress has no business
      // being rewritten, and tournaments are never touched at all — an upcoming
      // tournament is legitimately in the future.
      if (s.status !== 'completed' && s.status !== 'ended') return;
      fields.push([s, 'start_time'], [s, 'end_time'], [s, 'createdAt']);
    });
    // A lastSeen in the future pins an account "Online" forever — see the note in
    // Presence.statusOf, which had to defend against exactly this.
    (DB.users || []).forEach(u => fields.push([u, 'lastSeen']));

    let worst = 0;
    for (const [obj, key] of fields) {
      const t = ts(obj[key]);
      if (!isNaN(t) && t > threshold && t > worst) worst = t;
    }
    if (!worst) return;

    // Map the worst offender to one minute ago and move every other impossible
    // row by the SAME amount, so their spacing — and therefore their order — is
    // preserved exactly. Rows already in the past are not touched at all, which
    // is what keeps a genuine match you just played exactly where it belongs.
    const shift = worst - (now - 60 * 1000);
    let moved = 0;
    for (const [obj, key] of fields) {
      const str = obj[key];
      const t = ts(str);
      if (isNaN(t) || t <= threshold) continue;
      const d = new Date(t - shift);
      obj[key] = (typeof str === 'string' && str.length === 10)
        ? d.toISOString().split('T')[0]
        : d.toISOString();
      moved++;
    }

    if (!moved) return;
    DB.save();
    console.log('[PlayCarys] Clamped ' + moved + ' future-dated row(s) back into the past.');
  })();

  // ── Backfill: freeze award values onto legacy match rows ────────────────
  // Awards were being DERIVED at read time for any row that predated
  // carys_earned, which meant a player's history changed retroactively every
  // time a scoring formula was touched. This writes them down once.
  //
  // It also repairs the rows damaged by the old overloaded `score` column.
  // Two distinct shapes exist among rows with no carys_earned:
  //
  //   a) game_score IS present  -> written by the old tournament path, which did
  //      `score: pcpEarned, game_score: score`. Its `score` is therefore a CARYS
  //      amount and its real game score is in game_score. Both get put back the
  //      right way round. (Seen live: rows with score 9 and 17.)
  //
  //   b) game_score is absent   -> original seed row carrying only an in-game
  //      score (4200, 3800, 2900...). Nothing there was ever a Carys value, so
  //      the generic formula supplies one and `score` is left alone.
  // ══════════════════════════════════════════════════════════════
  //  FRIENDSHIPS API — the only supported way to touch the table.
  //  Everything is keyed on user_id, never on a name.
  // ══════════════════════════════════════════════════════════════

  /** Canonical ordered pair, so (a,b) and (b,a) are the same row. */
  function friendPair(a, b) {
    const x = Number(a), y = Number(b);
    if (!isFinite(x) || !isFinite(y) || x === y) return null;
    return x < y ? { user_a: x, user_b: y } : { user_a: y, user_b: x };
  }

  DB.friendRow = function (a, b) {
    const p = friendPair(a, b);
    if (!p) return null;
    if (!Array.isArray(DB.friendships)) DB.friendships = [];
    return DB.friendships.find(f => Number(f.user_a) === p.user_a && Number(f.user_b) === p.user_b) || null;
  };

  DB.areFriends = function (a, b) {
    const row = DB.friendRow(a, b);
    return !!row && !row.removed_at;
  };

  DB.addFriendship = function (a, b) {
    const p = friendPair(a, b);
    if (!p) return false;
    if (!Array.isArray(DB.friendships)) DB.friendships = [];
    const existing = DB.friendRow(a, b);
    if (existing) {
      if (!existing.removed_at) return false;   // already friends
      existing.removed_at = null;               // re-friend: lift the tombstone
      existing.since = new Date().toISOString();
      return true;
    }
    DB.friendships.push({ ...p, since: new Date().toISOString(), removed_at: null });
    return true;
  };

  /** Tombstone, never splice — see the note on the table declaration. */
  DB.removeFriendship = function (a, b) {
    const row = DB.friendRow(a, b);
    if (!row || row.removed_at) return false;
    row.removed_at = new Date().toISOString();
    return true;
  };

  /** Ids of everyone this user is currently friends with. */
  DB.getFriendIds = function (userId) {
    const me = Number(userId);
    if (!isFinite(me) || !Array.isArray(DB.friendships)) return [];
    return DB.friendships
      .filter(f => !f.removed_at && (Number(f.user_a) === me || Number(f.user_b) === me))
      .map(f => (Number(f.user_a) === me ? Number(f.user_b) : Number(f.user_a)));
  };

  /**
   * Live user rows for this user's friends.
   *
   * Derived on every call rather than stored, so a friend's name, avatar and
   * online status are whatever they are RIGHT NOW. The old nested array froze
   * all three at the moment the request was accepted.
   */
  DB.getFriends = function (userId) {
    return DB.getFriendIds(userId)
      .map(id => DB.users.find(u => Number(u.user_id) === id))
      .filter(Boolean);
  };

  /**
   * Fold any legacy `user.friends[]` array into the friendships table.
   *
   * Idempotent and flagless: it converts whatever it finds, then deletes the
   * array, so a straggler write is absorbed on the next pass instead of
   * becoming a second source of truth.
   *
   * MUST run after every hydrate as well as at load. The stored users still
   * carry these arrays, so a merge from /db-export brings them straight back;
   * running this only once at parse time migrated the seed data and then had
   * the server's copy land on top of it.
   *
   * Note this also REPAIRS the old format's asymmetry. Because accepting a
   * request wrote to both user rows and the loser of a sync race lost its copy,
   * the two sides disagreed: DragonSlayer listed Akhil and jagan, while Akhil
   * listed NightHawk, DragonSlayer and jagan. A friendship is one row keyed on
   * the pair, so either side's surviving copy is enough to restore it.
   */
  DB.foldLegacyFriendArrays = function () {
    let moved = 0, unresolved = 0;
    (DB.users || []).forEach(u => {
      if (!Array.isArray(u.friends)) return;
      u.friends.forEach(f => {
        const name = f && (f.name || f.user_name);
        if (!name) return;
        const other = (DB.users || []).find(x => (x.user_name || '') === name);
        if (!other) { unresolved++; return; }   // renamed or deleted — unfixable, by design of the old format
        if (DB.addFriendship(u.user_id, other.user_id)) moved++;
      });
      delete u.friends;
    });
    if (moved || unresolved) {
      console.log('[PlayCarys] Folded ' + moved + ' friendship(s) into the friendships table' +
                  (unresolved ? ' (' + unresolved + ' unresolvable by name — the old format\'s flaw)' : ''));
    }
    return moved;
  };
  DB.foldLegacyFriendArrays();

  // ── Session status: ONE vocabulary ──────────────────────────────────
  //
  // A game session is `waiting`, `in-progress`, or `completed`. Nothing else.
  //
  // Other spellings leaked in over time: room-lobby.html wrote 'finished' when
  // a bracket was won, and older builds left 'ended' rows behind. Every page
  // decides "is this session over?" with `status !== 'completed'`, so each of
  // those extra spellings read as STILL LIVE. Measured 2026-08-14: 42 of 69
  // sessions were being shown as live in the catalogue and the join list.
  //
  // Deliberately NOT guarded by a localStorage flag. It is a pure mapping that
  // converges on its first pass, so re-running it on every load costs nothing
  // and it cannot do the damage the flag-guarded migrations did — see the note
  // further down about the Carys randomiser, which was the same shape.
  const SESSION_STATUS_ALIASES = {
    finished: 'completed', ended: 'completed', closed: 'completed', done: 'completed',
    live: 'in-progress', active: 'in-progress', playing: 'in-progress',
    open: 'waiting', lobby: 'waiting'
  };

  /** Canonical session status. Use this instead of comparing raw strings. */
  DB.normaliseSessionStatus = function (status) {
    const s = String(status == null ? '' : status).trim().toLowerCase();
    return SESSION_STATUS_ALIASES[s] || s || 'waiting';
  };

  /** The one place that answers "is this session over?". */
  DB.isSessionOver = function (session) {
    return !session || DB.normaliseSessionStatus(session.status) === 'completed';
  };

  (function normaliseSessionStatuses() {
    let fixed = 0;
    (DB.sessions || []).forEach(s => {
      if (!s) return;
      const want = DB.normaliseSessionStatus(s.status);
      if (s.status !== want) { s.status = want; fixed++; }
    });
    if (fixed) console.log('[PlayCarys] Normalised ' + fixed + ' session status value(s).');
  })();

  (function backfillMatchAwards() {
    const KEY = 'playcarys_award_backfill_v1';
    if (localStorage.getItem(KEY)) return;

    let fixedSwap = 0, filled = 0;

    (DB.match_results || []).forEach(r => {
      if (r.carys_earned != null) return;          // already explicit

      if (r.game_score != null && Number(r.game_score) !== Number(r.score)) {
        // (a) un-swap: score held the Carys, game_score held the real score
        r.carys_earned = Number(r.score);
        r.score = Number(r.game_score);
        fixedSwap++;
      } else {
        // (b) seed row: derive once from the generic rule
        r.carys_earned = _computeCarys(r);
        filled++;
      }
      if (r.xp_gained == null) r.xp_gained = _computeXP(r);
    });

    localStorage.setItem(KEY, 'true');
    DB.save();
    console.log('[PlayCarys] Award backfill: ' + filled + ' rows given a stored ' +
      'carys_earned, ' + fixedSwap + ' rows had score/carys un-swapped.');
  })();

  // ── Migration: retire Elo, and hand the games back their own currency ────────────
  //
  // The platform's only progression currency is PlayCarys Points. Elo was a chess
  // rating the website stored for every account (always starting at a fictional
  // 1200) and wrote onto every match row — Hill Climbing filled it with 0. Coins
  // and diamonds are Hill Climbing's internal economy and belong to that game.
  //
  // Nothing is thrown away: each player's coins and diamonds are TOTALLED and
  // handed to the game's own wallet before the columns are dropped, so a player
  // keeps everything they ever collected. Distance and score stay on the match
  // row — those are the result of the match, not a currency.
  (function retireEloAndGameCurrency() {
    const KEY = 'playcarys_elo_retired_v1';
    if (localStorage.getItem(KEY) === 'true') return;

    // 1. Total up each player's Hill Climbing haul before the fields go.
    const wallets = {};   // playerId -> { coins, diamonds, bestDistance, bestScore }
    (DB.match_results || []).forEach(r => {
      if (r.coins == null && r.diamonds == null) return;
      const pid = String(r.player_id);
      const w = wallets[pid] || (wallets[pid] = { coins: 0, diamonds: 0, bestDistance: 0, bestScore: 0 });
      w.coins += Number(r.coins) || 0;
      w.diamonds += Number(r.diamonds) || 0;
      w.bestDistance = Math.max(w.bestDistance, Number(r.distance) || 0);
      w.bestScore = Math.max(w.bestScore, Number(r.game_score != null ? r.game_score : r.score) || 0);
    });

    // Hand them to the game. Hill Climbing reads this key on boot (see
    // games/hill_climbing/sketch.js) and it is NOT part of the platform schema.
    let carried = 0;
    Object.keys(wallets).forEach(pid => {
      const storeKey = 'hillclimb_wallet_' + pid;
      let existing = {};
      try { existing = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (e) { existing = {}; }
      const w = wallets[pid];
      localStorage.setItem(storeKey, JSON.stringify({
        coins: Math.max(Number(existing.coins) || 0, w.coins),
        diamonds: Math.max(Number(existing.diamonds) || 0, w.diamonds),
        bestDistance: Math.max(Number(existing.bestDistance) || 0, w.bestDistance),
        bestScore: Math.max(Number(existing.bestScore) || 0, w.bestScore)
      }));
      carried++;
    });

    // 2. Drop the platform-side columns.
    let cleanedRows = 0;
    (DB.match_results || []).forEach(r => {
      let touched = false;
      ['elo_delta', 'coins', 'diamonds'].forEach(f => {
        if (r[f] !== undefined) { delete r[f]; touched = true; }
      });
      if (touched) cleanedRows++;
    });

    let cleanedUsers = 0;
    (DB.users || []).forEach(u => {
      if (u.elo !== undefined) { delete u.elo; cleanedUsers++; }
    });

    localStorage.setItem(KEY, 'true');
    DB.save();
    console.log('[PlayCarys] Elo retired: cleared it from ' + cleanedUsers + ' account(s) and ' +
      cleanedRows + ' match row(s). Carried ' + carried + ' Hill Climbing wallet(s) ' +
      '(coins/diamonds/bests) into the game\'s own storage.');
  })();

  // ── Migration: pull future-dated lastSeen stamps back into the past ───────────────
  // Several accounts were seeded with a lastSeen in 2027. Presence measures
  // now - lastSeen, so a future stamp gives a NEGATIVE age, which trivially passes
  // the "seen in the last 2 minutes" test — those players showed as Online forever.
  // Same future-dating that repairFutureMatchDates already fixes for match rows.
  (function repairFutureLastSeen() {
    const now = Date.now();
    const graceMs = 5 * 60 * 1000;      // ignore ordinary clock skew
    let moved = 0;
    (DB.users || []).forEach(u => {
      const t = u.lastSeen ? Date.parse(u.lastSeen) : NaN;
      if (isNaN(t) || t - now <= graceMs) return;
      // Park them clearly in the past: they are not here now, and we cannot know
      // when they last were.
      u.lastSeen = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      moved++;
    });
    if (moved) {
      DB.save();
      console.log('[PlayCarys] Rebased ' + moved + ' future-dated lastSeen stamp(s); ' +
        'those accounts were stuck reading as Online.');
    }
  })();

  // ── Migration: normalise numeric-string ids on rows that reference a user ──────────
  // attachUserCompat now coerces users[].user_id to a number, but rows written while
  // the ids were strings still hold strings, and the notification/profile lookups
  // compare with ===. Bring the referencing rows in line once, so a friend request or
  // DM sent before this fix becomes visible instead of silently belonging to nobody.
  (function normaliseUserRefIds() {
    const numeric = v => (typeof v === 'string' && /^-?\d+$/.test(v.trim())) ? parseInt(v, 10) : v;
    let fixed = 0;
    const bump = (row, field) => {
      if (row == null) return;
      const next = numeric(row[field]);
      if (next !== row[field]) { row[field] = next; fixed++; }
    };

    (DB.notifications || []).forEach(n => { bump(n, 'toUser'); bump(n, 'fromUserId'); });
    (DB.player_profiles || []).forEach(p => bump(p, 'user_id'));
    (DB.publisher_profiles || []).forEach(p => bump(p, 'user_id'));

    if (fixed) {
      DB.save();
      console.log('[PlayCarys] Normalised ' + fixed + ' string user-id reference(s) to numbers.');
    }
  })();

  // ── Migration: drop account rows forked by the old email-keyed union ──────────────
  // While users were keyed on their (editable) email, every profile edit that changed
  // an email left the pre-edit row behind as a second account with the same user_id.
  // Those stale twins still answered to the old username/password and shadowed the
  // real row in lookups. Keep the freshest row per user_id and discard the rest.
  (function dedupeForkedAccounts() {
    if (!Array.isArray(DB.users)) return;
    const byId = new Map();
    const dropped = [];
    DB.users.forEach(u => {
      const id = u.user_id;
      if (id == null || String(id) === 'undefined') return;   // leave odd rows alone
      const key = String(id);
      const prev = byId.get(key);
      if (!prev) { byId.set(key, u); return; }
      // Prefer the row the session/profile pages would have just written: the one
      // carrying a lastSeen stamp, else simply the later one in the array.
      const prevSeen = Date.parse(prev.lastSeen || '') || 0;
      const thisSeen = Date.parse(u.lastSeen || '') || 0;
      const winner = thisSeen >= prevSeen ? u : prev;
      const loser = winner === u ? prev : u;
      byId.set(key, winner);
      dropped.push(loser);
    });
    if (!dropped.length) return;
    DB.users = DB.users.filter(u => !dropped.includes(u));
    DB.save();
    console.warn('[PlayCarys] Removed ' + dropped.length +
      ' duplicate account row(s) left behind by the old email-keyed sync.');
  })();

  // Auto-evaluate tournaments
  DB.evaluateTournaments();

  // 5. Global Auto-Save hooks
  // Use saveLocal() on beforeunload so page navigation is never blocked by a network fetch.
  window.addEventListener('beforeunload', () => DB.saveLocal());
})();

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function getUserById(id) {
  const numId = parseInt(id, 10);
  return DB.users.find(u => u.user_id === numId) || null;
}

function getGameById(id) {
  const numId = parseInt(id, 10);
  return DB.games.find(g => g.game_id === numId) || null;
}

function getPlayerProfile(userId) {
  const numId = parseInt(userId, 10);
  return DB.player_profiles.find(p => p.user_id === numId) || null;
}

function getPublisherProfile(userId) {
  const numId = parseInt(userId, 10);
  return DB.publisher_profiles.find(p => p.user_id === numId) || null;
}

// REMOVED: getTopSessionForGame() — "find the fullest waiting room for this
// game that I am not already in", used to suggest a lobby to join. Dead code
// even before this (no callers), and there are no waiting rooms to rank now.

// ============================================================
//  NOTIFICATION ADDRESSING HELPERS
// ============================================================
// A notification is one of two things and the difference matters:
//
//   DIRECT     toUser set          — a private row owned by that one user.
//   BROADCAST  toRole set, no toUser — ONE row shared by every user in the role.
//
// Because a broadcast is a single shared row, `read` and `cleared` on it are
// shared too: the first publisher to press "✓ Read" (or "Clear All") hid the
// announcement from every other publisher, and the badge went quiet for people
// who had never seen it. Broadcasts therefore track state per user in `readBy` /
// `clearedBy` instead of the single flag. Direct rows keep using read/cleared.
//
// Never set both toRole and toUser: every visibility filter is an OR, so a row
// with both is delivered to the whole role AND kept as a personal copy — that is
// how a per-publisher message reached all publishers.
// Local id comparison — db.js loads before utils.js, so it cannot lean on sameId().
// Same rule: ids may be numeric on one side and a string on the other.
function _notifIdEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isBroadcastNotif(n) {
  return (n.toUser === null || n.toUser === undefined) && n.toRole != null;
}

function notifIsForUser(n, uid, role) {
  return (n.toUser !== null && n.toUser !== undefined)
    ? _notifIdEq(n.toUser, uid)
    : n.toRole === role;
}

function notifIsRead(n, uid) {
  if (!isBroadcastNotif(n)) return !!n.read;
  return !!n.read || (n.readBy || []).some(x => _notifIdEq(x, uid));
}

function notifIsCleared(n, uid) {
  if (!isBroadcastNotif(n)) return !!n.cleared;
  return (n.clearedBy || []).some(x => _notifIdEq(x, uid));
}

/** Visible to this user = addressed to them and not cleared by them. */
function notifIsVisible(n, uid, role) {
  return notifIsForUser(n, uid, role) && !notifIsCleared(n, uid);
}

function setNotifRead(n, uid) {
  if (!isBroadcastNotif(n)) { n.read = true; return; }
  if (!Array.isArray(n.readBy)) n.readBy = [];
  if (uid != null && !n.readBy.some(x => _notifIdEq(x, uid))) n.readBy.push(String(uid));
}

function setNotifCleared(n, uid) {
  setNotifRead(n, uid);
  if (!isBroadcastNotif(n)) { n.cleared = true; return; }
  if (!Array.isArray(n.clearedBy)) n.clearedBy = [];
  if (uid != null && !n.clearedBy.some(x => _notifIdEq(x, uid))) n.clearedBy.push(String(uid));
}

/**
 * getRecentActivity — the platform's activity feed, built from rows that
 * actually happened.
 *
 * The superuser hub and dashboard both used to render `DB.activityLog`, five
 * hand-written strings frozen in the seed file:
 *
 *   "Epic Games Studio joined the platform"      — no such publisher exists
 *   "1 game(s) waiting for approval"             — the real number is 7
 *   "5 active players on the platform"           — the real number is 8
 *   "Call of Duty Warzone Cup started"           — a tournament for a game
 *                                                  with no build uploaded
 *   "ToxicPlayer banned for 7 days"              — the one true line
 *
 * ...each stamped with a relative time ("2 hours ago") that was a literal, so
 * the feed claimed to be live while saying the same thing forever. On the one
 * screen a superuser opens to find out what is going on, that is worse than
 * showing nothing.
 *
 * Everything below is derived from a dated row in a real table. If a table is
 * empty, its events simply do not appear — the caller renders an empty state
 * rather than filler.
 */
function getRecentActivity(limit = 8) {
  const out = [];
  const push = (date, type, msg) => {
    const t = date ? new Date(date).getTime() : NaN;
    if (!isNaN(t) && msg) out.push({ type, msg, at: t });
  };

  const userName = id => {
    const u = (DB.users || []).find(x => String(x.user_id ?? x.id) === String(id));
    return u ? (u.username || u.name || 'a user') : 'a user';
  };
  const gameName = id => {
    const g = (DB.games || []).find(x => String(x.game_id ?? x.id) === String(id));
    return g ? (g.title || g.game_name) : 'a game';
  };

  // Moderation — the actions with the clearest audit trail.
  (DB.moderator_actions || []).forEach(a =>
    push(a.action_date, 'ban', a.action_reason || `${a.action_type} issued`));

  (DB.bans || []).forEach(b =>
    push(b.bannedDate, 'ban',
      `${b.playerName || userName(b.playerId)} banned for ${b.duration || 'a period'}` +
      (b.bannedBy ? ` by ${b.bannedBy}` : '')));

  (DB.reports || []).forEach(r =>
    push(r.report_date, 'approval',
      `${r.type || 'Report'} filed against ${userName(r.reported_user)}`));

  // Catalogue.
  (DB.games || []).forEach(g =>
    push(g.submittedDate, 'publisher',
      `${g.title || g.game_name} submitted for review`));

  (DB.deleted_games || []).forEach(g =>
    push(g.deleted_at, 'ban', `${gameName(g.game_id)} removed from the platform`));

  // People. joinDate is a date-only seed field; created_at is a real timestamp
  // written on signup, so prefer it when both are present.
  (DB.users || []).forEach(u =>
    push(u.created_at || u.joinDate, 'player',
      `${u.username || u.name} joined as ${u.role || 'player'}`));

  (DB.tournaments || []).forEach(t =>
    push(t.start_date, 'tournament',
      `${t.title || t.tournament_name} ${t.status === 'upcoming' ? 'scheduled' : 'started'}`));

  out.sort((a, b) => b.at - a.at);

  // Straight recency gave seven consecutive "submitted for review" lines,
  // because the catalogue was seeded in one sitting and swamps everything
  // older. Take the newest of each kind in turn so moderation, signups and
  // tournaments still surface — same rows, same order within a kind, just not
  // all of one thing.
  const byType = {};
  out.forEach(e => (byType[e.type] = byType[e.type] || []).push(e));
  const queues = Object.values(byType);
  const picked = [];
  while (picked.length < limit && queues.some(q => q.length)) {
    queues.forEach(q => { if (q.length && picked.length < limit) picked.push(q.shift()); });
  }
  return picked.sort((a, b) => b.at - a.at);
}

/**
 * formatActivityTime — relative for the recent past, absolute otherwise.
 *
 * Half the seeded rows carry dates ahead of the current clock, and a naive
 * relative formatter renders those as "in 6 months", which reads like a bug.
 * Anything not in the last week is shown as a plain date instead: less chatty,
 * but never wrong.
 */
function formatActivityTime(ts) {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff >= 0 && diff < day / 24) return 'just now';
  if (diff >= 0 && diff < day) return Math.round(diff / (day / 24)) + 'h ago';
  if (diff >= 0 && diff < 7 * day) return Math.round(diff / day) + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getPlatformStats() {
  return {
    totalUsers: DB.users.length,
    players: DB.users.filter(u => u.role === "player").length,
    publishers: DB.users.filter(u => u.role === "publisher").length,
    moderators: DB.users.filter(u => u.role === "moderator").length,
    superusers: DB.users.filter(u => u.role === "superuser").length,
    admins: DB.users.filter(u => u.role === "admin").length,
    totalGames: DB.games.length,
    approvedGames: DB.games.filter(g => g.game_approval_status === "approved").length,
    pendingGames: DB.games.filter(g => g.game_approval_status === "pending").length,
    activeGames: DB.games.filter(g => g.game_approval_status === "approved" && g.game_status === "enabled").length,
    // Matches being played right now. This was `DB.sessions.length` — every
    // room ever created, labelled "active".
    activeSessions: (DB.matches || []).filter(m => m.status === 'in-progress').length,
    pendingReports: DB.reports.filter(r => r.status === "pending").length,
    reviewReports: DB.reports.filter(r => r.status === "under-review").length,
    activeBans: DB.bans.filter(b => b.active).length,
    upcomingTournaments: DB.tournaments.filter(t => t.status === "upcoming").length
  };
}

