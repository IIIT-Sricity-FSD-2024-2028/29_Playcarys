"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeratorActionModule = void 0;
const common_1 = require("@nestjs/common");
const moderator_action_controller_1 = require("./moderator-action.controller");
const moderator_action_service_1 = require("./moderator-action.service");
const moderator_action_repository_1 = require("./moderator-action.repository");
let ModeratorActionModule = class ModeratorActionModule {
};
exports.ModeratorActionModule = ModeratorActionModule;
exports.ModeratorActionModule = ModeratorActionModule = __decorate([
    (0, common_1.Module)({
        controllers: [moderator_action_controller_1.ModeratorActionController],
        providers: [moderator_action_service_1.ModeratorActionService, moderator_action_repository_1.ModeratorActionRepository],
        exports: [moderator_action_service_1.ModeratorActionService, moderator_action_repository_1.ModeratorActionRepository],
    })
], ModeratorActionModule);
//# sourceMappingURL=moderator-action.module.js.map