import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class UpdatePlayerProfileDto {
  @IsOptional()
  @IsString()
  player_name?: string;

  @IsOptional()
  @IsBoolean()
  player_status?: boolean;
}

export class AddPointsDto {
  @IsInt()
  @Min(0)
  points: number;

  @IsInt()
  @Min(0)
  play_time: number;

  @IsOptional()
  @IsBoolean()
  won?: boolean;
}
