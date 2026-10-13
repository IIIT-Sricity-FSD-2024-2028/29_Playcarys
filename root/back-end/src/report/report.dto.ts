import { IsInt, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateReportDto {
  @IsInt()
  reported_by: number;

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
}

export class UpdateReportStatusDto {
  @IsInt()
  requester_user_id: number;

  @IsIn(['pending', 'under-review', 'resolved', 'rejected'])
  status: 'pending' | 'under-review' | 'resolved' | 'rejected';

  @IsOptional()
  @IsString()
  actionNote?: string;
}
