import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, AddTeamMemberDto } from './teams.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  // GET /teams
  // GET /teams?playerId=7  — every team a player belongs to
  @Get()
  findAll(@Query('playerId') playerId?: string) {
    if (playerId) return this.teams.findForPlayer(parseInt(playerId, 10));
    return this.teams.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teams.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  // POST /teams/:id/members  — body: { user_id }, ?requesterId= is the captain
  @Post(':id/members')
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTeamMemberDto,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.teams.addMember(id, dto, requesterId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.teams.removeMember(id, userId, requesterId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.teams.remove(id, requesterId);
  }

  // POST /teams/:id/register/:tournamentId
  @Post(':id/register/:tournamentId')
  registerForTournament(
    @Param('id', ParseIntPipe) id: number,
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.teams.registerForTournament(id, tournamentId, requesterId);
  }

  // DELETE /teams/:id/register/:tournamentId  — captain withdraws the team
  @Delete(':id/register/:tournamentId')
  unregisterFromTournament(
    @Param('id', ParseIntPipe) id: number,
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.teams.unregisterFromTournament(id, tournamentId, requesterId);
  }
}
