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
exports.ApproveGameDto = exports.SetGameStateRequestDto = exports.SetGameStateDto = exports.UpdateGameRequestDto = exports.UpdateGameDto = exports.CreateGameDto = exports.UploadBundleDto = exports.GameDeliveryDto = exports.PLATFORM_MAX_CARYS_PER_MATCH = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
exports.PLATFORM_MAX_CARYS_PER_MATCH = 1000;
class GameDeliveryDto {
}
exports.GameDeliveryDto = GameDeliveryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'How the game is delivered to players',
        enum: ['hosted', 'selfhosted'],
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['hosted', 'selfhosted']),
    __metadata("design:type", String)
], GameDeliveryDto.prototype, "hosting_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Self-hosted games only: absolute URL of the publisher-hosted build',
        example: 'https://mystudio.io/neon-drift/',
        required: false,
    }),
    (0, class_validator_1.ValidateIf)((o) => o.game_url !== undefined && o.game_url !== null && o.game_url !== ''),
    (0, class_validator_1.IsUrl)({ protocols: ['http', 'https'], require_protocol: true }, {
        message: 'game_url must be an absolute http(s) URL',
    }),
    __metadata("design:type", String)
], GameDeliveryDto.prototype, "game_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Optional endpoint that receives match events',
        required: false,
    }),
    (0, class_validator_1.ValidateIf)((o) => o.webhook_url !== undefined && o.webhook_url !== null && o.webhook_url !== ''),
    (0, class_validator_1.IsUrl)({ protocols: ['http', 'https'], require_protocol: true }, {
        message: 'webhook_url must be an absolute http(s) URL',
    }),
    __metadata("design:type", String)
], GameDeliveryDto.prototype, "webhook_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: `Most Carys one match may award a player (0-${exports.PLATFORM_MAX_CARYS_PER_MATCH}). ` +
            'The server clamps anything a match reports above this.',
        example: 200,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(exports.PLATFORM_MAX_CARYS_PER_MATCH),
    __metadata("design:type", Number)
], GameDeliveryDto.prototype, "max_carys_per_match", void 0);
class UploadBundleDto {
}
exports.UploadBundleDto = UploadBundleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Internal ID of the Publisher User', example: 5 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UploadBundleDto.prototype, "publisher_id", void 0);
class CreateGameDto extends GameDeliveryDto {
}
exports.CreateGameDto = CreateGameDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The display name of the game', example: 'Cyberpunk Quest' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGameDto.prototype, "game_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Genre of the game', example: 'RPG' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGameDto.prototype, "game_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Detailed description of gameplay', example: 'Explore a neon-lit city...' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGameDto.prototype, "desc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Player count boundaries', example: '1-4' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGameDto.prototype, "players", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Identifier of the image asset', example: 'cyberpunk_quest', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGameDto.prototype, "img", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Internal ID of the Publisher User', example: 5 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateGameDto.prototype, "game_publisher", void 0);
class UpdateGameDto extends GameDeliveryDto {
}
exports.UpdateGameDto = UpdateGameDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGameDto.prototype, "game_name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGameDto.prototype, "game_type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGameDto.prototype, "desc", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGameDto.prototype, "players", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGameDto.prototype, "img", void 0);
class UpdateGameRequestDto extends UpdateGameDto {
}
exports.UpdateGameRequestDto = UpdateGameRequestDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateGameRequestDto.prototype, "publisher_id", void 0);
class SetGameStateDto {
}
exports.SetGameStateDto = SetGameStateDto;
__decorate([
    (0, class_validator_1.IsIn)(['enabled', 'disabled']),
    __metadata("design:type", String)
], SetGameStateDto.prototype, "game_status", void 0);
class SetGameStateRequestDto extends SetGameStateDto {
}
exports.SetGameStateRequestDto = SetGameStateRequestDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SetGameStateRequestDto.prototype, "publisher_id", void 0);
class ApproveGameDto {
}
exports.ApproveGameDto = ApproveGameDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Next approval status', example: 'approved', enum: ['approved', 'rejected'] }),
    (0, class_validator_1.IsIn)(['approved', 'rejected']),
    __metadata("design:type", String)
], ApproveGameDto.prototype, "game_approval_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'user_id of the admin making the decision', example: 2 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ApproveGameDto.prototype, "reviewer_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reviewer note. Required when rejecting — it is what the publisher is shown.',
        example: 'index.html loads a script from an external CDN; please bundle it.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveGameDto.prototype, "note", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Superuser only: justification for approving a build whose security scan failed. Recorded on the review.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveGameDto.prototype, "override_note", void 0);
//# sourceMappingURL=game.dto.js.map