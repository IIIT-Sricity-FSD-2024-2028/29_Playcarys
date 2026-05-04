import * as storeUtils from './data/store';
export declare class AppController {
    getHello(): {
        message: string;
        status: string;
        version: string;
    };
    exportDb(): {
        roles: storeUtils.Role[];
        users: storeUtils.User[];
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
    };
    importDb(body: Record<string, any>): {
        status: string;
        synced: ("roles" | "users" | "player_profiles" | "publisher_profiles" | "games" | "tournaments" | "sessions" | "match_results" | "reports" | "moderator_actions" | "player_tournament" | "player_session" | "bans" | "notifications")[];
    };
}
