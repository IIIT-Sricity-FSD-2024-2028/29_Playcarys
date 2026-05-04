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
            users: storeUtils.users,
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
            notifications: storeUtils.notifications
        };
    }
    importDb(body) {
        const tables = [
            'roles', 'users', 'player_profiles', 'publisher_profiles',
            'games', 'tournaments', 'sessions', 'match_results',
            'reports', 'moderator_actions', 'player_tournament', 'player_session',
            'bans', 'notifications',
        ];
        for (const table of tables) {
            if (body[table] && Array.isArray(body[table])) {
                const arr = storeUtils[table];
                arr.length = 0;
                arr.push(...body[table]);
            }
        }
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "importDb", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('root'),
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map