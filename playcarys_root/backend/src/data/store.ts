// ============================================================
//  PlayCarys — Central In-Memory Data Store
//  Mirrors the 12-table SQL schema from db.js.
//  All persistence uses plain TypeScript arrays (no DB adapter).
// ============================================================

export interface Role {
  role_id: number;
  role_name: string;
}

export interface User {
  user_id: number;
  user_name: string;
  role_id: number;
  email: string;
  password: string;
  avatar: string;
  status: 'active' | 'banned' | 'suspended';
  joinDate: string;
  lastSeen: string;
}

export interface PlayerProfile {
  user_id: number;
  player_name: string;
  carys_points: number;
  play_time: number;
  matches_won: number;
  player_status: boolean;
}

export interface PublisherProfile {
  user_id: number;
  total_games: number;
  approved_games: number;
  active_games: number;
}

export interface Game {
  game_id: number;
  game_name: string;
  game_type: string;
  game_status: 'enabled' | 'disabled';
  game_approval_status: 'approved' | 'pending' | 'rejected';
  game_publisher: number;
  desc: string;
  players: string;
  img: string;
  rating: number;
  views: number;
  submittedDate: string;
  sessions: number;
}

export interface Tournament {
  tournament_id: number;
  game_id: number;
  tournament_name: string;
  desc: string;
  participants: number;
  maxParticipants: number;
  status: 'upcoming' | 'in-progress' | 'completed';
  start_date: string;
  end_date: string;
  regClose: string;
  prize: string;
  organizer: number;
}

export interface GameSession {
  session_id: number;
  game_id: number;
  created_by: number;
  name: string;
  game: string;
  host: string;
  hostId: number;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'ended';
  mode: 'casual' | 'ranked';
  start_time: string;
  end_time: string;
  duration: number;
  createdAt: string;
}

export interface MatchResult {
  session_id: number;
  player_id: number;
  score: number;
  player_rank: number;
  joined_at: string;
}

export interface Report {
  report_id: number;
  reported_by: number;
  reported_user: number;
  type: string;
  reason: string;
  status: 'pending' | 'under-review' | 'resolved' | 'rejected';
  report_date: string;
  session: string;
  sessionId: number;
  time: string;
  actionNote: string;
}

export interface ModeratorAction {
  action_id: number;
  moderator_id: number;
  report_id: number;
  action_type: 'warning' | 'restrict' | 'ban' | 'review';
  action_date: string;
  action_reason: string;
}

export interface PlayerTournament {
  player_id: number;
  tournament_id: number;
}

export interface PlayerSession {
  player_id: number;
  session_id: number;
}

export interface Ban {
  id: number;
  playerId: number;
  playerName: string;
  level: number;
  duration: string;
  reason: string;
  bannedBy: string;
  bannedById: number;
  bannedDate: string;
  expiresDate: string;
  active: boolean;
}

export interface Notification {
  id: number;
  toRole: string | null;
  toUser: number | null;
  from: string;
  avatar: string;
  fromRole: string;
  fromUserId: number;
  msg: string;
  time: string;
  read: boolean;
  replies: any[];
}

// ============================================================
//  SEED DATA  (mirrors db.js 1-to-1)
// ============================================================

export const roles: Role[] = [
  { role_id: 1, role_name: 'superuser' },
  { role_id: 2, role_name: 'admin' },
  { role_id: 3, role_name: 'moderator' },
  { role_id: 4, role_name: 'player' },
  { role_id: 5, role_name: 'publisher' },
];

