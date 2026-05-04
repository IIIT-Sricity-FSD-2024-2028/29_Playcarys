import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSessionDto {
  @IsInt()
  game_id: number;

  @IsString()
  name: string;

  @IsInt()
  created_by: number;

  @IsInt()
  @Min(2)
  maxPlayers: number;

  @IsIn(['casual', 'ranked'])
  mode: 'casual' | 'ranked';

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;
}

export class JoinSessionDto {
  @IsInt()
  player_id: number;
}

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

export class QuickPlayDto {
  @IsInt()
  game_id: number;

  @IsInt()
  player_id: number;
}
