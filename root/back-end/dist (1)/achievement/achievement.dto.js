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
exports.SetActiveTitleDto = exports.UnlockAchievementDto = exports.CreateAchievementDto = exports.MAX_ACHIEVEMENT_REWARD = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
exports.MAX_ACHIEVEMENT_REWARD = 500;
class CreateAchievementDto {
}
exports.CreateAchievementDto = CreateAchievementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Slug the game unlocks by', example: 'first_win' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(48),
    (0, class_validator_1.Matches)(/^[a-z0-9][a-z0-9_-]*$/, {
        message: 'code must be lowercase letters, numbers, underscore or hyphen',
    }),
    __metadata("design:type", String)
], CreateAchievementDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'First Blood' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CreateAchievementDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Win your first match.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(240),
    __metadata("design:type", String)
], CreateAchievementDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'A single emoji', example: '🏆', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8),
    __metadata("design:type", String)
], CreateAchievementDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: `Carys granted once, 0-${exports.MAX_ACHIEVEMENT_REWARD}`, example: 50 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(exports.MAX_ACHIEVEMENT_REWARD),
    __metadata("design:type", Number)
], CreateAchievementDto.prototype, "carys_reward", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Title the player may display', example: 'Hill Conqueror', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateAchievementDto.prototype, "title_awarded", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hide until earned', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAchievementDto.prototype, "secret", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Owning publisher, for the ownership check', example: 5 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateAchievementDto.prototype, "publisher_id", void 0);
class UnlockAchievementDto {
}
exports.UnlockAchievementDto = UnlockAchievementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UnlockAchievementDto.prototype, "game_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 9 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UnlockAchievementDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The code the game declared at publish time', example: 'first_win' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(48),
    __metadata("design:type", String)
], UnlockAchievementDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Match this was earned in, if any', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], UnlockAchievementDto.prototype, "session_id", void 0);
class SetActiveTitleDto {
}
exports.SetActiveTitleDto = SetActiveTitleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 9 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SetActiveTitleDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'A title the player has earned, or null to clear', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], SetActiveTitleDto.prototype, "title", void 0);
//# sourceMappingURL=achievement.dto.js.map