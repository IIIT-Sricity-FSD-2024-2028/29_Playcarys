import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsIn,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * One stage of a multi-game tournament, as supplied when CREATING the
 * tournament (inline) or via the standalone add-stage endpoint. Mirrors the
 * TournamentGame entity in data/store.ts minus the ids, which the server
 * assigns.
 */
export class CreateTournamentGameDto {
  @IsInt()
  game_id: number;

  @IsInt()
  @Min(1)
  stage_order: number;

  @IsIn(['score', 'bracket'])
  format: 'score' | 'bracket';

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsIn(['high', 'low'])
  direction?: 'high' | 'low';

  @IsOptional()
  @IsString()
  metric_label?: string;

  @IsOptional()
  @IsString()
  metric_unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points_weight?: number;
}

export class CreateTournamentDto {
  /**
   * Required for a single-game tournament (type omitted or 'single'). Ignored
   * for a multi-game one — `games` below is what decides what gets played;
   * game_id is forced to 0 in the service so nothing that reads it by
   * accident treats a multi-game tournament as single-game.
   */
  @IsOptional()
  @IsInt()
  game_id?: number;

  @IsString()
  tournament_name: string;

  @IsString()
  desc: string;

  @IsInt()
  @Min(2)
  maxParticipants: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsDateString()
  regClose: string;

  /**
   * Kept so existing clients still post it, but IGNORED: `prize` is derived
   * from prize_pool_paise now. A prize nobody funded was the bug.
   */
  @IsString()
  prize: string;

  /** Entry fee in paise. Omit or 0 for a free tournament. */
  @IsOptional()
  @IsInt()
  @Min(0)
  entry_fee_paise?: number;

  @IsInt()
  organizer: number;

  /** Records which kind of account organized it — 'Community' vs 'Official' in the UI. */
  @IsOptional()
  @IsIn(['player', 'publisher', 'moderator', 'admin', 'superuser'])
  organizer_role?: 'player' | 'publisher' | 'moderator' | 'admin' | 'superuser';

  @IsOptional()
  @IsIn(['single', 'multi'])
  type?: 'single' | 'multi';

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  /**
   * Set only for a Community tournament. The service checks that `organizer`
   * is that group's owner or an officer — this is what actually gates who may
   * create one, not organizer_role, which is only a display label.
   */
  @IsOptional()
  @IsInt()
  group_id?: number;

  /**
   * Unset — solo entrants, as every tournament has always worked. Set —
   * entrants are Teams of exactly this many members; registration takes a
   * team_id (see POST /teams/:id/register/:tournamentId) instead of a
   * player_id.
   */
  @IsOptional()
  @IsInt()
  @Min(2)
  team_size?: number;

  // ── single-game only (unused, and ignored, when type === 'multi') ──
  @IsOptional()
  @IsIn(['score', 'bracket'])
  format?: 'score' | 'bracket';

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsIn(['high', 'low'])
  direction?: 'high' | 'low';

  @IsOptional()
  @IsString()
  metric_label?: string;

  @IsOptional()
  @IsString()
  metric_unit?: string;

  /**
   * Multi-game only — every stage, in play order. At least 2, or it is not
   * really a cross-game tournament. Required when type === 'multi'; the
   * service checks this explicitly since class-validator can't express
   * "required only if a sibling field has this value" without a custom
   * validator, and one purpose-built check reads more clearly here than that.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateTournamentGameDto)
  games?: CreateTournamentGameDto[];
}

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  tournament_name?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  maxParticipants?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  regClose?: string;

  @IsOptional()
  @IsString()
  prize?: string;

  /**
   * Visibility can be flipped after creation (e.g. a private friends-only
   * tournament opened up to the public later). `type` (single/multi) is
   * deliberately NOT editable here — it decides which entities the
   * tournament owns (a game_id directly, or TournamentGame rows), and
   * switching it after players have registered or stages have been added
   * would orphan one or the other. Delete and recreate instead.
   */
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';
}

export class RegisterPlayerDto {
  @IsInt()
  player_id: number;

  /** Required for a private tournament; ignored (and unnecessary) for a public one. */
  @IsOptional()
  @IsString()
  invite_code?: string;
}
