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
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("./notification.service");
const notification_dto_1 = require("./notification.dto");
let NotificationController = class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    findForUser(userId, roleName) {
        return this.notificationService.findForUser(userId, roleName);
    }
    findUnread(userId, roleName) {
        return this.notificationService.findUnreadForUser(userId, roleName);
    }
    countUnread(userId, roleName) {
        return this.notificationService.countUnread(userId, roleName);
    }
    findOne(id) {
        return this.notificationService.findOne(id);
    }
    create(dto) {
        return this.notificationService.create(dto);
    }
    reply(id, dto) {
        return this.notificationService.reply(id, dto);
    }
    markRead(id, body) {
        const { userId, roleName, ...dto } = body;
        return this.notificationService.markRead(id, userId, roleName, dto);
    }
    markAllRead(body) {
        return this.notificationService.markAllRead(body.userId, body.roleName);
    }
    remove(id, body) {
        return this.notificationService.remove(id, body.userId, body.roleName);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('roleName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "findForUser", null);
__decorate([
    (0, common_1.Get)('unread'),
    __param(0, (0, common_1.Query)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('roleName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "findUnread", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_1.Query)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('roleName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "countUnread", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_dto_1.CreateNotificationDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/reply'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, notification_dto_1.ReplyDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "reply", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, notification_dto_1.MarkReadDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)('mark-all-read'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_dto_1.NotificationAudienceDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, notification_dto_1.NotificationAudienceDto]),
    __metadata("design:returntype", void 0)
], NotificationController.prototype, "remove", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map