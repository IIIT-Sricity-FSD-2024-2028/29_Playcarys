import { Controller, Get, Put, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiNotFoundResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { GameSaveService } from './game-save.service';
import { PutGameSaveDto } from './game-save.dto';

/**
 * Per-game save storage.
 *
 * The platform provides the physical storage; the GAME owns what goes in it and
 * what it means. That split is the whole design: a game running on a phone gets
 * durable per-user storage from the OS, and until now a game running here got
 * localStorage — which is per-browser, so a player's progress was stranded on
 * whichever laptop earned it.
 */
@ApiTags('game-saves')
@ApiHeader({ name: 'role', description: 'Caller role for RBAC.', required: false })
@Controller('games')
export class GameSaveController {
  constructor(private readonly saves: GameSaveService) {}

  @Get(':id/save')
  @ApiOperation({
    summary: "Load a player's save for one game",
    description:
      'Returns data: null when nothing has been saved yet — a first-time player ' +
      'is an ordinary case, not a 404. The blob is returned parsed if it is valid ' +
      'JSON, exactly as the game stored it.',
  })
  @ApiParam({ name: 'id', example: 8, description: 'game_id' })
  @ApiQuery({ name: 'userId', example: 7 })
  @ApiOkResponse({
    description: 'The save blob, or null.',
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', example: 7 },
        game_id: { type: 'number', example: 8 },
        data: { type: 'object', nullable: true, example: { coins: 1250, diamonds: 8 } },
        updated_at: { type: 'string', nullable: true, example: '2026-08-16T09:12:44.001Z' },
        bytes: { type: 'number', example: 38 },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No such game or user.' })
  load(@Param('id', ParseIntPipe) id: number, @Query('userId', ParseIntPipe) userId: number) {
    return this.saves.load(id, userId);
  }

  @Put(':id/save')
  @ApiOperation({
    summary: "Write a player's save for one game",
    description:
      'Last-write-wins: one blob per (player, game), replaced in place. Capped at ' +
      '64 KB measured in UTF-8 BYTES — uploaded games are third-party code writing ' +
      'into the single file this platform keeps all its data in, so an unbounded ' +
      'autosave loop is a denial of service, not a bug.',
  })
  @ApiParam({ name: 'id', example: 8, description: 'game_id' })
  @ApiOkResponse({ description: 'Saved, with the byte size actually stored.' })
  @ApiPayloadTooLargeResponse({ description: 'Blob exceeds the 64 KB limit.' })
  @ApiNotFoundResponse({ description: 'No such game or user.' })
  save(@Param('id', ParseIntPipe) id: number, @Body() dto: PutGameSaveDto) {
    return this.saves.save(id, dto.user_id, dto.data);
  }
}
