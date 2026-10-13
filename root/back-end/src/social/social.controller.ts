import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SocialService } from './social.service';
import {
  SendFriendRequestDto,
  RespondFriendRequestDto,
  SendMessageDto,
  MarkDeliveredDto,
} from './social.dto';
import { Roles } from '../roles/roles.decorator';

/**
 * Friends, player search and chat.
 *
 * Written as real per-operation endpoints on purpose. Every other social action
 * in this app mutated the local DB object and pushed the WHOLE database through
 * POST /db-import — which is both the reason a stale tab could silently undo
 * someone's changes, and the reason the graded "all CRUD must be backend-driven"
 * requirement was failing.
 */
@ApiTags('social')
@ApiHeader({
  name: 'role',
  description: 'Caller role for RBAC. These routes are for signed-in players.',
  required: false,
})
@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // ── search & profiles ─────────────────────────────────────

  // NOTE: '/players/...', not '/users/...'.
  //
  // UsersController already owns `GET /users/:id` with a ParseIntPipe, and that
  // route matches '/users/search' first — the literal string 'search' is then
  // fed to the pipe and the request dies with "numeric string is expected".
  // Ordering the modules so this one wins would work, and would break silently
  // the moment somebody reordered the imports. A path that cannot collide is
  // the sturdier answer, and 'players' is the more accurate noun anyway: this
  // searches players, not admins or publishers.
  @Get('players/search')
  @ApiOperation({
    summary: 'Search players by name',
    description:
      'Substring match on username, minimum 2 characters. Banned accounts and the ' +
      'viewer themselves are excluded. Each result carries the viewer\'s relationship ' +
      'to that player (none | friends | sent | received) so the UI can draw the right ' +
      'button without a second request.',
  })
  @ApiQuery({ name: 'q', example: 'night', description: 'At least 2 characters.' })
  @ApiQuery({ name: 'viewerId', required: false, example: 7 })
  @ApiOkResponse({
    description: 'Matching players, each with stats, presence and relationship.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user_id: { type: 'number', example: 8 },
          user_name: { type: 'string', example: 'NightHawk' },
          avatar: { type: 'string', example: 'NH' },
          matches: { type: 'number', example: 42 },
          wins: { type: 'number', example: 26 },
          win_rate: { type: 'number', example: 62 },
          presence: {
            type: 'object',
            properties: {
              state: { type: 'string', example: 'playing' },
              game: { type: 'string', example: 'Hill Climbing', nullable: true },
              match_id: { type: 'string', nullable: true },
            },
          },
          relationship: { type: 'string', example: 'none' },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Query shorter than 2 characters.' })
  searchPlayers(@Query('q') q: string, @Query('viewerId') viewerId?: string) {
    return this.social.searchPlayers(q, viewerId ? parseInt(viewerId, 10) : undefined);
  }

  @Get('players/:id/profile')
  @ApiOperation({
    summary: 'Public profile for one player',
    description:
      'Matches, wins and win rate are computed from match_results. The old profile ' +
      'modal read user.matches / user.wins, which exist on no user row, so it always ' +
      'showed zeroes.',
  })
  @ApiParam({ name: 'id', example: 8 })
  @ApiQuery({ name: 'viewerId', required: false, example: 7 })
  @ApiOkResponse({ description: 'The player, with stats, presence and relationship.' })
  @ApiNotFoundResponse({ description: 'No such user.' })
  getProfile(
    @Param('id', ParseIntPipe) id: number,
    @Query('viewerId') viewerId?: string,
  ) {
    return this.social.getProfile(id, viewerId ? parseInt(viewerId, 10) : undefined);
  }

  // ── friends ───────────────────────────────────────────────

  @Get('friends/:userId')
  @ApiOperation({
    summary: "A player's friends",
    description:
      'Each friend carries presence — including the NAME of the game they are ' +
      'playing — and a count of messages they have sent that this client has not ' +
      'yet acknowledged.',
  })
  @ApiParam({ name: 'userId', example: 7 })
  @ApiOkResponse({ description: 'Friends, with presence and unread counts.' })
  listFriends(@Param('userId', ParseIntPipe) userId: number) {
    return this.social.listFriends(userId);
  }

  @Get('friends/:userId/requests')
  @ApiOperation({
    summary: 'Pending friend requests, both directions',
    description:
      'Requests are their own records now, not notifications. Rewriting a ' +
      'notification can no longer erase the fact that a request happened.',
  })
  @ApiParam({ name: 'userId', example: 8 })
  @ApiOkResponse({ description: '{ incoming: [...], outgoing: [...] }' })
  listRequests(@Param('userId', ParseIntPipe) userId: number) {
    return this.social.listRequests(userId);
  }

  @Post('friends/request')
  @Roles('player')
  @ApiOperation({
    summary: 'Send a friend request',
    description:
      'Refuses self-adds, non-players, existing friends, duplicate requests, and ' +
      're-requests inside the cooldown that follows a rejection.',
  })
  @ApiCreatedResponse({ description: 'Request created; the recipient is notified.' })
  @ApiBadRequestResponse({ description: 'Already friends, duplicate request, or not a player.' })
  @ApiForbiddenResponse({ description: 'Rejected recently — still inside the cooldown.' })
  sendRequest(@Body() dto: SendFriendRequestDto) {
    return this.social.sendRequest(dto.from_user, dto.to_user);
  }

  @Post('friends/requests/:id/respond')
  @Roles('player')
  @ApiOperation({
    summary: 'Accept or reject a friend request',
    description:
      'BOTH outcomes notify the requester. Rejection used to be silent, which left ' +
      'the requester waiting on an answer that had already been given.',
  })
  @ApiParam({ name: 'id', description: 'friend_request id' })
  @ApiOkResponse({ description: 'Answered; the requester is notified either way.' })
  @ApiForbiddenResponse({ description: 'The request was not addressed to you.' })
  @ApiNotFoundResponse({ description: 'No such request.' })
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.social.respondToRequest(id, dto.user_id, dto.action);
  }

  @Delete('friends/:userId/:friendId')
  @Roles('player')
  @ApiOperation({
    summary: 'Remove a friend',
    description:
      'Does three things: notifies the other player, ends the friendship for BOTH ' +
      'sides (it is one shared row), and deletes the conversation for BOTH sides. ' +
      'That last part is what makes it different from clearing a conversation.',
  })
  @ApiOkResponse({ description: 'Removed, with a count of messages deleted.' })
  @ApiBadRequestResponse({ description: 'You are not friends with this player.' })
  removeFriend(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    return this.social.removeFriend(userId, friendId);
  }

  // ── messages ──────────────────────────────────────────────

  @Get('messages/:userId/:withUserId')
  @ApiOperation({
    summary: 'Conversation between two players',
    description:
      'Oldest first. Rows the caller has cleared are hidden from THEM only. Each ' +
      "message carries status 'sent' or 'delivered' — there is deliberately no " +
      "'read', because we cannot prove a human read anything.",
  })
  @ApiOkResponse({ description: 'The conversation, oldest first.' })
  getConversation(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('withUserId', ParseIntPipe) withUserId: number,
  ) {
    return this.social.getConversation(userId, withUserId);
  }

  @Post('messages')
  @Roles('player')
  @ApiOperation({
    summary: 'Send a message to a friend',
    description: 'Stored, not relayed. Friends only.',
  })
  @ApiCreatedResponse({ description: "The stored message, status 'sent'." })
  @ApiForbiddenResponse({ description: 'You can only message your friends.' })
  sendMessage(@Body() dto: SendMessageDto) {
    return this.social.sendMessage(dto.from_user, dto.to_user, dto.body);
  }

  @Post('messages/delivered')
  @Roles('player')
  @ApiOperation({
    summary: 'Acknowledge receipt (recipient only)',
    description:
      'Called by the RECIPIENT when their client has the messages. If the sender ' +
      'could mark its own messages delivered, "delivered" would mean nothing more ' +
      'than "sent".',
  })
  @ApiOkResponse({ description: '{ delivered: <count> }' })
  markDelivered(@Body() dto: MarkDeliveredDto) {
    return this.social.markDelivered(dto.user_id, dto.from_user);
  }

  @Delete('messages/:userId/:withUserId')
  @Roles('player')
  @ApiOperation({
    summary: 'Clear a conversation for yourself only',
    description:
      'One-sided by design: the other person keeps their copy. This is why the rows ' +
      'are tombstoned per user rather than deleted — a hard delete here would ' +
      'destroy the other side of a conversation they never agreed to lose.',
  })
  @ApiOkResponse({ description: 'Cleared for the caller only.' })
  deleteConversation(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('withUserId', ParseIntPipe) withUserId: number,
  ) {
    return this.social.deleteConversation(userId, withUserId);
  }
}