export const users: User[] = [
  { user_id: 0, user_name: 'GodMode', role_id: 1, email: 'godmode@playcarys.com', password: 'godmode#2024', avatar: 'GM', status: 'active', joinDate: '2024-01-01', lastSeen: '2026-03-25' },
  { user_id: 1, user_name: 'SuperAdmin', role_id: 2, email: 'super@playcarys.com', password: 'superadm!n24', avatar: 'SA', status: 'active', joinDate: '2024-01-01', lastSeen: '2026-03-24' },
  { user_id: 2, user_name: 'SystemAdmin', role_id: 2, email: 'admin@playcarys.com', password: 'sysadm1n#24', avatar: 'SA', status: 'active', joinDate: '2024-01-01', lastSeen: '2026-03-24' },
  { user_id: 3, user_name: 'ModeratorOne', role_id: 3, email: 'mod1@example.com', password: 'Mod3r@tor1!', avatar: 'M1', status: 'active', joinDate: '2024-06-15', lastSeen: '2026-03-24' },
  { user_id: 4, user_name: 'ModeratorTwo', role_id: 3, email: 'mod2@example.com', password: 'Mod3r@tor2!', avatar: 'M2', status: 'active', joinDate: '2024-08-01', lastSeen: '2026-03-20' },
  { user_id: 5, user_name: 'EpicGamesStudio', role_id: 5, email: 'contact@epicgames.com', password: 'Epic#Studio25', avatar: 'EG', status: 'active', joinDate: '2024-03-10', lastSeen: '2026-03-23' },
  { user_id: 6, user_name: 'IndieDevStudios', role_id: 5, email: 'hello@indiedev.com', password: 'Ind!eDev#2024', avatar: 'ID', status: 'active', joinDate: '2024-05-20', lastSeen: '2026-03-22' },
  { user_id: 7, user_name: 'DragonSlayer', role_id: 4, email: 'dragon@example.com', password: 'Dr@gon$lay3r', avatar: 'DS', status: 'active', joinDate: '2024-02-14', lastSeen: '2026-03-24' },
  { user_id: 8, user_name: 'NightHawk', role_id: 4, email: 'night@example.com', password: 'N!ghtH@wk99', avatar: 'NH', status: 'active', joinDate: '2024-04-08', lastSeen: '2026-03-23' },
  { user_id: 9, user_name: 'PhoenixRise', role_id: 4, email: 'phoenix@example.com', password: 'Ph03n!xR1se', avatar: 'PR', status: 'active', joinDate: '2024-07-22', lastSeen: '2026-03-21' },
  { user_id: 10, user_name: 'ShadowMaster', role_id: 4, email: 'shadow@example.com', password: 'Sh@d0wM@st3r', avatar: 'SM', status: 'active', joinDate: '2024-09-11', lastSeen: '2026-03-19' },
  { user_id: 11, user_name: 'ToxicPlayer', role_id: 4, email: 'toxic@example.com', password: 'T0x!cPl@y3r', avatar: 'TP', status: 'banned', joinDate: '2024-11-05', lastSeen: '2026-03-15' },
];

export const player_profiles: PlayerProfile[] = [
  { user_id: 7, player_name: 'DragonSlayer', carys_points: 4680, play_time: 892, matches_won: 234, player_status: true },
  { user_id: 8, player_name: 'NightHawk', carys_points: 3780, play_time: 741, matches_won: 189, player_status: true },
  { user_id: 9, player_name: 'PhoenixRise', carys_points: 1960, play_time: 403, matches_won: 98, player_status: true },
  { user_id: 10, player_name: 'ShadowMaster', carys_points: 6200, play_time: 1120, matches_won: 310, player_status: true },
  { user_id: 11, player_name: 'ToxicPlayer', carys_points: 940, play_time: 214, matches_won: 47, player_status: false },
];

export const publisher_profiles: PublisherProfile[] = [
  { user_id: 5, total_games: 4, approved_games: 3, active_games: 3 },
  { user_id: 6, total_games: 3, approved_games: 2, active_games: 2 },
];

