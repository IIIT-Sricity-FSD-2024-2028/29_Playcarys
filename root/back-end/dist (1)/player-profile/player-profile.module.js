"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerProfileModule = void 0;
const common_1 = require("@nestjs/common");
const player_profile_controller_1 = require("./player-profile.controller");
const player_profile_service_1 = require("./player-profile.service");
const player_profile_repository_1 = require("./player-profile.repository");
let PlayerProfileModule = class PlayerProfileModule {
};
exports.PlayerProfileModule = PlayerProfileModule;
exports.PlayerProfileModule = PlayerProfileModule = __decorate([
    (0, common_1.Module)({
        controllers: [player_profile_controller_1.PlayerProfileController],
        providers: [player_profile_service_1.PlayerProfileService, player_profile_repository_1.PlayerProfileRepository],
        exports: [player_profile_service_1.PlayerProfileService, player_profile_repository_1.PlayerProfileRepository],
    })
], PlayerProfileModule);
//# sourceMappingURL=player-profile.module.js.map