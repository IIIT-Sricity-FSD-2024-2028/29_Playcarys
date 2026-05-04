import { IsString, IsOptional, IsInt, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGameDto {
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

export class UpdateGameDto {
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

export class ApproveGameDto {
  @ApiProperty({ description: 'Next approval status', example: 'approved', enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  game_approval_status: 'approved' | 'rejected';

  @ApiProperty({ description: 'Optional admin note', example: 'Everything looks good.', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
