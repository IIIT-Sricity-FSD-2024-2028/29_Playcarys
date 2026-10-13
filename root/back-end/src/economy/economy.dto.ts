import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Ceiling on Carys one match may award when the game declares no cap of its own.
 *
 * Mirrors DEFAULT_CARYS_CAP in app.controller.ts, which clamps the same value
 * arriving by the db-import path. Both exist because a hosted bundle is
 * third-party code: without a cap a published game could award 999,999 per
 * match and own the leaderboard outright.
 */
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

export class AwardMatchDto {
  @ApiProperty()
  @IsInt()
  user_id!: number;

  @ApiProperty({ description: 'The game played — sets the multiplier and the payout cap' })
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
