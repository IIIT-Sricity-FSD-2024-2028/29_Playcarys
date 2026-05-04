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
