import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { EndSessionRequestDto } from './game-session.dto';

@Controller('sessions')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  // GET /sessions
  // GET /sessions?gameId=1&status=waiting
  @Get()
  findAll(
    @Query('gameId') gameId?: string,
    @Query('status') status?: string,
    @Query('hostId') hostId?: string,
  ) {
    return this.gameSessionService.findAll({
      gameId: gameId ? parseInt(gameId, 10) : undefined,
      status,
      hostId: hostId ? parseInt(hostId, 10) : undefined,
    });
  }

  // GET /sessions/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gameSessionService.findOne(id);
  }

  // GET /sessions/player/:playerId  — sessions the player is a member of
  @Get('player/:playerId')
  getPlayerSessions(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.gameSessionService.getPlayerSessions(playerId);
  }

  // ── REMOVED: the room endpoints ──────────────────────────────────────────
  //
  //   POST   /sessions                     create a room
  //   POST   /sessions/quick-play          queue for a room
  //   POST   /sessions/:id/join            take a seat
  //   DELETE /sessions/:id/leave/:playerId give the seat back
  //   GET    /sessions/spectate/:playerId  list rooms to watch
  //
  // Every one of them managed occupancy of a lobby, and every one of them was
  // already dead: the frontend never called this controller at all — it built
  // rooms client-side and bulk-synced them through /db-import. Rooms are gone,
  // so these describe an operation that no longer exists.
  //
  // PATCH /sessions/:id/end below is KEPT deliberately. It is the one endpoint
  // here that does real work: it writes match_results and updates carys_points,
  // play_time and matches_won.

  // PATCH /sessions/:id/end  — end a match and record its results
  @Patch(':id/end')
  endSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EndSessionRequestDto,
  ) {
    const { host_id, ...dto } = body;
    return this.gameSessionService.endSession(id, host_id, dto);
  }
}
