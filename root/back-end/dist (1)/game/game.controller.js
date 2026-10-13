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
exports.GameController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const game_service_1 = require("./game.service");
const roles_decorator_1 = require("../roles/roles.decorator");
const bundle_service_1 = require("./bundle.service");
const game_dto_1 = require("./game.dto");
let GameController = class GameController {
    constructor(gameService) {
        this.gameService = gameService;
    }
    findAll(status, publisherId, active) {
        return this.gameService.findAll({
            status,
            publisherId: publisherId ? parseInt(publisherId, 10) : undefined,
            active: active === 'true',
        });
    }
    findOne(id) {
        return this.gameService.findOne(id);
    }
    create(dto) {
        return this.gameService.create(dto);
    }
    update(id, body) {
        const { publisher_id, ...dto } = body;
        return this.gameService.update(id, dto, publisher_id);
    }
    setGameState(id, body) {
        const { publisher_id, ...dto } = body;
        return this.gameService.setGameState(id, dto, publisher_id);
    }
    uploadBundle(id, file, body) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('No bundle uploaded. Send the archive as the "bundle" form field.');
        }
        return this.gameService.installBundle(id, file.buffer, body.publisher_id);
    }
    removeBundle(id, publisherId) {
        return this.gameService.removeBundle(id, publisherId);
    }
    getReview(id) {
        return this.gameService.getReview(id);
    }
    rescan(id) {
        return this.gameService.rescan(id);
    }
    approveGame(id, dto, callerRole) {
        return this.gameService.approveGame(id, dto, callerRole || 'admin');
    }
    remove(id) {
        return this.gameService.remove(id);
    }
};
exports.GameController = GameController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('publisherId')),
    __param(2, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('publisher'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [game_dto_1.CreateGameDto]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('publisher'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, game_dto_1.UpdateGameRequestDto]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/state'),
    (0, roles_decorator_1.Roles)('publisher'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, game_dto_1.SetGameStateRequestDto]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "setGameState", null);
__decorate([
    (0, common_1.Post)(':id/bundle'),
    (0, roles_decorator_1.Roles)('publisher'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['bundle', 'publisher_id'],
            properties: {
                bundle: { type: 'string', format: 'binary', description: 'Web build as a .zip (index.html at root)' },
                publisher_id: { type: 'integer', example: 5 },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('bundle', {
        limits: { fileSize: bundle_service_1.MAX_BUNDLE_BYTES, files: 1 },
    })),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, game_dto_1.UploadBundleDto]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "uploadBundle", null);
__decorate([
    (0, common_1.Delete)(':id/bundle'),
    (0, roles_decorator_1.Roles)('publisher'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('publisherId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "removeBundle", null);
__decorate([
    (0, common_1.Get)(':id/review'),
    (0, roles_decorator_1.Roles)('admin', 'superuser'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getReview", null);
__decorate([
    (0, common_1.Post)(':id/rescan'),
    (0, roles_decorator_1.Roles)('admin', 'superuser'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "rescan", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)('admin', 'superuser'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, game_dto_1.ApproveGameDto, String]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "approveGame", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'superuser'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "remove", null);
exports.GameController = GameController = __decorate([
    (0, common_1.Controller)('games'),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameController);
//# sourceMappingURL=game.controller.js.map