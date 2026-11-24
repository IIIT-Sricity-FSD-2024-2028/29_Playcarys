import { IsInt, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateReportDto {
  @IsOptional()
  @IsInt()
  reported_by?: number;

  @IsInt()
  reported_user: number;

  @IsString()
  type: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  session?: string;

  @IsOptional()
  @IsInt()
  sessionId?: number;

  @IsOptional()
  @IsString()
  evidence_url?: string;

  @IsOptional()
  @IsString()
  evidence_text?: string;

  @IsOptional()
  @IsIn(['unverified', 'verified', 'unavailable', 'contradictory'])
  evidence_status?: 'unverified' | 'verified' | 'unavailable' | 'contradictory';

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class UpdateReportStatusDto {
  @IsOptional()
  @IsInt()
  requester_user_id?: number;

  @IsIn(['pending', 'under-review', 'resolved', 'rejected'])
  status: 'pending' | 'under-review' | 'resolved' | 'rejected';

  @IsOptional()
  @IsString()
  actionNote?: string;
}
