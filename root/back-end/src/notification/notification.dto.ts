import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  // toRole: broadcast to everyone with that role (null if direct)
  @IsOptional()
  @IsString()
  toRole?: string | null;

  // toUser: direct message to a specific user_id (null if broadcast)
  @IsOptional()
  @IsInt()
  toUser?: number | null;

  @IsString()
  from: string;

  @IsString()
  avatar: string;

  @IsString()
  fromRole: string;

  @IsInt()
  fromUserId: number;

  @IsString()
  msg: string;

  /**
   * What KIND of notification this is — 'friend_request', 'invite',
   * 'password_reset', 'system', or absent for a plain message.
   *
   * It was missing from this DTO while the global ValidationPipe runs with
   * whitelist:true, so it was silently stripped from every notification created
   * through the API. A friend request arrived with no type, which is exactly
   * what the drawer keys off to draw the Accept / Reject buttons — so it
   * rendered as an ordinary message the recipient could not act on.
   */
  @IsOptional()
  @IsString()
  type?: string;
}

export class MarkReadStateDto {
  @IsBoolean()
  read: boolean;
}

export class NotificationAudienceDto {
  @IsInt()
  userId: number;

  @IsString()
  roleName: string;
}

export class MarkReadDto extends NotificationAudienceDto {
  @IsBoolean()
  read: boolean;
}

export class ReplyDto {
  @IsInt()
  fromUserId: number;

  @IsString()
  from: string;

  @IsString()
  msg: string;
}