export const games: Game[] = [
  { game_id: 1, game_name: 'Call of Duty', game_type: 'FPS', game_status: 'enabled', game_approval_status: 'approved', game_publisher: 5, desc: 'Intense tactical FPS warfare with realistic combat mechanics and squad-based multiplayer action', players: '2-64', img: 'call_of_duty', rating: 4.8, views: 58200, submittedDate: '2025-11-15', sessions: 14 },
  { game_id: 2, game_name: 'DEADshot', game_type: 'FPS', game_status: 'enabled', game_approval_status: 'approved', game_publisher: 5, desc: 'Stealth sniper gameplay in a cyberpunk world — precision kills and tactical assassinations', players: '2-16', img: 'deadshot', rating: 4.6, views: 34700, submittedDate: '2025-12-01', sessions: 10 },
  { game_id: 3, game_name: 'Carrom', game_type: 'Puzzle', game_status: 'enabled', game_approval_status: 'approved', game_publisher: 6, desc: 'Classic Indian board game brought online — flick the striker and pocket all your coins to win', players: '2-4', img: 'carrom', rating: 4.4, views: 22400, submittedDate: '2025-12-20', sessions: 7 },
  { game_id: 4, game_name: 'HorrorEscape', game_type: 'Horror', game_status: 'enabled', game_approval_status: 'approved', game_publisher: 6, desc: 'Survive a haunted mansion filled with puzzles, traps and terrifying creatures lurking in shadows', players: '1-6', img: 'horror_escape', rating: 4.5, views: 19800, submittedDate: '2026-01-08', sessions: 5 },
  { game_id: 5, game_name: 'F1 2022', game_type: 'Racing', game_status: 'enabled', game_approval_status: 'approved', game_publisher: 5, desc: 'High-octane Formula 1 racing with realistic physics, pit strategies and iconic global circuits', players: '2-20', img: 'f1_2022', rating: 4.7, views: 41500, submittedDate: '2026-02-01', sessions: 8 },
  { game_id: 6, game_name: 'PUBG Lite', game_type: 'Battle Royale', game_status: 'disabled', game_approval_status: 'pending', game_publisher: 6, desc: 'Experience intense Battle Royale action optimized for lighter devices with classic maps and modes.', players: '1-60', img: 'pubg_lite', rating: 0, views: 0, submittedDate: '2026-03-31', sessions: 0 },
];

export const tournaments: Tournament[] = [
  { tournament_id: 1, game_id: 1, tournament_name: 'Call of Duty Warzone Cup', desc: 'Ultimate tactical FPS tournament for competitive shooters', participants: 1, maxParticipants: 64, status: 'in-progress', start_date: '2026-03-09', end_date: '2026-04-09', regClose: '2026-03-08', prize: '$2000', organizer: 5 },
  { tournament_id: 2, game_id: 2, tournament_name: 'DEADshot Precision League', desc: 'Test your sniper accuracy in this elite marksmanship tournament', participants: 3, maxParticipants: 32, status: 'upcoming', start_date: '2026-03-16', end_date: '2026-04-16', regClose: '2026-03-14', prize: '$1000', organizer: 5 },
  { tournament_id: 3, game_id: 3, tournament_name: 'Carrom World Championship', desc: 'Compete against the best carrom players from around the globe', participants: 2, maxParticipants: 16, status: 'upcoming', start_date: '2026-03-23', end_date: '2026-04-23', regClose: '2026-03-19', prize: '$500', organizer: 6 },
  { tournament_id: 4, game_id: 4, tournament_name: 'HorrorEscape Survival Marathon', desc: 'Survive the longest inside the haunted mansion to claim victory', participants: 8, maxParticipants: 24, status: 'completed', start_date: '2026-02-20', end_date: '2026-03-20', regClose: '2026-02-18', prize: '$300', organizer: 6 },
  { tournament_id: 5, game_id: 5, tournament_name: 'F1 2022 World Grand Prix', desc: 'Race across iconic circuits to be crowned the ultimate F1 champion', participants: 4, maxParticipants: 20, status: 'upcoming', start_date: '2026-04-05', end_date: '2026-05-05', regClose: '2026-04-02', prize: '$1500', organizer: 5 },
];

