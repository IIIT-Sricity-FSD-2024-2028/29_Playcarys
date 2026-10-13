import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';

// CreateSessionDto, JoinSessionDto and QuickPlayDto are gone with the endpoints
// that took them. CreateSessionDto in particular described a room — a name, a
// maxPlayers of at least 2, a host — none of which a match has.

export class SessionResultDto {
  @IsInt()
  player_id: number;

  @IsInt()
  score: number;

  @IsInt()
  player_rank: number;
}

export class EndSessionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SessionResultDto)
  results: SessionResultDto[];
}

export class EndSessionRequestDto extends EndSessionDto {
  @IsInt()
  host_id: number;
}
