import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsDefined, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// NOTE on `winner_id` below.
//
// It is deliberately `number | string` — bracket slots hold a player id or the
// literal 'BYE' — so it gets no type-specific decorator. But the global
// ValidationPipe runs with `whitelist: true`, which STRIPS every property that
// carries no validation decorator at all. Without @IsDefined() the field was
// silently removed from the body before the handler saw it, and a correctly
// signed result came back "The reported winner is not in this match" because
// the winner was undefined by the time it was compared.

export class StartTournamentDto {
  @ApiProperty({ example: 5, description: 'Must be the tournament organizer.' })
  @Type(() => Number)
  @IsInt()
  organizer_id: number;
}

export class SignedResultDto {
  @ApiProperty({
    example: 7,
    description:
      'Who won. Must be one of the two players actually drawn into this fixture — ' +
      'a publisher may report an outcome, not invent a participant.',
  })
  @IsDefined()
  winner_id: number | string;

  @ApiPropertyOptional({ description: "Publisher's own score line, for the record." })
  @IsOptional()
  score?: string;
}

export class ReportResultDto {
  @ApiProperty({ example: 7, description: 'The player filing the report.' })
  @Type(() => Number)
  @IsInt()
  reporter_id: number;

  @ApiProperty({ example: 8, description: 'Who they say won.' })
  @IsDefined()
  winner_id: number | string;
}

export class ConfirmResultDto {
  @ApiProperty({
    example: 8,
    description: 'The OPPONENT confirming. The reporter cannot confirm their own report.',
  })
  @Type(() => Number)
  @IsInt()
  user_id: number;
}

export class DisputeResultDto {
  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({ example: 'I won 3-1; the reported result is wrong.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ example: 5, description: 'The organizer. Their decision is final.' })
  @Type(() => Number)
  @IsInt()
  organizer_id: number;

  @ApiProperty({ example: 7 })
  @IsDefined()
  winner_id: number | string;
}

export class PostChatDto {
  @ApiProperty({ example: 7 })
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @ApiProperty({ example: 'good luck everyone', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body: string;
}
