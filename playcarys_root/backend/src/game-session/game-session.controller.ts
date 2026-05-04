import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import {
  CreateSessionDto,
  EndSessionRequestDto,
  JoinSessionDto,
  QuickPlayDto,
} from './game-session.dto';

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

  // GET /sessions/spectate/:playerId  — live sessions the player can watch
  // GET /sessions/spectate/:playerId?gameId=1
  @Get('spectate/:playerId')
  getSpectateList(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Query('gameId') gameId?: string,
  ) {
    return this.gameSessionService.getSpectateList(
      playerId,
      gameId ? parseInt(gameId, 10) : undefined,
    );
  }

  // POST /sessions  — Create a new room
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.gameSessionService.create(dto);
  }

  // POST /sessions/quick-play  — Workflow: Quick Play
  @Post('quick-play')
  quickPlay(@Body() dto: QuickPlayDto) {
    return this.gameSessionService.quickPlay(dto);
  }

  // POST /sessions/:id/join  — Player: join a specific room
  @Post(':id/join')
  joinSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JoinSessionDto,
  ) {
    return this.gameSessionService.joinSession(id, dto);
  }

  // DELETE /sessions/:id/leave/:playerId  — Player: leave a room
  @Delete(':id/leave/:playerId')
  leaveSession(
    @Param('id', ParseIntPipe) id: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.gameSessionService.leaveSession(id, playerId);
  }

  // PATCH /sessions/:id/end  — Host: end session and record results
  @Patch(':id/end')
  endSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EndSessionRequestDto,
  ) {
    const { host_id, ...dto } = body;
    return this.gameSessionService.endSession(id, host_id, dto);
  }
}
