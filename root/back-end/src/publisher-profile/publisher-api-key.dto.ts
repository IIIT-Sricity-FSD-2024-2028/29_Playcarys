import { IsString, IsNotEmpty, IsOptional, IsArray, IsIn, IsBoolean } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

export class ReviewPublisherDto {
  @IsIn(['identity', 'payments'])
  kind: 'identity' | 'payments';

  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsString()
  @IsNotEmpty()
  evidence_reference: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateOnboardingDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'account_created',
    'email_verified',
    'profile_complete',
    'identity_verified',
    'payment_ready',
    'publishing_eligible',
  ])
  stage?:
    | 'account_created'
    | 'email_verified'
    | 'profile_complete'
    | 'identity_verified'
    | 'payment_ready'
    | 'publishing_eligible';

  @IsOptional()
  @IsString()
  @IsIn(['individual', 'organization'])
  publisher_type?: 'individual' | 'organization';

  @IsOptional()
  @IsString()
  @IsIn(['not_submitted', 'pending', 'review_pending', 'verified', 'rejected'])
  kyc_status?: 'not_submitted' | 'pending' | 'review_pending' | 'verified' | 'rejected';

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  street_address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  org_reg_number?: string;

  @IsOptional()
  @IsString()
  authorized_rep?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsBoolean()
  terms_accepted?: boolean;

  @IsOptional()
  @IsString()
  payout_method?: string;

  @IsOptional()
  @IsString()
  payout_destination?: string;
}
