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
    { user_id: 0, user_name: "GodMode", role_id: 1, email: "godmode@playcarys.com", phone_number: "+91 9876543210", password: "godmode#2024", avatar: "GM", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-25" },
    { user_id: 1, user_name: "SuperAdmin", role_id: 2, email: "super@playcarys.com", phone_number: "+91 9876543210", password: "superadm!n24", avatar: "SA", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-24" },
    { user_id: 2, user_name: "SystemAdmin", role_id: 2, email: "admin@playcarys.com", phone_number: "+91 9876543210", password: "sysadm1n#24", avatar: "SA", status: "active", joinDate: "2024-01-01", lastSeen: "2026-03-24" },
    { user_id: 3, user_name: "ModeratorOne", role_id: 3, email: "mod1@example.com", phone_number: "+91 9876543210", password: "Mod3r@tor1!", avatar: "M1", status: "active", joinDate: "2024-06-15", lastSeen: "2026-03-24" },
    { user_id: 4, user_name: "ModeratorTwo", role_id: 3, email: "mod2@example.com", phone_number: "+91 9876543210", password: "Mod3r@tor2!", avatar: "M2", status: "active", joinDate: "2024-08-01", lastSeen: "2026-03-20" },
    { user_id: 5, user_name: "EpicGamesStudio", role_id: 5, email: "contact@epicgames.com", phone_number: "+1 4155550198", password: "Epic#Studio25", avatar: "EG", status: "active", joinDate: "2024-03-10", lastSeen: "2026-03-23" },
    { user_id: 6, user_name: "IndieDevStudios", role_id: 5, email: "hello@indiedev.com", phone_number: "+44 7700900077", password: "Ind!eDev#2024", avatar: "ID", status: "active", joinDate: "2024-05-20", lastSeen: "2026-03-22" },
    { user_id: 7, user_name: "DragonSlayer", role_id: 4, email: "dragon@example.com", phone_number: "+91 9876543210", password: "Dr@gon$lay3r", avatar: "DS", status: "active", joinDate: "2024-02-14", lastSeen: "2026-03-24" },
    { user_id: 8, user_name: "NightHawk", role_id: 4, email: "night@example.com", phone_number: "+91 9876543210", password: "N!ghtH@wk99", avatar: "NH", status: "active", joinDate: "2024-04-08", lastSeen: "2026-03-23" },
    { user_id: 9, user_name: "PhoenixRise", role_id: 4, email: "phoenix@example.com", phone_number: "+91 9876543210", password: "Ph03n!xR1se", avatar: "PR", status: "active", joinDate: "2024-07-22", lastSeen: "2026-03-21" },
    { user_id: 10, user_name: "ShadowMaster", role_id: 4, email: "shadow@example.com", phone_number: "+91 9876543210", password: "Sh@d0wM@st3r", avatar: "SM", status: "active", joinDate: "2024-09-11", lastSeen: "2026-03-19" },
    { user_id: 11, user_name: "ToxicPlayer", role_id: 4, email: "toxic@example.com", phone_number: "+91 9876543210", password: "T0x!cPl@y3r", avatar: "TP", status: "banned", joinDate: "2024-11-05", lastSeen: "2026-03-15" }
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
    // Warzone Cup (t1) — DragonSlayer
    { player_id: 7, tournament_id: 1 },
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
  //  TABLE 12 — player_session  (JUNCTION)
  //  player_id INT FK→PLAYER_PROFILE,  session_id INT FK→GAME_SESSION
  //  PK (player_id, session_id)
  //
  //  Replaces the old players[] arrays embedded on sessions.
  //  QUICK PLAY reads this to count players per session and picks
  //  the one with the most rows — the "top" / busiest session.
  //
  //  Current live memberships (status="waiting"):
  //    Session 1 (COD "Tactical Ops Room") : NightHawk(8), PhoenixRise(9), ShadowMaster(10)
  //    Session 2 (DEADshot)                : PhoenixRise(9)
  //    Session 3 (Carrom)                  : ShadowMaster(10)
  //    Sessions 4-7                        : bot users only (bot rows below)
  //  DragonSlayer (7) has NO row here — starts fresh, picks via Quick Play or Lobby.
  // ══════════════════════════════════════════════════════════════
  player_session: [
    // Session 1 — Tactical Ops Room (COD) — 3 real players → busiest COD room
    { player_id: 8, session_id: 1 },
    { player_id: 9, session_id: 1 },
    { player_id: 10, session_id: 1 },
    // Session 2 — Sniper Elite Squad (DEADshot) — 1 player
    { player_id: 9, session_id: 2 },
    // Session 3 — Carrom Champions — 1 player
    { player_id: 10, session_id: 3 }
  ],

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
  notifications: [
    { id: 1, toRole: "admin", toUser: null, from: "GodMode", avatar: "GM", fromRole: "superuser", fromUserId: 0, msg: "Platform audit scheduled for next Monday. Ensure all reports are filed.", time: "1h ago", read: false, replies: [] },
    { id: 2, toRole: "admin", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "New publisher IndieDevStudios needs their game reviewed urgently.", time: "3h ago", read: false, replies: [] },
    { id: 3, toRole: "superuser", toUser: null, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "Server load is at 87%. Consider scaling up resources.", time: "30m ago", read: false, replies: [] },
    { id: 4, toRole: "superuser", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "ModeratorOne has flagged an unusual activity pattern on session #7.", time: "2h ago", read: false, replies: [] },
    { id: 5, toRole: "moderator", toUser: null, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "You have 2 new reports pending review under your queue.", time: "45m ago", read: false, replies: [] },
    { id: 6, toRole: "moderator", toUser: null, from: "DragonSlayer", avatar: "DS", fromRole: "player", fromUserId: 7, msg: "I'd like to appeal the warning issued to my account. Can we discuss?", time: "4h ago", read: false, replies: [] },
    { id: 7, toRole: "publisher", toUser: null, from: "SystemAdmin", avatar: "SA", fromRole: "admin", fromUserId: 2, msg: "Your game 'HorrorEscape' has been approved and is now live!", time: "2h ago", read: false, replies: [] },
    { id: 8, toRole: "publisher", toUser: null, from: "SuperAdmin", avatar: "SA", fromRole: "admin", fromUserId: 1, msg: "Please update your publisher profile with a valid contact address.", time: "1d ago", read: true, replies: [] },
    { id: 9, toRole: null, toUser: 7, from: "ModeratorOne", avatar: "M1", fromRole: "moderator", fromUserId: 3, msg: "Your report on ToxicPlayer has been reviewed and resolved.", time: "5h ago", read: false, replies: [] },
    { id: 10, toRole: "player", toUser: null, from: "System", avatar: "SY", fromRole: "admin", fromUserId: 2, msg: "You have been registered for the F1 2022 World Grand Prix. Good luck!", time: "1d ago", read: true, replies: [] },
    // ── Direct messages (toUser) — visible only to that user ──────
    { id: 11, toRole: null, toUser: 8, from: "DragonSlayer", avatar: "DS", fromRole: "player", fromUserId: 7, msg: "Hey NightHawk! Want to queue for COD tonight? I saved a spot in Tactical Ops.", time: "2h ago", read: false, replies: [] },
    { id: 12, toRole: null, toUser: 8, from: "ModeratorOne", avatar: "M1", fromRole: "moderator", fromUserId: 3, msg: "NightHawk, your account has been flagged for review. Avoid session #7 until cleared.", time: "1h ago", read: false, replies: [] }
  ],

  // ── Tournament Engine Core ──
  tournament_matches: [],
  tournament_results: [],
  deleted_tournaments: [], // Tombstone tracking to prevent deleted seed tournaments from reappearing
};

// ============================================================
//  BACKWARD-COMPAT LAYER & LOCAL STORAGE HYDRATION
// ============================================================

(function () {
  // ── Critical DB Methods — defined FIRST, before any hydration check ──
  // These must always exist regardless of whether saved data is present.

  const DB_KEY = 'playcarys_db_store_v5';

  DB.save = function () {
    const toSave = {};
    Object.keys(DB).forEach(key => {
      if (typeof DB[key] !== 'function') toSave[key] = DB[key];
    });
    const payload = JSON.stringify(toSave);
    // Persist to localStorage for instant offline access
    localStorage.setItem(DB_KEY, payload);
    // Sync to NestJS backend (fire-and-forget — non-blocking)
    try {
      fetch('http://localhost:3000/api/v1/db-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => { /* backend may be offline; localStorage is the fallback */ });
    } catch (e) { /* no-op */ }
  };

  // localStorage-only save — used on beforeunload to avoid blocking page navigation
  // with a pending network request.
  DB.saveLocal = function () {
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

  DB.generateBracket = function(tournament_id) {
    const t = this.tournaments.find(x => String(x.id) === String(tournament_id) || String(x.tournament_id) === String(tournament_id));
    if (!t) return;

    // Get registered players and sort by PCP (seed 1 = highest points)
    const pids = this.player_tournament
      .filter(pt => String(pt.tournament_id) === String(tournament_id))
      .map(pt => String(pt.player_id))
      .sort((a, b) => {
        const uA = this.users.find(u => String(u.id) === a || String(u.user_id) === a);
        const uB = this.users.find(u => String(u.id) === b || String(u.user_id) === b);
        return (uB?.carys_points || 0) - (uA?.carys_points || 0);
      });

    if (pids.length < 2) return;

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

    // Auto-advance players with a BYE
    this.tournament_matches
      .filter(m => m.tournamentId === tournament_id && m.round === 1 && m.status === 'completed' && m.winnerId)
      .forEach(m => this.advanceMatch(m.match_id, m.winnerId));

    t.status = 'in-progress';
    this.save();
  };

  DB.reportResult = function(match_id, winner_id, reporter_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return;
    m.status = 'pending';
    m.reportedWinner = winner_id;
    m.reportedBy = reporter_id;
    this.save();
  };

  DB.confirmResult = function(match_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m || !m.reportedWinner) return;
    this.advanceMatch(match_id, m.reportedWinner);
  };

  DB.disputeResult = function(match_id) {
    const m = this.tournament_matches.find(x => String(x.match_id) === String(match_id));
    if (!m) return;
    m.status = 'disputed';
    this.save();
  };

  DB.advanceMatch = function(match_id, winner_id) {
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

  DB.awardPoints = function (userId, points) {
    const prof = DB.player_profiles.find(p => String(p.user_id) === String(userId));
    if (prof) {
      prof.carys_points = Math.max(0, (prof.carys_points || 0) + points);
      DB.save();
      return true;
    }
    return false;
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

  DB.resetCarysPoints = function () {
    DB.player_profiles.forEach(p => {
      let winRate = p.play_time > 0 ? p.matches_won / p.play_time : 0;
      p.carys_points = Math.floor(winRate * 5000) + Math.floor(Math.random() * 500);
    });
    DB.save();
  };

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

    // ── Priority 1: localStorage (instant, zero network, ~1ms) ─────────────────────────
    // Always try localStorage first so page loads are instant regardless of backend status.
    const localData = localStorage.getItem(DB_KEY);
    if (localData) {
      savedData = localData;
    } else {
      // ── Priority 2: Seed data (localStorage was empty — first ever load) ───────────
      // The old synchronous XHR to the backend was removed because `async=false` XHR
      // freezes the browser tab for the full TCP timeout (~30s) when the backend is
      // offline. On first load we simply start with the hardcoded seed data and
      // immediately save it to localStorage so the next load is instant.
      console.info('[PlayCarys] No saved state found — starting with seed data.');
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

          // Ensure if new tournaments were added to defaults but not in parsed, they get added
          if (key === 'tournaments') {
            const deletedSet = new Set((parsed.deleted_tournaments || []).map(String));
            defaults.forEach(dt => {
              const strId = String(dt.tournament_id);
              if (!DB.tournaments.find(t => String(t.tournament_id) === strId) && !deletedSet.has(strId)) {
                DB.tournaments.push(dt);
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

  DB.attachGetters = function (obj, type) {
    if (!obj || obj._gettersAttached) return obj;
    if (type === 'session') {
      Object.defineProperties(obj, {
        id: { get() { return String(obj.session_id); }, enumerable: false, configurable: true },
        gameId: { get() { return String(obj.game_id); }, enumerable: false, configurable: true },
        players: {
          get() {
            if (obj._players) return obj._players;
            return DB.player_session
              .filter(ps => String(ps.session_id) === String(obj.session_id))
              .map(ps => String(ps.player_id));
          },
          set(arr) {
            if (obj._players !== undefined) { obj._players = arr.map(String); return; }
            DB.player_session = DB.player_session.filter(ps => String(ps.session_id) !== String(obj.session_id));
            arr.forEach(pid => {
              const numId = parseInt(pid, 10);
              DB.player_session.push({ player_id: isNaN(numId) ? pid : numId, session_id: obj.session_id });
            });
          },
          enumerable: false, configurable: true
        }
      });
    }
    obj._gettersAttached = true;
    return obj;
  };

  function attachBackCompatGetters() {


    // ── USERS ──
    DB.users.forEach(u => {
      const pp = DB.player_profiles.find(p => p.user_id === u.user_id);
      Object.defineProperties(u, {
        id: { get() { return String(u.user_id); }, enumerable: false, configurable: true },
        username: { get() { return u.user_name; }, enumerable: false, configurable: true },
        /* Dynamic lookup — reacts instantly when role_id is changed (e.g. promotion/demotion) */
        role: { get() { return (DB.roles.find(r => r.role_id === u.role_id) || {}).role_name || String(u.role_id); }, enumerable: false, configurable: true },
        level: { get() { return pp ? Math.floor(pp.carys_points / 100) : 1; }, enumerable: false, configurable: true },
        wins: { get() { return pp ? pp.matches_won : 0; }, enumerable: false, configurable: true },
        losses: { get() { return pp ? Math.max(0, Math.round(pp.matches_won * 0.45)) : 0; }, enumerable: false, configurable: true },
        matches: { get() { return pp ? pp.matches_won + Math.max(0, Math.round(pp.matches_won * 0.45)) : 0; }, enumerable: false, configurable: true }
      });
    });

    // ── GAMES ──
    DB.games.forEach(g => {
      Object.defineProperties(g, {
        id: { get() { return String(g.game_id); }, enumerable: false, configurable: true },
        title: { get() { return g.game_name; }, enumerable: false, configurable: true },
        genre: {
          get() {
            const gObj = DB.genres.find(gn => gn.id === parseInt(g.genre_id, 10));
            return gObj ? gObj.name : (g.game_type || "General");
          }, enumerable: false, configurable: true
        },
        status: { get() { return g.game_approval_status; }, set(v) { g.game_approval_status = v; }, enumerable: false, configurable: true },
        enabled: { get() { return g.game_status === "enabled"; }, set(v) { g.game_status = v ? "enabled" : "disabled"; }, enumerable: false, configurable: true },
        maintenance: { get() { return !!g._maintenance; }, set(v) { g._maintenance = !!v; }, enumerable: false, configurable: true },
        publisherId: { get() { return String(g.game_publisher); }, enumerable: false, configurable: true },
        publisher: { get() { const pub = DB.users.find(u => u.user_id === g.game_publisher); return pub ? pub.user_name : "Unknown"; }, enumerable: false, configurable: true }
      });
    });

    // ── SESSIONS ──
    DB.sessions.forEach(s => {
      // Determine if session uses numeric or string ID
      const sidIsString = typeof s.session_id === 'string';
      Object.defineProperties(s, {
        id: { get() { return String(s.session_id); }, enumerable: false, configurable: true },
        gameId: { get() { return String(s.game_id); }, enumerable: false, configurable: true },
        players: {
          get() {
            if (s._players) return s._players; // QP sessions store players directly
            return DB.player_session
              .filter(ps => String(ps.session_id) === String(s.session_id))
              .map(ps => String(ps.player_id));
          },
          set(arr) {
            if (s._players !== undefined) {
              // QP sessions: store directly
              s._players = arr.map(String);
              return;
            }
            DB.player_session = DB.player_session.filter(ps => String(ps.session_id) !== String(s.session_id));
            arr.forEach(pid => {
              const numId = parseInt(pid, 10);
              if (!isNaN(numId)) {
                DB.player_session.push({ player_id: numId, session_id: s.session_id });
              } else {
                // string ID player (guest?)
                DB.player_session.push({ player_id: pid, session_id: s.session_id });
              }
            });
          },
          enumerable: false, configurable: true
        }
      });
      // QP sessions already have players[] array stored directly — expose via _players
      if (s.isQuickPlay && Array.isArray(s.players_arr)) {
        s._players = s.players_arr.map(String);
      }
    });

    // Prune any empty ghost rooms from DB completely
    const initialSessLen = DB.sessions.length;
    DB.sessions = DB.sessions.filter(s => (s.players && s.players.length > 0) || !s.players);
    if (DB.sessions.length !== initialSessLen) {
      localStorage.setItem('playcarys_db_store_v5', JSON.stringify(DB));
    }

    // ── REPORTS ── hydrate all existing reports using the global method
    DB.reports.forEach(r => DB.attachReportGetters(r));

    // ── TOURNAMENTS ──
    DB.tournaments.forEach(t => {
      Object.defineProperties(t, {
        id: { get() { return String(t.tournament_id); }, enumerable: false, configurable: true },
        name: { get() { return t.tournament_name; }, enumerable: false, configurable: true },
        gameId: { get() { return String(t.game_id); }, enumerable: false, configurable: true },
        game: { get() { const g = DB.games.find(gx => String(gx.game_id) === String(t.game_id)); return g ? g.game_name : "Unknown Game"; }, enumerable: false, configurable: true },
        startDate: { get() { return t.start_date; }, enumerable: false, configurable: true },
        // publisherId maps the raw 'organizer' field (FK → USERS.user_id)
        publisherId: { get() { return String(t.organizer); }, enumerable: false, configurable: true },
        publisherName: { get() { const u = DB.users.find(u => u.user_id === t.organizer); return u ? u.user_name : 'PlayCarys'; }, enumerable: false, configurable: true },
        registeredPlayers: {
          get() {
            return DB.player_tournament
              .filter(pt => pt.tournament_id === t.tournament_id)
              .map(pt => String(pt.player_id));
          },
          enumerable: false, configurable: true
        }
      });
    });

    // ── FAVORITES ──
    // One-time migration: v1 had favorites keyed by gameId instead of userId.
    // Force a clean reset so every user starts with an empty, correct-format favorites list.
    if (!localStorage.getItem('favs_migration_v2')) {
      DB.favorites = {};
      localStorage.setItem('favs_migration_v2', 'true');
    } else {
      // Normalize: ensure all keys and values are strings
      const norm = {};
      Object.keys(DB.favorites).forEach(k => {
        norm[String(k)] = (DB.favorites[k] || []).map(String);
      });
      DB.favorites = norm;
    }


    // DB.save is now defined at module top (global, always available)

    // DB.awardPoints is defined at module top

    // DB.updateGame is defined at module top

    // DB.resetCarysPoints is defined at module top

    // DB.pushTelemetry, DB.fireLiveEvent, DB.consumeLiveEvent defined at module top

    // DB.evaluateTournaments is now defined at module top (global, always available)

  }

  // Initialize DB on load
  if (!window._hydrateDB()) {
    attachBackCompatGetters();
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

  // Auto-run once to reset points
  if (!localStorage.getItem('points_reset_v1')) {
    DB.resetCarysPoints();
    localStorage.setItem('points_reset_v1', 'true');
  }

  // Auto-sync mock dates to real time
  (function autoSyncDates() {
    const DB_SYNC_KEY = 'playcarys_db_time_synced_v4';
    if (localStorage.getItem(DB_SYNC_KEY)) return;

    const anchor = new Date("2026-04-09T00:00:00Z").getTime();
    const now = Date.now();
    const delta = now - anchor;
    if (Math.abs(delta) < 1000 * 60 * 60) {
      localStorage.setItem(DB_SYNC_KEY, 'true');
      return;
    }

    function shiftStr(str) {
      if (!str || typeof str !== 'string') return str;
      if (/^202[456]-\d{2}-\d{2}/.test(str)) {
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
    });
    DB.sessions.forEach(s => {
      s.start_time = shiftStr(s.start_time); s.end_time = shiftStr(s.end_time);
      s.createdAt = shiftStr(s.createdAt);
    });
    DB.match_results.forEach(m => m.joined_at = shiftStr(m.joined_at));
    DB.reports.forEach(r => r.report_date = shiftStr(r.report_date));
    if (DB.moderator_actions) DB.moderator_actions.forEach(a => a.action_date = shiftStr(a.action_date));
    if (DB.bans) DB.bans.forEach(b => { b.bannedDate = shiftStr(b.bannedDate); b.expiresDate = shiftStr(b.expiresDate); });

    localStorage.setItem(DB_SYNC_KEY, 'true');
    DB.save();
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

function getTopSessionForGame(gameId, excludeUserId) {
  const gid = parseInt(gameId, 10);
  const exUid = parseInt(excludeUserId, 10);
  return DB.sessions
    .filter(s => {
      if (s.game_id !== gid) return false;
      if (s.status !== "waiting") return false;
      const memberIds = DB.player_session.filter(ps => ps.session_id === s.session_id).map(ps => ps.player_id);
      if (memberIds.includes(exUid)) return false;
      if (memberIds.length >= s.maxPlayers) return false;
      return true;
    })
    .sort((a, b) => {
      const ca = DB.player_session.filter(ps => ps.session_id === a.session_id).length;
      const cb = DB.player_session.filter(ps => ps.session_id === b.session_id).length;
      return cb - ca;
    })[0] || null;
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
    activeSessions: DB.sessions.length,
    pendingReports: DB.reports.filter(r => r.status === "pending").length,
    reviewReports: DB.reports.filter(r => r.status === "under-review").length,
    activeBans: DB.bans.filter(b => b.active).length,
    upcomingTournaments: DB.tournaments.filter(t => t.status === "upcoming").length
  };
}

