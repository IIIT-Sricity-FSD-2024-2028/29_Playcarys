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
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, GroupChatDto } from './groups.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  // GET /groups                — public groups, plus the caller's own private ones
  // GET /groups?viewerId=7
  // GET /groups?playerId=7     — only groups 7 is a member of
  @Get()
  findAll(@Query('playerId') playerId?: string, @Query('viewerId') viewerId?: string) {
    if (playerId) return this.groups.findForPlayer(parseInt(playerId, 10));
    return this.groups.findAll(viewerId ? parseInt(viewerId, 10) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groups.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groups.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.update(id, dto, requesterId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.remove(id, requesterId);
  }

  // ── Officers ──────────────────────────────────────────────
  @Post(':id/officers/:userId')
  promoteOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.promoteOfficer(id, userId, requesterId);
  }

  @Delete(':id/officers/:userId')
  demoteOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.demoteOfficer(id, userId, requesterId);
  }

  // ── Membership ────────────────────────────────────────────
  @Post(':id/join')
  join(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.groups.join(id, userId);
  }

  @Post(':id/leave')
  leave(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.groups.leave(id, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.removeMember(id, userId, requesterId);
  }

  // ── Join requests ─────────────────────────────────────────
  @Get(':id/requests')
  listRequests(
    @Param('id', ParseIntPipe) id: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.listRequests(id, requesterId);
  }

  @Post(':id/requests/:requestId/accept')
  acceptRequest(
    @Param('id', ParseIntPipe) id: number,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.respondToRequest(id, requestId, true, requesterId);
  }

  @Post(':id/requests/:requestId/reject')
  rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.groups.respondToRequest(id, requestId, false, requesterId);
  }

  // ── Community tournaments ─────────────────────────────────
  @Get(':id/tournaments')
  tournaments(@Param('id', ParseIntPipe) id: number) {
    return this.groups.tournaments(id);
  }

  // ── Chat ──────────────────────────────────────────────────
  @Get(':id/chat')
  chat(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string) {
    return this.groups.chat(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Post(':id/chat')
  postChat(@Param('id', ParseIntPipe) id: number, @Body() dto: GroupChatDto) {
    return this.groups.postChat(id, dto.from_user, dto.body);
  }
}