export const sessions: GameSession[] = [
  { session_id: 1, game_id: 1, created_by: 8, name: 'Tactical Ops Room', game: 'Call of Duty', host: 'NightHawk', hostId: 8, maxPlayers: 8, status: 'waiting', mode: 'casual', start_time: '2026-03-29T10:00:00Z', end_time: '2026-03-29T12:00:00Z', duration: 0, createdAt: '2026-03-29T10:00:00Z' },
  { session_id: 2, game_id: 2, created_by: 9, name: 'Sniper Elite Squad', game: 'DEADshot', host: 'PhoenixRise', hostId: 9, maxPlayers: 4, status: 'waiting', mode: 'ranked', start_time: '2026-03-29T09:30:00Z', end_time: '2026-03-29T11:30:00Z', duration: 0, createdAt: '2026-03-29T09:30:00Z' },
  { session_id: 3, game_id: 3, created_by: 10, name: 'Carrom Champions', game: 'Carrom', host: 'ShadowMaster', hostId: 10, maxPlayers: 4, status: 'waiting', mode: 'casual', start_time: '2026-03-29T09:45:00Z', end_time: '2026-03-29T11:45:00Z', duration: 0, createdAt: '2026-03-29T09:45:00Z' },
  { session_id: 4, game_id: 4, created_by: 102, name: 'Haunted Manor Run', game: 'HorrorEscape', host: 'GhostRunner', hostId: 102, maxPlayers: 6, status: 'waiting', mode: 'casual', start_time: '2026-03-29T10:15:00Z', end_time: '2026-03-29T12:15:00Z', duration: 0, createdAt: '2026-03-29T10:15:00Z' },
  { session_id: 5, game_id: 5, created_by: 103, name: 'Monaco Grand Prix', game: 'F1 2022', host: 'SpeedKing', hostId: 103, maxPlayers: 20, status: 'waiting', mode: 'casual', start_time: '2026-03-29T10:20:00Z', end_time: '2026-03-29T12:20:00Z', duration: 0, createdAt: '2026-03-29T10:20:00Z' },
  { session_id: 6, game_id: 5, created_by: 104, name: 'Championship Season', game: 'F1 2022', host: 'RaceAce', hostId: 104, maxPlayers: 12, status: 'waiting', mode: 'ranked', start_time: '2026-03-29T10:40:00Z', end_time: '2026-03-29T12:40:00Z', duration: 0, createdAt: '2026-03-29T10:40:00Z' },
  { session_id: 7, game_id: 1, created_by: 101, name: 'Ranked Warfare', game: 'Call of Duty', host: 'FragMaster', hostId: 101, maxPlayers: 10, status: 'waiting', mode: 'ranked', start_time: '2026-03-29T09:10:00Z', end_time: '2026-03-29T11:10:00Z', duration: 0, createdAt: '2026-03-29T09:10:00Z' },
];

export const match_results: MatchResult[] = [
  { session_id: 1, player_id: 8, score: 4200, player_rank: 1, joined_at: '2026-03-28T14:10:00Z' },
  { session_id: 1, player_id: 7, score: 3800, player_rank: 2, joined_at: '2026-03-28T14:12:00Z' },
  { session_id: 2, player_id: 9, score: 2900, player_rank: 1, joined_at: '2026-03-28T15:00:00Z' },
  { session_id: 3, player_id: 10, score: 5100, player_rank: 1, joined_at: '2026-03-28T16:30:00Z' },
  { session_id: 5, player_id: 10, score: 8800, player_rank: 1, joined_at: '2026-03-27T11:00:00Z' },
  { session_id: 5, player_id: 8, score: 7600, player_rank: 2, joined_at: '2026-03-27T11:05:00Z' },
];

export const reports: Report[] = [
  { report_id: 1, reported_by: 7, reported_user: 11, type: 'Toxic Behavior', reason: 'Player was using offensive language and harassing other players', status: 'pending', report_date: '2026-03-29', session: 'Tactical Ops Room', sessionId: 1, time: '2h ago', actionNote: '' },
  { report_id: 2, reported_by: 9, reported_user: 11, type: 'Cheating', reason: 'Suspected use of aimbot or wallhacks', status: 'under-review', report_date: '2026-03-29', session: 'Sniper Elite Squad', sessionId: 2, time: '5h ago', actionNote: '' },
  { report_id: 3, reported_by: 8, reported_user: 10, type: 'Griefing', reason: 'Intentionally sabotaging team gameplay', status: 'resolved', report_date: '2026-03-28', session: 'Carrom Champions', sessionId: 3, time: '24h ago', actionNote: 'Warned player about fair play rules' },
];

export const moderator_actions: ModeratorAction[] = [
  { action_id: 1, moderator_id: 3, report_id: 3, action_type: 'warning', action_date: '2026-03-28', action_reason: 'Warned ShadowMaster about fair play rules — first offence' },
  { action_id: 2, moderator_id: 3, report_id: 1, action_type: 'review', action_date: '2026-03-29', action_reason: 'Reviewing toxic behaviour report — monitoring ToxicPlayer' },
  { action_id: 3, moderator_id: 4, report_id: 2, action_type: 'ban', action_date: '2026-03-29', action_reason: 'Confirmed cheating via replay analysis — banned for 7 days' },
];

