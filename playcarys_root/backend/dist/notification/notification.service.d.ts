import { NotificationRepository } from './notification.repository';
import { CreateNotificationDto, MarkReadStateDto, ReplyDto } from './notification.dto';
export declare class NotificationService {
    private readonly repo;
    constructor(repo: NotificationRepository);
    findForUser(userId: number, roleName: string): import("../data/store").Notification[];
    findUnreadForUser(userId: number, roleName: string): import("../data/store").Notification[];
    countUnread(userId: number, roleName: string): {
        unread_count: number;
    };
    findOne(id: number): import("../data/store").Notification;
    create(dto: CreateNotificationDto): import("../data/store").Notification;
    markRead(id: number, userId: number, roleName: string, dto: MarkReadStateDto): import("../data/store").Notification;
    markAllRead(userId: number, roleName: string): {
        message: string;
    };
    reply(id: number, dto: ReplyDto): import("../data/store").Notification;
    remove(id: number, userId: number, roleName: string): {
        message: string;
    };
    private assertOwnership;
}
