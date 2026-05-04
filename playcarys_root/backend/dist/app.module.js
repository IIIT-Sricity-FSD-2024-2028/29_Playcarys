"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./auth/auth.module");
const roles_module_1 = require("./roles/roles.module");
const users_module_1 = require("./users/users.module");
const player_profile_module_1 = require("./player-profile/player-profile.module");
const publisher_profile_module_1 = require("./publisher-profile/publisher-profile.module");
const game_module_1 = require("./game/game.module");
const tournament_module_1 = require("./tournament/tournament.module");
const game_session_module_1 = require("./game-session/game-session.module");
const match_result_module_1 = require("./match-result/match-result.module");
const report_module_1 = require("./report/report.module");
const moderator_action_module_1 = require("./moderator-action/moderator-action.module");
const notification_module_1 = require("./notification/notification.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            roles_module_1.RolesModule,
            users_module_1.UsersModule,
            player_profile_module_1.PlayerProfileModule,
            publisher_profile_module_1.PublisherProfileModule,
            game_module_1.GameModule,
            tournament_module_1.TournamentModule,
            game_session_module_1.GameSessionModule,
            match_result_module_1.MatchResultModule,
            report_module_1.ReportModule,
            moderator_action_module_1.ModeratorActionModule,
            notification_module_1.NotificationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map