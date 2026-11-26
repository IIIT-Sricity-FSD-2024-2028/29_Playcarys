import { IsInt, IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsInt()
  user_id?: number;

  @IsString()
  @MinLength(5)
  subject: string;

  @IsIn(['account_billing', 'match_dispute', 'technical_bug', 'conduct_appeal', 'general'])
  category: 'account_billing' | 'match_dispute' | 'technical_bug' | 'conduct_appeal' | 'general';

  @IsIn(['low', 'medium', 'high', 'urgent'])
  urgency: 'low' | 'medium' | 'high' | 'urgent';

  @IsString()
  @MinLength(15)
  message: string;
}

export class ReplySupportTicketDto {
  @IsOptional()
  @IsInt()
  author_id?: number;

  @IsString()
  @MinLength(2)
  message: string;
}

export class UpdateTicketStatusDto {
  @IsOptional()
  @IsInt()
  assigned_moderator_id?: number;

  @IsIn(['open', 'in-progress', 'waiting-on-player', 'resolved', 'closed'])
  status: 'open' | 'in-progress' | 'waiting-on-player' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  resolution_note?: string;
}
