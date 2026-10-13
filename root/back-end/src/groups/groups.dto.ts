import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsInt()
  owner_id: number;

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsIn(['open', 'request', 'invite_only'])
  join_mode?: 'open' | 'request' | 'invite_only';

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  @IsOptional()
  @IsIn(['open', 'request', 'invite_only'])
  join_mode?: 'open' | 'request' | 'invite_only';

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class GroupChatDto {
  @IsInt()
  from_user: number;

  @IsString()
  @MinLength(1)
  body: string;
}
