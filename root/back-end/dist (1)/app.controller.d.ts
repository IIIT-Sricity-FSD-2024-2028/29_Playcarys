import * as storeUtils from './data/store';
export declare class AppController {
    getHello(): {
        message: string;
        status: string;
        version: string;
    };
    exportDb(): {
        roles: storeUtils.Role[];
        users: {
            user_id: number;
            user_name: string;
            role_id: number;
            email: string;
            avatar: string;
            status: "active" | "banned" | "suspended";
            joinDate: string;
            lastSeen: string;
            active_session_token?: string | null;
            active_session_at?: string | null;
        }[];
        player_profiles: storeUtils.PlayerProfile[];
        publisher_profiles: storeUtils.PublisherProfile[];
        games: storeUtils.Game[];
        tournaments: storeUtils.Tournament[];
        sessions: storeUtils.GameSession[];
        match_results: storeUtils.MatchResult[];
        reports: storeUtils.Report[];
        moderator_actions: storeUtils.ModeratorAction[];
        player_tournament: storeUtils.PlayerTournament[];
        player_session: storeUtils.PlayerSession[];
        bans: storeUtils.Ban[];
        notifications: storeUtils.Notification[];
        tournament_matches: any[];
        tournament_results: any[];
        deleted_tournaments: any[];
        favorites: any[];
        reviews: any[];
        friendships: storeUtils.Friendship[];
        game_reviews: storeUtils.GameReview[];
        deleted_games: any[];
        deleted_users: any[];
        achievements: storeUtils.Achievement[];
        player_achievements: storeUtils.PlayerAchievement[];
    };
    importDb(body: Record<string, any>, authHeader?: string): {
        status: string;
        synced: ("roles" | "users" | "player_profiles" | "publisher_profiles" | "games" | "tournaments" | "sessions" | "match_results" | "reports" | "moderator_actions" | "player_tournament" | "player_session" | "bans" | "notifications" | "tournament_matches" | "tournament_results" | "deleted_tournaments" | "deleted_users" | "favorites" | "reviews" | "game_reviews" | "deleted_games" | "friendships" | "achievements" | "player_achievements" | "password_resets")[];
    };
}
