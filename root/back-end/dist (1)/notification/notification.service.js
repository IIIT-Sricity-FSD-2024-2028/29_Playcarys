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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const notification_repository_1 = require("./notification.repository");
const store_1 = require("../data/store");
let NotificationService = class NotificationService {
    constructor(repo) {
        this.repo = repo;
    }
    findForUser(userId, roleName) {
        const notifs = this.repo.findForUser(userId, roleName);
        return notifs.sort((a, b) => {
            if (a.read !== b.read)
                return a.read ? 1 : -1;
            return b.id - a.id;
        });
    }
    findUnreadForUser(userId, roleName) {
        return this.repo.findUnreadForUser(userId, roleName);
    }
    countUnread(userId, roleName) {
        return { unread_count: this.repo.countUnread(userId, roleName) };
    }
    findOne(id) {
        const notif = this.repo.findById(id);
        if (!notif)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        return notif;
    }
    create(dto) {
        const hasRole = dto.toRole !== null && dto.toRole !== undefined && dto.toRole !== '';
        const hasUser = dto.toUser !== null && dto.toUser !== undefined;
        if (!hasRole && !hasUser) {
            throw new common_1.BadRequestException('Notification must target either a role (broadcast) or a specific user (direct)');
        }
        if (hasRole && hasUser) {
            throw new common_1.BadRequestException('Notification cannot target both a role and a specific user simultaneously');
        }
        if (hasRole) {
            const validRoleNames = store_1.roles.map((r) => r.role_name);
            if (!validRoleNames.includes(dto.toRole)) {
                throw new common_1.BadRequestException(`Invalid role name "${dto.toRole}". Valid roles: ${validRoleNames.join(', ')}`);
            }
        }
        if (hasUser) {
            const targetUser = store_1.users.find((u) => u.user_id === dto.toUser);
            if (!targetUser) {
                throw new common_1.NotFoundException(`Target user ${dto.toUser} not found`);
            }
        }
        const sender = store_1.users.find((u) => u.user_id === dto.fromUserId);
        if (!sender) {
            throw new common_1.NotFoundException(`Sender user ${dto.fromUserId} not found`);
        }
        const newId = this.repo.nextId();
        const notification = this.repo.create({
            id: newId,
            toRole: dto.toRole ?? null,
            toUser: dto.toUser ?? null,
            from: dto.from,
            avatar: dto.avatar,
            fromRole: dto.fromRole,
            fromUserId: dto.fromUserId,
            msg: dto.msg,
            time: 'Just now',
            read: false,
            replies: [],
        });
        return notification;
    }
    markRead(id, userId, roleName, dto) {
        const notif = this.repo.findById(id);
        if (!notif)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        this.assertOwnership(notif, userId, roleName);
        const updated = this.repo.setReadForUser(id, userId, dto.read);
        return updated;
    }
    markAllRead(userId, roleName) {
        const count = this.repo.markAllReadForUser(userId, roleName);
        return { message: `Marked ${count} notification(s) as read` };
    }
    reply(id, dto) {
        const notif = this.repo.findById(id);
        if (!notif)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        if (notif.toUser === null || notif.toUser === undefined) {
            throw new common_1.BadRequestException('Replies are only allowed for direct notifications');
        }
        const sender = store_1.users.find((u) => u.user_id === dto.fromUserId);
        if (!sender)
            throw new common_1.NotFoundException(`User ${dto.fromUserId} not found`);
        const replyEntry = {
            fromUserId: dto.fromUserId,
            from: dto.from,
            avatar: sender.avatar,
            msg: dto.msg,
            time: new Date().toISOString(),
        };
        const updatedReplies = [...notif.replies, replyEntry];
        return this.repo.update(id, { replies: updatedReplies });
    }
    remove(id, userId, roleName) {
        const notif = this.repo.findById(id);
        if (!notif)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        if (notif.toUser === null || notif.toUser === undefined) {
            throw new common_1.BadRequestException('Only direct notifications can be deleted');
        }
        this.assertOwnership(notif, userId, roleName);
        this.repo.remove(id);
        return { message: `Notification ${id} deleted` };
    }
    assertOwnership(notif, userId, roleName) {
        const isDirectToUser = notif.toUser === userId;
        const isBroadcastToRole = notif.toRole === roleName && (notif.toUser === null || notif.toUser === undefined);
        if (!isDirectToUser && !isBroadcastToRole) {
            throw new common_1.ForbiddenException('You do not have access to this notification');
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_repository_1.NotificationRepository])
], NotificationService);
//# sourceMappingURL=notification.service.js.map