"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const storeUtils = require("./data/store");
const persistence_1 = require("./data/persistence");
const token_util_1 = require("./auth/token.util");
const DEFAULT_CARYS_CAP = 500;
function snakeToCamel(key) {
    return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
let AppController = class AppController {
    getHello() {
        return {
            message: 'Welcome to the PlayCarys OMGMP API',
            status: 'success',
            version: 'v1'
        };
    }
    exportDb() {
        return {
            roles: storeUtils.roles,
            users: storeUtils.users.map(({ password, ...safe }) => safe),
            player_profiles: storeUtils.player_profiles,
            publisher_profiles: storeUtils.publisher_profiles,
            games: storeUtils.games,
            tournaments: storeUtils.tournaments,
            sessions: storeUtils.sessions,
            match_results: storeUtils.match_results,
            reports: storeUtils.reports,
            moderator_actions: storeUtils.moderator_actions,
            player_tournament: storeUtils.player_tournament,
            player_session: storeUtils.player_session,
            bans: storeUtils.bans,
            notifications: storeUtils.notifications,
            tournament_matches: storeUtils.tournament_matches,
            tournament_results: storeUtils.tournament_results,
            deleted_tournaments: storeUtils.deleted_tournaments,
            favorites: storeUtils.favorites,
            reviews: storeUtils.reviews,
            friendships: storeUtils.friendships,
            game_reviews: storeUtils.game_reviews,
            deleted_games: storeUtils.deleted_games,
            deleted_users: storeUtils.deleted_users,
            achievements: storeUtils.achievements,
            player_achievements: storeUtils.player_achievements
        };
    }
    importDb(body, authHeader) {
        const caller = (0, token_util_1.verifyToken)((0, token_util_1.bearerFrom)(authHeader));
        const staffCaller = !!caller && ['admin', 'superuser'].includes(String(caller.role).toLowerCase());
        const tables = [
            'roles', 'users', 'player_profiles', 'publisher_profiles',
            'games', 'tournaments', 'sessions', 'match_results',
            'reports', 'moderator_actions', 'player_tournament', 'player_session',
            'bans', 'notifications',
            'tournament_matches', 'tournament_results', 'deleted_tournaments',
            'favorites', 'reviews', 'game_reviews', 'friendships',
            'deleted_games',
            'deleted_users',
        ];
        const appendOnlyKey = {
            match_results: (r) => `${r.session_id}|${r.player_id}`,
            sessions: (r) => `${r.session_id ?? r.id}`,
            users: (u) => u.user_id !== null && u.user_id !== undefined && String(u.user_id) !== 'undefined'
                ? `id:${u.user_id}`
                : `em:${u.email}|r:${u.role_id ?? ''}`,
            player_profiles: (p) => `${p.user_id}`,
            notifications: (n) => `${n.id}`,
            player_session: (r) => `${r.player_id}|${r.session_id}`,
            player_tournament: (r) => `${r.player_id}|${r.tournament_id}`,
            game_reviews: (r) => `${r.review_id}`,
            friendships: (f) => `${f.user_a}|${f.user_b}`,
            games: (g) => `${g.game_id}`,
            deleted_games: (d) => `${d && typeof d === 'object' ? d.game_id ?? d.id : d}`,
            deleted_users: (d) => `${d && typeof d === 'object' ? d.user_id ?? d.id : d}`,
        };
        const removedUsers = new Set([
            ...storeUtils.deleted_users,
            ...(Array.isArray(body.deleted_users) ? body.deleted_users : []),
        ].map((d) => `${d && typeof d === 'object' ? d.user_id ?? d.id : d}`));
        const USER_REF_FIELDS = {
            users: ['user_id'],
            player_profiles: ['user_id'],
            publisher_profiles: ['user_id'],
            match_results: ['player_id'],
            player_session: ['player_id'],
            player_tournament: ['player_id'],
            sessions: ['created_by', 'hostId'],
            notifications: ['toUser', 'fromUserId'],
            reviews: ['playerId'],
        };
        const ownedByRemovedUser = (row, table) => {
            const fields = USER_REF_FIELDS[table];
            if (!row || !fields)
                return false;
            return fields.some((f) => row[f] != null && removedUsers.has(String(row[f])));
        };
        const OWNER_REQUIRED = {
            match_results: 'player_id',
            player_session: 'player_id',
            player_tournament: 'player_id',
            player_profiles: 'user_id',
            publisher_profiles: 'user_id',
            reviews: 'playerId',
            users: 'user_id',
        };
        const JUNK_REF = new Set(['nan', 'null', 'undefined', '']);
        const hasUnidentifiableOwner = (row, table) => {
            const owner = OWNER_REQUIRED[table];
            if (!row || !owner)
                return false;
            if (row[owner] == null)
                return true;
            return JUNK_REF.has(String(row[owner]).trim().toLowerCase());
        };
        const isRejected = (row, table) => ownedByRemovedUser(row, table) || hasUnidentifiableOwner(row, table);
        for (const table of tables) {
            if (body[table] && Array.isArray(body[table])) {
                const arr = storeUtils[table];
                const keyOf = appendOnlyKey[table];
                if (table === 'match_results') {
                    const capOf = new Map(storeUtils.games.map((g) => [
                        String(g.game_id),
                        Number.isFinite(g.max_carys_per_match) ? Number(g.max_carys_per_match) : DEFAULT_CARYS_CAP,
                    ]));
                    for (const row of body[table]) {
                        const cap = capOf.get(String(row?.game_id)) ?? DEFAULT_CARYS_CAP;
                        const claimed = Number(row?.carys_earned);
                        if (Number.isFinite(claimed) && claimed > cap) {
                            console.warn(`[db-import] clamped carys_earned ${claimed} -> ${cap} for game ${row.game_id}` +
                                ` (player ${row.player_id})`);
                            row.carys_earned = cap;
                        }
                        if (Number.isFinite(claimed) && claimed < 0)
                            row.carys_earned = 0;
                    }
                }
                if (table === 'users') {
                    const byId = new Map(arr.map((u) => [`${u.user_id ?? u.email}`, u]));
                    for (const incoming of body[table]) {
                        const existing = byId.get(`${incoming.user_id ?? incoming.email}`);
                        if (existing) {
                            incoming.active_session_token = existing.active_session_token ?? null;
                            incoming.active_session_at = existing.active_session_at ?? null;
                        }
                        else {
                            delete incoming.active_session_token;
                            delete incoming.active_session_at;
                        }
                        if (!existing) {
                            if (!staffCaller && incoming.role_id != null && ![4, 5].includes(Number(incoming.role_id))) {
                                console.warn(`[db-import] refused unauthenticated creation of role_id ${incoming.role_id}` +
                                    ` for "${incoming.user_name}" — forced to player`);
                                incoming.role_id = 4;
                                delete incoming.role;
                            }
                            continue;
                        }
                        if (incoming.password == null || incoming.password === '') {
                            incoming.password = existing.password;
                        }
                        if (!staffCaller && incoming.role_id !== existing.role_id) {
                            console.warn(`[db-import] refused role change for user ${existing.user_id}: ` +
                                `${existing.role_id} -> ${incoming.role_id}`);
                            incoming.role_id = existing.role_id;
                            incoming.role = existing.role;
                        }
                        if (!staffCaller && incoming.status !== existing.status) {
                            console.warn(`[db-import] refused status change for user ${existing.user_id}: ` +
                                `${existing.status} -> ${incoming.status}`);
                            incoming.status = existing.status;
                        }
                        const a = Date.parse(incoming.lastSeen ?? '');
                        const b = Date.parse(existing.lastSeen ?? '');
                        if (!isNaN(b) && (isNaN(a) || b > a))
                            incoming.lastSeen = existing.lastSeen;
                    }
                }
                if (table === 'games') {
                    const DELIVERY_FIELDS = [
                        'hosting_type', 'play_path', 'game_url', 'webhook_url',
                        'bundle_size', 'bundle_uploaded_at',
                    ];
                    const REVIEW_FIELDS = [
                        'scan', 'bundle_hash', 'approved_bundle_hash', 'approved_game_url',
                        'approved_by', 'approved_at', 'review_note', 'review_required_reason',
                    ];
                    const byId = new Map(arr.map((g) => [String(g.game_id), g]));
                    for (const incoming of body[table]) {
                        const existing = byId.get(String(incoming.game_id));
                        if (!existing)
                            continue;
                        const incomingMode = incoming.hosting_type ?? incoming.hostingType;
                        const existingMode = existing.hosting_type;
                        const switchingMode = !!(incomingMode && existingMode && incomingMode !== existingMode);
                        if (!switchingMode) {
                            for (const key of DELIVERY_FIELDS) {
                                const clientValue = incoming[key] ?? incoming[snakeToCamel(key)];
                                if (existing[key] != null && clientValue == null) {
                                    incoming[key] = existing[key];
                                }
                            }
                        }
                        for (const key of REVIEW_FIELDS) {
                            if (existing[key] == null)
                                delete incoming[key];
                            else
                                incoming[key] = existing[key];
                        }
                        const clientStatus = incoming.game_approval_status ?? incoming.status;
                        if (clientStatus === 'approved' && existing.game_approval_status !== 'approved') {
                            console.warn(`[db-import] refused client-side approval of game ${incoming.game_id}` +
                                ` — server holds "${existing.game_approval_status}". Use PATCH /games/:id/approve.`);
                            incoming.game_approval_status = existing.game_approval_status;
                        }
                        if (existing.game_approval_status === 'approved' &&
                            existing.approved_by != null &&
                            clientStatus !== 'approved') {
                            console.warn(`[db-import] refused client-side un-approval of game ${incoming.game_id}` +
                                ` — reviewed by user ${existing.approved_by}. Use PATCH /games/:id/approve.`);
                            incoming.game_approval_status = 'approved';
                            incoming.game_status = existing.game_status;
                        }
                        if (existing.img != null && existing.img !== '' && (incoming.img == null || incoming.img === '')) {
                            incoming.img = existing.img;
                        }
                        if (incoming.game_approval_status !== 'approved') {
                            incoming.game_status = 'disabled';
                        }
                    }
                }
                if (keyOf) {
                    const seen = new Set(body[table].map(keyOf));
                    const preserved = arr.filter((row) => !seen.has(keyOf(row)));
                    arr.length = 0;
                    arr.push(...body[table], ...preserved);
                    if (preserved.length) {
                        console.warn(`[db-import] kept ${preserved.length} ${table} row(s) the client did not send`);
                    }
                    body[table] = [...arr];
                    if (table === 'games') {
                        const tombstones = [
                            ...storeUtils.deleted_games,
                            ...(Array.isArray(body.deleted_games) ? body.deleted_games : []),
                        ];
                        const removed = new Set(tombstones.map((d) => String(d && typeof d === 'object' ? d.game_id ?? d.id : d)));
                        if (removed.size) {
                            const kept = arr.filter((g) => !removed.has(String(g.game_id)));
                            if (kept.length !== arr.length) {
                                console.warn(`[db-import] dropped ${arr.length - kept.length} tombstoned game(s)`);
                                arr.length = 0;
                                arr.push(...kept);
                            }
                        }
                        body[table] = [...arr];
                    }
                    if (USER_REF_FIELDS[table]) {
                        const kept = arr.filter((r) => !isRejected(r, table));
                        if (kept.length !== arr.length) {
                            console.warn(`[db-import] dropped ${arr.length - kept.length} orphaned ${table} row(s)`);
                            arr.length = 0;
                            arr.push(...kept);
                        }
                        body[table] = [...arr];
                    }
                }
                else {
                    arr.length = 0;
                    arr.push(...(USER_REF_FIELDS[table]
                        ? body[table].filter((r) => !isRejected(r, table))
                        : body[table]));
                }
            }
        }
        (0, persistence_1.rememberPassthrough)(body);
        return { status: 'ok', synced: tables.filter(t => Array.isArray(body[t])) };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'API Health Check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('db-export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export full in-memory DB (used by frontend on boot)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "exportDb", null);
__decorate([
    (0, common_1.Post)('db-import'),
    (0, swagger_1.ApiOperation)({ summary: 'Import/sync full DB state from frontend (write-back)' }),
    (0, swagger_1.ApiHeader)({ name: 'role', description: 'Caller role for RBAC (any authenticated role accepted)', required: false }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "importDb", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('root'),
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map