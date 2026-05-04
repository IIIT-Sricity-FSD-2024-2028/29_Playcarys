import { Notification } from '../data/store';
export declare class NotificationRepository {
    findAll(): Notification[];
    findById(id: number): Notification | undefined;
    findForUser(userId: number, roleName: string): Notification[];
    findUnreadForUser(userId: number, roleName: string): Notification[];
    create(notification: Notification): Notification;
    update(id: number, partial: Partial<Notification>): Notification | undefined;
    markAllReadForUser(userId: number, roleName: string): number;
    remove(id: number): boolean;
    nextId(): number;
    countUnread(userId: number, roleName: string): number;
}
