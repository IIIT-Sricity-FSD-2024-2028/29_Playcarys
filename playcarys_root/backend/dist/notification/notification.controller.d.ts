import { NotificationService } from './notification.service';
import { CreateNotificationDto, MarkReadDto, NotificationAudienceDto, ReplyDto } from './notification.dto';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findForUser(userId: number, roleName: string): import("../data/store").Notification[];
    findUnread(userId: number, roleName: string): import("../data/store").Notification[];
    countUnread(userId: number, roleName: string): {
        unread_count: number;
    };
    findOne(id: number): import("../data/store").Notification;
    create(dto: CreateNotificationDto): import("../data/store").Notification;
    reply(id: number, dto: ReplyDto): import("../data/store").Notification;
    markRead(id: number, body: MarkReadDto): import("../data/store").Notification;
    markAllRead(body: NotificationAudienceDto): {
        message: string;
    };
    remove(id: number, body: NotificationAudienceDto): {
        message: string;
    };
}
