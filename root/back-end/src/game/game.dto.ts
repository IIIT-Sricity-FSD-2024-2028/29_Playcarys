import { IsString, IsOptional, IsInt, IsIn, IsUrl, ValidateIf, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Hard ceiling on what any publisher may declare per match.
 *
 * The publisher owns their economy below this line; they do not get to move
 * the line. An admin sees the declared value on the review page, so an
 * unreasonable-but-legal number is still a human decision rather than a
 * silent one.
 */
export const PLATFORM_MAX_CARYS_PER_MATCH = 1000;


/**
 * Shared delivery fields. A game is only playable once it declares how it is
 * hosted — either we serve an uploaded bundle (Model A, `hosted`) or we embed
 * the publisher's own URL (Model B, `selfhosted`).
 */
export class GameDeliveryDto {
  @ApiProperty({
    description: 'How the game is delivered to players',
    enum: ['hosted', 'selfhosted'],
    required: false,
  })
  @IsOptional()
  @IsIn(['hosted', 'selfhosted'])
  hosting_type?: 'hosted' | 'selfhosted';

  @ApiProperty({
    description: 'Self-hosted games only: absolute URL of the publisher-hosted build',
    example: 'https://mystudio.io/neon-drift/',
    required: false,
  })
  @ValidateIf((o) => o.game_url !== undefined && o.game_url !== null && o.game_url !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, {
    message: 'game_url must be an absolute http(s) URL',
  })
  game_url?: string;

  @ApiProperty({
    description: 'Optional endpoint that receives match events',
    required: false,
  })
  @ValidateIf((o) => o.webhook_url !== undefined && o.webhook_url !== null && o.webhook_url !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, {
    message: 'webhook_url must be an absolute http(s) URL',
  })
  webhook_url?: string;

  @ApiProperty({
    description:
      `Most Carys one match may award a player (0-${PLATFORM_MAX_CARYS_PER_MATCH}). ` +
      'The server clamps anything a match reports above this.',
    example: 200,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(PLATFORM_MAX_CARYS_PER_MATCH)
  max_carys_per_match?: number;
}

/** Body of POST /games/:id/bundle (multipart — sent alongside the file). */
export class UploadBundleDto {
  @ApiProperty({ description: 'Internal ID of the Publisher User', example: 5 })
  @Type(() => Number)
  @IsInt()
  publisher_id: number;
}

export class CreateGameDto extends GameDeliveryDto {
  @ApiProperty({ description: 'The display name of the game', example: 'Cyberpunk Quest' })
  @IsString()
  game_name: string;

  @ApiProperty({ description: 'Genre of the game', example: 'RPG' })
  @IsString()
  game_type: string;

  @ApiProperty({ description: 'Detailed description of gameplay', example: 'Explore a neon-lit city...' })
  @IsString()
  desc: string;

  @ApiProperty({ description: 'Player count boundaries', example: '1-4' })
  @IsString()
  players: string;

  @ApiProperty({ description: 'Identifier of the image asset', example: 'cyberpunk_quest', required: false })
  @IsOptional()
  @IsString()
  img?: string;

  // Set by system from authenticated publisher session
  @ApiProperty({ description: 'Internal ID of the Publisher User', example: 5 })
  @IsInt()
  game_publisher: number;
}

export class UpdateGameDto extends GameDeliveryDto {
  @IsOptional()
  @IsString()
  game_name?: string;

  @IsOptional()
  @IsString()
  game_type?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsString()
  players?: string;

  @IsOptional()
  @IsString()
  img?: string;
}

export class UpdateGameRequestDto extends UpdateGameDto {
  @IsInt()
  publisher_id: number;
}

export class SetGameStateDto {
  @IsIn(['enabled', 'disabled'])
  game_status: 'enabled' | 'disabled';
}

export class SetGameStateRequestDto extends SetGameStateDto {
  @IsInt()
  publisher_id: number;
}

/**
 * Body of PATCH /games/:id/approve — a review decision.
 *
 * `reviewer_id` is required because a decision without an accountable name
 * attached is not an audit trail. It is validated against the user table and
 * must belong to an admin or superuser.
 */
export class ApproveGameDto {
  @ApiProperty({ description: 'Next approval status', example: 'approved', enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  game_approval_status: 'approved' | 'rejected';

  @ApiProperty({ description: 'user_id of the admin making the decision', example: 2 })
  @Type(() => Number)
  @IsInt()
  reviewer_id: number;

  @ApiProperty({
    description: 'Reviewer note. Required when rejecting — it is what the publisher is shown.',
    example: 'index.html loads a script from an external CDN; please bundle it.',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description:
      'Superuser only: justification for approving a build whose security scan failed. Recorded on the review.',
    required: false,
  })
  @IsOptional()
  @IsString()
  override_note?: string;
}
