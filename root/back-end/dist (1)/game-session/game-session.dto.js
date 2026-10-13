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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickPlayDto = exports.EndSessionRequestDto = exports.EndSessionDto = exports.SessionResultDto = exports.JoinSessionDto = exports.CreateSessionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateSessionDto {
}
exports.CreateSessionDto = CreateSessionDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "game_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "created_by", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "maxPlayers", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['casual', 'ranked']),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "start_time", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "end_time", void 0);
class JoinSessionDto {
}
exports.JoinSessionDto = JoinSessionDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], JoinSessionDto.prototype, "player_id", void 0);
class SessionResultDto {
}
exports.SessionResultDto = SessionResultDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SessionResultDto.prototype, "player_id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SessionResultDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SessionResultDto.prototype, "player_rank", void 0);
class EndSessionDto {
}
exports.EndSessionDto = EndSessionDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SessionResultDto),
    __metadata("design:type", Array)
], EndSessionDto.prototype, "results", void 0);
class EndSessionRequestDto extends EndSessionDto {
}
exports.EndSessionRequestDto = EndSessionRequestDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], EndSessionRequestDto.prototype, "host_id", void 0);
class QuickPlayDto {
}
exports.QuickPlayDto = QuickPlayDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], QuickPlayDto.prototype, "game_id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], QuickPlayDto.prototype, "player_id", void 0);
//# sourceMappingURL=game-session.dto.js.map