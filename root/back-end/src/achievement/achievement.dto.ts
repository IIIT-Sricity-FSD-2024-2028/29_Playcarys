import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * The largest Carys a single achievement may be worth.
 *
 * Publishers set their own economy, but an achievement is a one-off grant the
 * platform pays out on their behalf, so it needs an outer bound that a
 * publisher cannot raise. Deliberately generous — the point is to stop
 * "carys_reward: 999999", not to second-guess game design.
 */
export const MAX_ACHIEVEMENT_REWARD = 500;

/** The largest XP a single achievement may be worth. Same reasoning. */
export const MAX_ACHIEVEMENT_XP = 1000;

/**
 * What a game's achievements may pay out in TOTAL, across all of them, ever.
 *
 * The per-achievement cap alone is not enough: 500 Carys each is reasonable,
 * 500 Carys times forty achievements is a publisher minting the leaderboard.
 *
 * A lifetime budget works here specifically because achievements are one-time
 * per player — so a game's declared achievements are a fixed, one-off cost per
 * player rather than a recurring drip. An admin can raise a particular game's
 * budget at review time when the game genuinely warrants it.
 */
export const DEFAULT_ACHIEVEMENT_BUDGET_CARYS = 2000;
export const DEFAULT_ACHIEVEMENT_BUDGET_XP = 4000;

export class CreateAchievementDto {
  @ApiProperty({ description: 'Slug the game unlocks by', example: 'first_win' })
  @IsString()
  @MaxLength(48)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, {
    message: 'code must be lowercase letters, numbers, underscore or hyphen',
  })
  code: string;

  @ApiProperty({ example: 'First Blood' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 'Win your first match.' })
  @IsString()
  @MaxLength(240)
  description: string;

  @ApiProperty({ description: 'A single emoji', example: '🏆', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @ApiProperty({ description: `Carys granted once, 0-${MAX_ACHIEVEMENT_REWARD}`, example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ACHIEVEMENT_REWARD)
  carys_reward: number;

  @ApiProperty({ description: `XP granted once, 0-${MAX_ACHIEVEMENT_XP}`, example: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ACHIEVEMENT_XP)
  xp_reward?: number;

  @ApiProperty({ description: 'Title the player may display', example: 'Hill Conqueror', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  title_awarded?: string;

  @ApiProperty({ description: 'Hide until earned', required: false })
  @IsOptional()
  @IsBoolean()
  secret?: boolean;

  @ApiProperty({ description: 'Owning publisher, for the ownership check', example: 5 })
  @Type(() => Number)
  @IsInt()
  publisher_id: number;
}

/** Body of POST /achievements/unlock, sent by the game wrapper. */
export class UnlockAchievementDto {
  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  game_id: number;

  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'The code the game declared at publish time', example: 'first_win' })
  @IsString()
  @MaxLength(48)
  code: string;

  @ApiProperty({ description: 'Match this was earned in, if any', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  session_id?: string;
}

/**
 * Body of PATCH /achievements/:id/review — an admin deciding.
 *
 * A publisher PROPOSES an achievement; it is not grantable until somebody with
 * no stake in that game has looked at what it pays.
 */
export class ReviewAchievementDto {
  @ApiProperty({ description: 'The admin deciding.', example: 2 })
  @Type(() => Number)
  @IsInt()
  reviewer_id: number;

  @ApiProperty({ enum: ['approve', 'reject'], example: 'approve' })
  @IsString()
  decision: 'approve' | 'reject';

  @ApiProperty({
    description:
      "Raise this GAME's lifetime Carys budget as part of the decision. Use when a " +
      'game genuinely warrants more than the default, rather than approving past the cap.',
    required: false,
    example: 3000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget_carys?: number;

  @ApiProperty({ description: "Raise this game's lifetime XP budget.", required: false, example: 6000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget_xp?: number;
}

/**
 * Body of POST /achievements/platform — an admin defining a PLATFORM achievement.
 *
 * These belong to no game (game_id null), are exempt from any publisher's
 * budget, and are evaluated by the platform from its own data. A game has no
 * way to know how many friends a player has, and should not be trusted with it
 * if it did.
 */
export class CreatePlatformAchievementDto {
  @ApiProperty({ description: 'The admin defining it.', example: 2 })
  @Type(() => Number)
  @IsInt()
  admin_id: number;

  @ApiProperty({ example: 'first_match' })
  @IsString()
  @MaxLength(48)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, {
    message: 'code must be lowercase letters, numbers, underscore or hyphen',
  })
  code: string;

  @ApiProperty({ example: 'Getting Started' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 'Play your first match on PlayCarys.' })
  @IsString()
  @MaxLength(240)
  description: string;

  @ApiProperty({ required: false, example: '🎬' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ACHIEVEMENT_REWARD)
  carys_reward: number;

  @ApiProperty({ required: false, example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ACHIEVEMENT_XP)
  xp_reward?: number;

  @ApiProperty({
    description:
      'What the platform measures. first_match | matches_played | friends | first_tournament',
    example: 'first_match',
  })
  @IsString()
  @MaxLength(32)
  rule: string;

  @ApiProperty({ description: 'Threshold for the rule, e.g. 5 friends.', required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  threshold?: number;

  @ApiProperty({ required: false, example: 'First Steps' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  title_awarded?: string;
}

/** Body of PATCH /achievements/title — the player choosing what to display. */
export class SetActiveTitleDto {
  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'A title the player has earned, or null to clear', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  title?: string | null;
}
