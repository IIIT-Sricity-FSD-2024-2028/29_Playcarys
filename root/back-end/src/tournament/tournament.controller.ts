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
import { TournamentService } from './tournament.service';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  RegisterPlayerDto,
  CreateTournamentGameDto,
} from './tournament.dto';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  // GET /tournaments
  // GET /tournaments?status=upcoming
  // GET /tournaments?gameId=1
  // GET /tournaments?includePrivate=true  — an organizer's own list (see my-tournaments.html)
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('gameId') gameId?: string,
    @Query('includePrivate') includePrivate?: string,
  ) {
    return this.tournamentService.findAll({
      status,
      gameId: gameId ? parseInt(gameId, 10) : undefined,
      includePrivate: includePrivate === 'true',
    });
  }

  // GET /tournaments/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.findOne(id);
  }

  // GET /tournaments/:id/registrations
  @Get(':id/registrations')
  getRegistrations(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.getRegistrations(id);
  }

  // GET /tournaments/:id/stages  — multi-game tournaments: every stage, in play order
  @Get(':id/stages')
  listStages(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.listStages(id);
  }

  // POST /tournaments/:id/stages  — add one stage before the tournament starts
  @Post(':id/stages')
  addStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTournamentGameDto,
  ) {
    return this.tournamentService.addStage(id, dto);
  }

  // DELETE /tournaments/:id/stages/:stageId
  @Delete(':id/stages/:stageId')
  removeStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.tournamentService.removeStage(id, stageId);
  }

  // GET /tournaments/player/:playerId
  @Get('player/:playerId')
  getPlayerTournaments(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.tournamentService.getPlayerTournaments(playerId);
  }

  // POST /tournaments
  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentService.create(dto);
  }

  // POST /tournaments/:id/register  — Player: join tournament
  @Post(':id/register')
  registerPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegisterPlayerDto,
  ) {
    return this.tournamentService.registerPlayer(id, dto);
  }

  // DELETE /tournaments/:id/register/:playerId  — Player: leave tournament
  @Delete(':id/register/:playerId')
  unregisterPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.tournamentService.unregisterPlayer(id, playerId);
  }

  // PATCH /tournaments/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentService.update(id, dto);
  }

  // DELETE /tournaments/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentService.remove(id);
  }
}
