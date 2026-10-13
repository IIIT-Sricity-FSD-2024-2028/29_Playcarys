"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let NotificationRepository = class NotificationRepository {
    findAll() {
        return [...store_1.notifications];
    }
    findById(id) {
        return store_1.notifications.find((n) => n.id === id);
    }
    findForUser(userId, roleName) {
        return store_1.notifications.filter((n) => {
            if (n.toUser !== null && n.toUser !== undefined) {
                return n.toUser === userId;
            }
            return n.toRole === roleName;
        });
    }
    isBroadcast(n) {
        return n.toUser === null || n.toUser === undefined;
    }
    isReadBy(n, userId) {
        if (!this.isBroadcast(n))
            return n.read;
        return n.read || (n.readBy || []).includes(userId);
    }
    setReadBy(n, userId, read) {
        if (!this.isBroadcast(n)) {
            n.read = read;
            return;
        }
        const seen = new Set(n.readBy || []);
        if (read)
            seen.add(userId);
        else
            seen.delete(userId);
        n.readBy = [...seen];
    }
    findUnreadForUser(userId, roleName) {
        return this.findForUser(userId, roleName).filter((n) => !this.isReadBy(n, userId));
    }
    create(notification) {
        store_1.notifications.push(notification);
        return notification;
    }
    update(id, partial) {
        const idx = store_1.notifications.findIndex((n) => n.id === id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.notifications[idx], partial);
        return store_1.notifications[idx];
    }
    markAllReadForUser(userId, roleName) {
        let count = 0;
        store_1.notifications.forEach((n) => {
            const isForUser = (n.toUser === userId) ||
                (n.toRole === roleName && (n.toUser === null || n.toUser === undefined));
            if (isForUser && !this.isReadBy(n, userId)) {
                this.setReadBy(n, userId, true);
                count++;
            }
        });
        return count;
    }
    remove(id) {
        const idx = store_1.notifications.findIndex((n) => n.id === id);
        if (idx === -1)
            return false;
        store_1.notifications.splice(idx, 1);
        return true;
    }
    nextId() {
        return store_1.notifications.length === 0
            ? 1
            : Math.max(...store_1.notifications.map((n) => n.id)) + 1;
    }
    countUnread(userId, roleName) {
        return this.findUnreadForUser(userId, roleName).length;
    }
    setReadForUser(id, userId, read) {
        const notif = this.findById(id);
        if (!notif)
            return undefined;
        this.setReadBy(notif, userId, read);
        return notif;
    }
};
exports.NotificationRepository = NotificationRepository;
exports.NotificationRepository = NotificationRepository = __decorate([
    (0, common_1.Injectable)()
], NotificationRepository);
//# sourceMappingURL=notification.repository.js.map