export const player_tournament: PlayerTournament[] = [
  { player_id: 7, tournament_id: 1 },
  { player_id: 8, tournament_id: 2 },
  { player_id: 9, tournament_id: 2 },
  { player_id: 10, tournament_id: 2 },
  { player_id: 7, tournament_id: 3 },
  { player_id: 8, tournament_id: 3 },
  { player_id: 7, tournament_id: 4 },
  { player_id: 8, tournament_id: 4 },
  { player_id: 9, tournament_id: 4 },
  { player_id: 10, tournament_id: 4 },
  { player_id: 11, tournament_id: 4 },
  { player_id: 7, tournament_id: 5 },
  { player_id: 8, tournament_id: 5 },
  { player_id: 9, tournament_id: 5 },
  { player_id: 10, tournament_id: 5 },
];

export const player_session: PlayerSession[] = [
  { player_id: 8, session_id: 1 },
  { player_id: 9, session_id: 1 },
  { player_id: 10, session_id: 1 },
  { player_id: 9, session_id: 2 },
  { player_id: 10, session_id: 3 },
];

export const bans: Ban[] = [
  { id: 1, playerId: 11, playerName: 'ToxicPlayer', level: 9, duration: '7 Days', reason: 'Repeated toxic behaviour and harassing other players', bannedBy: 'ModeratorTwo', bannedById: 4, bannedDate: '2026-03-17', expiresDate: '2026-03-24', active: true },
];

export const notifications: Notification[] = [
  { id: 1, toRole: 'admin', toUser: null, from: 'GodMode', avatar: 'GM', fromRole: 'superuser', fromUserId: 0, msg: 'Platform audit scheduled for next Monday. Ensure all reports are filed.', time: '1h ago', read: false, replies: [] },
  { id: 2, toRole: 'admin', toUser: null, from: 'SuperAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 1, msg: 'New publisher IndieDevStudios needs their game reviewed urgently.', time: '3h ago', read: false, replies: [] },
  { id: 3, toRole: 'superuser', toUser: null, from: 'SystemAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 2, msg: 'Server load is at 87%. Consider scaling up resources.', time: '30m ago', read: false, replies: [] },
  { id: 4, toRole: 'superuser', toUser: null, from: 'SuperAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 1, msg: 'ModeratorOne has flagged an unusual activity pattern on session #7.', time: '2h ago', read: false, replies: [] },
  { id: 5, toRole: 'moderator', toUser: null, from: 'SystemAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 2, msg: 'You have 2 new reports pending review under your queue.', time: '45m ago', read: false, replies: [] },
  { id: 6, toRole: 'moderator', toUser: null, from: 'DragonSlayer', avatar: 'DS', fromRole: 'player', fromUserId: 7, msg: 'I\'d like to appeal the warning issued to my account. Can we discuss?', time: '4h ago', read: false, replies: [] },
  { id: 7, toRole: 'publisher', toUser: null, from: 'SystemAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 2, msg: 'Your game HorrorEscape has been approved and is now live!', time: '2h ago', read: false, replies: [] },
  { id: 8, toRole: 'publisher', toUser: null, from: 'SuperAdmin', avatar: 'SA', fromRole: 'admin', fromUserId: 1, msg: 'Please update your publisher profile with a valid contact address.', time: '1d ago', read: true, replies: [] },
  { id: 9, toRole: 'player', toUser: null, from: 'ModeratorOne', avatar: 'M1', fromRole: 'moderator', fromUserId: 3, msg: 'Your report on ToxicPlayer has been reviewed and resolved.', time: '5h ago', read: false, replies: [] },
  { id: 10, toRole: 'player', toUser: null, from: 'System', avatar: 'SY', fromRole: 'admin', fromUserId: 2, msg: 'You have been registered for the F1 2022 World Grand Prix. Good luck!', time: '1d ago', read: true, replies: [] },
  { id: 11, toRole: null, toUser: 8, from: 'DragonSlayer', avatar: 'DS', fromRole: 'player', fromUserId: 7, msg: 'Hey NightHawk! Want to queue for COD tonight? I saved a spot in Tactical Ops.', time: '2h ago', read: false, replies: [] },
  { id: 12, toRole: null, toUser: 8, from: 'ModeratorOne', avatar: 'M1', fromRole: 'moderator', fromUserId: 3, msg: 'NightHawk, your account has been flagged for review. Avoid session #7 until cleared.', time: '1h ago', read: false, replies: [] },
];
