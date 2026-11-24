import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const DEFAULT_CARYS_CAP = 500;

export class PurchaseCosmeticDto {
  @ApiProperty({ description: 'Who is buying' })
  @IsInt()
  user_id!: number;

  @ApiProperty({ description: 'Catalogue item id' })
  @IsInt()
  item_id!: number;

  @ApiProperty({
    description:
      'Which currency to pay in. INR is simulated — no gateway is involved, ' +
      'but the transaction states are real.',
    enum: ['carys', 'inr'],
  })
  @IsIn(['carys', 'inr'])
  currency!: 'carys' | 'inr';

  @ApiProperty({ required: false, description: 'Retry-safe key; a repeat is refused, not charged twice' })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class EquipCosmeticDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;

  @ApiProperty()
  @IsInt()
  item_id!: number;
}

export class UnequipCosmeticDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;

  @ApiProperty()
  @IsInt()
  item_id!: number;
}

export class AwardMatchDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  player_id?: number;

  @ApiProperty()
  @IsInt()
  game_id!: number;

  @ApiProperty({ enum: ['win', 'loss', 'draw'] })
  @IsIn(['win', 'loss', 'draw'])
  result!: 'win' | 'loss' | 'draw';

  @ApiProperty({ required: false, description: 'Session this match belongs to, for the ledger reference' })
  @IsOptional()
  @IsInt()
  session_id?: number;
}

export class ClaimStipendDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;
}

export class SubscribeDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;

  @ApiProperty({ description: 'Plan id, e.g. "pro" or "pro_plus"' })
  @IsString()
  plan_id!: string;
}

export class WithdrawDto {
  @ApiProperty({ enum: ['upi', 'bank'] })
  @IsIn(['upi', 'bank'])
  method!: 'upi' | 'bank';

  @ApiProperty({ required: false, description: 'Required when method === "upi"' })
  @IsOptional()
  @IsString()
  upi_id?: string;

  @ApiProperty({ required: false, description: 'Required when method === "bank"' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiProperty({ required: false, description: 'Required when method === "bank"' })
  @IsOptional()
  @IsString()
  ifsc?: string;
}

export class ClosePayoutDto {
  @ApiProperty({ description: 'Label for the period being closed, e.g. "2026-08"' })
  @IsString()
  period!: string;

  @ApiProperty({ required: false, description: 'Override the minimum payout threshold (staff only)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_paise?: number;
}

export class GrantPublisherFundsDto {
  @ApiProperty({ required: false, description: 'Amount in paise (e.g. 1000000 paise = 10000 INR)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount_paise?: number;

  @ApiProperty({ required: false, description: 'Amount in INR rupees (e.g. 10000)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount_rupees?: number;

  @ApiProperty({ required: false, description: 'Administrative reason for grant' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DepositPublisherFundsDto {
  @ApiProperty({ required: false, description: 'Amount in paise (minimum 10000 = ₹100)' })
  @IsOptional()
  @IsInt()
  @Min(10000)
  amount_paise?: number;

  @ApiProperty({ required: false, description: 'Amount in INR rupees (minimum 100)' })
  @IsOptional()
  @IsInt()
  @Min(100)
  amount_rupees?: number;

  @ApiProperty({ required: false, description: 'Sandbox payment method' })
  @IsOptional()
  @IsString()
  payment_method?: string;
}

export class PlayerWithdrawDto {
  @ApiProperty({ description: 'Amount in paise' })
  @IsInt()
  @Min(10000)
  amount_paise!: number;

  @ApiProperty({ description: 'UPI VPA or Bank Account' })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiProperty({ enum: ['upi', 'bank'] })
  @IsIn(['upi', 'bank'])
  method!: 'upi' | 'bank';
}
