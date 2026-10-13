import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDefined } from 'class-validator';

export class PutGameSaveDto {
  @ApiProperty({ example: 7, description: 'The player whose save this is.' })
  @IsInt()
  user_id: number;

  @ApiProperty({
    description:
      'The save blob. Send an object or a JSON string — the platform stores it ' +
      'as an opaque string and never inspects it. What goes in it is entirely ' +
      "the game's business: coins, diamonds, unlocked levels, settings.",
    example: { coins: 1250, diamonds: 8, bestDistance: 4310 },
  })
  @IsDefined()
  data: unknown;
}
