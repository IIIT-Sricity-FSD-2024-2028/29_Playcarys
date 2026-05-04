import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateTournamentDto {
  @IsInt()
  game_id: number;

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

  @IsString()
  prize: string;

  @IsInt()
  organizer: number;
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
}

export class RegisterPlayerDto {
  @IsInt()
  player_id: number;
}
