import { IsInt, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateModeratorActionDto {
  @IsInt()
  moderator_id: number;

  // report_id is optional — violations can be detected directly (not from a report)
  @IsOptional()
  @IsInt()
  report_id?: number;

  @IsIn(['warning', 'restrict', 'ban', 'review'])
  action_type: 'warning' | 'restrict' | 'ban' | 'review';

  @IsString()
  action_reason: string;

  // The player the action is being applied to
  @IsInt()
  target_user_id: number;

  // For bans: how long (e.g. "7 Days", "30 Days", "Permanent")
  @IsOptional()
  @IsString()
  ban_duration?: string;
}

export class HandleViolationDto {
  @IsInt()
  moderator_id: number;

  @IsInt()
  target_user_id: number;

  @IsIn(['warning', 'restrict', 'ban'])
  action_type: 'warning' | 'restrict' | 'ban';

  @IsString()
  action_reason: string;

  @IsString()
  violation_type: string;

  @IsOptional()
  @IsString()
  ban_duration?: string;
}

export class LiftBanDto {
  @IsInt()
  moderator_id: number;
}
