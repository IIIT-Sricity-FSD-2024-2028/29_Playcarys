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
export declare const roles: Role[];
export declare const users: User[];
export declare const player_profiles: PlayerProfile[];
export declare const publisher_profiles: PublisherProfile[];
export declare const games: Game[];
export declare const tournaments: Tournament[];
export declare const sessions: GameSession[];
export declare const match_results: MatchResult[];
export declare const reports: Report[];
export declare const moderator_actions: ModeratorAction[];
export declare const player_tournament: PlayerTournament[];
export declare const player_session: PlayerSession[];
export declare const bans: Ban[];
export declare const notifications: Notification[];
