"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchResultModule = void 0;
const common_1 = require("@nestjs/common");
const match_result_controller_1 = require("./match-result.controller");
const match_result_service_1 = require("./match-result.service");
const match_result_repository_1 = require("./match-result.repository");
let MatchResultModule = class MatchResultModule {
};
exports.MatchResultModule = MatchResultModule;
exports.MatchResultModule = MatchResultModule = __decorate([
    (0, common_1.Module)({
        controllers: [match_result_controller_1.MatchResultController],
        providers: [match_result_service_1.MatchResultService, match_result_repository_1.MatchResultRepository],
        exports: [match_result_service_1.MatchResultService, match_result_repository_1.MatchResultRepository],
    })
], MatchResultModule);
//# sourceMappingURL=match-result.module.js.map