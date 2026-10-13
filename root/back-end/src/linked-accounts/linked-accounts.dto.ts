import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class LinkGameAccountDto {
  @IsInt()
  player_id: number;

  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  platform_label?: string;

  @IsString()
  @MinLength(1)
  in_game_name: string;
}
