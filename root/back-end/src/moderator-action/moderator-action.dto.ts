import { IsInt, IsString, IsIn, IsOptional, MinLength } from 'class-validator';

export class CreateModeratorActionDto {
  @IsInt()
  moderator_id: number;

  // report_id is optional — violations can be detected directly (not from a report)
  @IsOptional()
  @IsInt()
  report_id?: number;

  @IsIn(['warning', 'restrict', 'ban', 'review', 'no_action', 'escalate'])
  action_type: 'warning' | 'restrict' | 'ban' | 'review' | 'no_action' | 'escalate';

  @IsString()
  action_reason: string;

  // The player the action is being applied to
  @IsInt()
  target_user_id: number;

  // For bans: how long (e.g. "24 Hours", "3 Days", "7 Days", "30 Days", "Permanent")
  @IsOptional()
  @IsString()
  ban_duration?: string;

  @IsOptional()
  @IsString()
  violation_category?: string;

  @IsOptional()
  @IsString()
  evidence_summary?: string;

  @IsOptional()
  @IsIn(['unverified', 'verified', 'contradictory', 'unavailable'])
  evidence_status?: 'unverified' | 'verified' | 'contradictory' | 'unavailable';

  @IsOptional()
  @IsInt()
  second_reviewer_id?: number;

  @IsOptional()
  @IsInt()
  session_id?: number;
}

export class HandleViolationDto {
  @IsInt()
  moderator_id: number;

  @IsInt()
  target_user_id: number;

  @IsIn(['warning', 'restrict', 'ban', 'no_action', 'escalate'])
  action_type: 'warning' | 'restrict' | 'ban' | 'no_action' | 'escalate';

  @IsString()
  action_reason: string;

  @IsString()
  violation_type: string;

  @IsOptional()
  @IsString()
  ban_duration?: string;

  @IsOptional()
  @IsString()
  evidence_summary?: string;

  @IsOptional()
  @IsInt()
  second_reviewer_id?: number;

  @IsOptional()
  @IsInt()
  session_id?: number;
}

export class LiftBanDto {
  @IsOptional()
  @IsInt()
  moderator_id?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitBanAppealDto {
  @IsString()
  @MinLength(5, { message: 'Appeal reason must be at least 5 characters' })
  reason: string;

  @IsOptional()
  @IsString()
  evidence_notes?: string;
}

export class DecideBanAppealDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  notes?: string;
}
