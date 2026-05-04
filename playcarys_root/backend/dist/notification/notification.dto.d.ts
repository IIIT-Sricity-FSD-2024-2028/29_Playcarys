export declare class CreateNotificationDto {
    toRole?: string | null;
    toUser?: number | null;
    from: string;
    avatar: string;
    fromRole: string;
    fromUserId: number;
    msg: string;
}
export declare class MarkReadStateDto {
    read: boolean;
}
export declare class NotificationAudienceDto {
    userId: number;
    roleName: string;
}
export declare class MarkReadDto extends NotificationAudienceDto {
    read: boolean;
}
export declare class ReplyDto {
    fromUserId: number;
    from: string;
    msg: string;
}
