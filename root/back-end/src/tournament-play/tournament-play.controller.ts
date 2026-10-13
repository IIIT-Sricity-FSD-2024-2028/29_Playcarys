import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Headers,
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
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { TournamentPlayService } from './tournament-play.service';
import { Roles } from '../roles/roles.decorator';
import {
  StartTournamentDto,
  ReportResultDto,
  ConfirmResultDto,
  DisputeResultDto,
  ResolveDisputeDto,
  PostChatDto,
  SignedResultDto,
} from './tournament-play.dto';

/**
 * Playing a tournament: leaderboards, brackets, match tokens and results.
 *
 * Split from TournamentModule, which is about a tournament's LISTING —
 * creating one, editing it, registering for it. This is what happens once it
 * starts, and it is where the bracket moved to when it came off the client.
 */
@ApiTags('tournament-play')
@Controller('tournaments')
export class TournamentPlayController {
  constructor(private readonly play: TournamentPlayService) {}

  @Get(':id/overview')
  @ApiOperation({
    summary: 'Everything the tournament page needs',
    description:
      'Returns the leaderboard for a score contest or the bracket for a knockout, ' +
      'with `format` saying which. One call, so the page does not have to guess ' +
      'from the game id which shape it is looking at.',
  })
  @ApiParam({ name: 'id', example: 4 })
  @ApiOkResponse({ description: 'Tournament overview with standings or matches.' })
  @ApiNotFoundResponse({ description: 'No such tournament.' })
  overview(@Param('id', ParseIntPipe) id: number) {
    return this.play.overview(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({
    summary: 'Score-contest standings',
    description:
      "Ranks every entrant by the tournament's DECLARED metric and direction, so " +
      'the same endpoint serves distance (high wins) and lap time (low wins). Only ' +
      "results tagged with this tournament and inside its date window count. " +
      'Entrants who have not played sort last either way.',
  })
  @ApiParam({ name: 'id', example: 4 })
  @ApiOkResponse({ description: 'Standings, ranked.' })
  leaderboard(@Param('id', ParseIntPipe) id: number) {
    return this.play.leaderboard(id);
  }

  @Get(':id/bracket')
  @ApiOperation({ summary: 'The knockout bracket, with player names resolved' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Matches, ordered by round.' })
  bracket(@Param('id', ParseIntPipe) id: number) {
    return this.play.bracket(id);
  }

  @Post(':id/start')
  // 'player' included: the multi-game extension lets a player organize a
  // tournament (a "Friday Night FIFA" style casual/college-fest event), not
  // just a publisher's official one — the service layer's own
  // `t.organizer !== callerId` check is still what actually enforces it.
  @Roles('player', 'publisher', 'admin', 'superuser')
  @ApiHeader({ name: 'role', description: 'Organizer, admin or superuser.', required: true })
  @ApiOperation({
    summary: 'Generate the bracket',
    description:
      'Server-side and once only. This used to run in the browser, which meant the ' +
      'bracket was whatever the last client to sync said it was. Byes are fed ' +
      'forward immediately, or round 1 leaves winners that never reach round 2.',
  })
  @ApiCreatedResponse({ description: 'The generated bracket.' })
  @ApiBadRequestResponse({ description: 'Score contest, already started, or fewer than 2 entrants.' })
  @ApiForbiddenResponse({ description: 'Not the organizer.' })
  start(@Param('id', ParseIntPipe) id: number, @Body() dto: StartTournamentDto) {
    return this.play.startTournament(id, dto.organizer_id);
  }

  // ── multi-game stages ─────────────────────────────────────

  @Get(':id/overall-leaderboard')
  @ApiOperation({
    summary: 'Multi-game: combined points standing across every completed stage',
    description:
      'Provisional until every stage is completed (see `complete` in the response). ' +
      'Points per stage come from the placement each player reached in it, scaled by ' +
      "that stage's points_weight.",
  })
  @ApiParam({ name: 'id', example: 4 })
  overallLeaderboard(@Param('id', ParseIntPipe) id: number) {
    return this.play.overallLeaderboard(id);
  }

  @Get(':id/stages/:stageId/leaderboard')
  @ApiOperation({ summary: 'One stage\'s score-contest standings' })
  stageLeaderboard(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.play.stageLeaderboard(id, stageId);
  }

  @Get(':id/stages/:stageId/bracket')
  @ApiOperation({ summary: 'One stage\'s bracket' })
  stageBracket(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.play.stageBracket(id, stageId);
  }

  @Post(':id/stages/:stageId/start')
  @Roles('player', 'publisher', 'admin', 'superuser')
  @ApiOperation({
    summary: 'Open a stage',
    description:
      'Score format: just opens it, players play. Bracket format: generates the ' +
      "bracket, same algorithm as the single-game path, scoped to this stage.",
  })
  startStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: StartTournamentDto,
  ) {
    return this.play.startStage(id, stageId, dto.organizer_id);
  }

  @Post(':id/stages/:stageId/complete')
  @Roles('player', 'publisher', 'admin', 'superuser')
  @ApiOperation({
    summary: 'Close a score-format stage',
    description:
      'Bracket stages complete themselves when the final is decided. A score contest ' +
      'has no equivalent signal, so the organizer closes it explicitly.',
  })
  completeStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: StartTournamentDto,
  ) {
    return this.play.completeStage(id, stageId, dto.organizer_id);
  }

  // ── match tokens ──────────────────────────────────────────

  @Get('matches/:matchId/token')
  @ApiOperation({
    summary: 'Get your signed match token',
    description:
      'The rendezvous key. Both players in a fixture receive a token carrying the ' +
      'SAME match_id; the publisher\'s own matchmaker groups whoever presents it. ' +
      'That is the entire integration on their side — the platform never runs the ' +
      'netcode, which is exactly why rooms were removed. HMAC-signed and short-lived.',
  })
  @ApiParam({ name: 'matchId', example: 'T1R1M0' })
  @ApiQuery({ name: 'userId', example: 7 })
  @ApiOkResponse({ description: '{ match_id, token, deep_link, expires_at }' })
  @ApiForbiddenResponse({ description: 'You are not in this match.' })
  token(@Param('matchId') matchId: string, @Query('userId', ParseIntPipe) userId: number) {
    return this.play.tokenFor(matchId, userId);
  }

  @Post('verify-token')
  @ApiOperation({
    summary: "Publisher-side check of a token a player presented",
    description:
      'For the publisher\'s server to confirm a player really was drawn into the ' +
      'match they claim. Rejects an unsigned, tampered or expired token.',
  })
  @ApiBody({ schema: { type: 'object', properties: { game_id: { type: 'number', example: 2 }, token: { type: 'string' } } } })
  @ApiOkResponse({ description: '{ valid: true, payload: {...} }' })
  @ApiForbiddenResponse({ description: 'Bad signature or expired.' })
  verify(@Body() body: { game_id: number; token: string }) {
    return this.play.verifyToken(body.game_id, body.token);
  }

  // ── results ───────────────────────────────────────────────

  @Post('matches/:matchId/result')
  @ApiOperation({
    summary: "Publisher's server reports a match result (HMAC-signed)",
    description:
      'The integrated path. Sign the RAW JSON body with the game\'s shared secret ' +
      'and send it as X-PlayCarys-Signature (sha256=<hex>). Signing the whole body ' +
      'rather than a few fields is what stops a replay with the winner swapped. ' +
      'This is the first thing that has ever actually used Game.webhook_url\'s secret.',
  })
  @ApiHeader({ name: 'X-PlayCarys-Signature', description: 'sha256=<hmac of the raw body>', required: true })
  @ApiParam({ name: 'matchId', example: 'T1R1M0' })
  @ApiOkResponse({ description: 'Recorded, with the updated bracket.' })
  @ApiForbiddenResponse({ description: 'Signature does not match.' })
  signedResult(
    @Param('matchId') matchId: string,
    @Body() dto: SignedResultDto,
    @Headers('x-playcarys-signature') signature: string,
    @Req() req: any,
  ) {
    // The RAW bytes, not a re-serialised object — JSON.stringify of a parsed
    // body can reorder keys, and then the signature would never match.
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(dto);
    return this.play.reportSigned(matchId, raw, signature, dto.winner_id);
  }

  @Post('matches/:matchId/report')
  @Roles('player')
  @ApiOperation({
    summary: 'Report a result (fallback for un-integrated games)',
    description: 'One player reports; the OTHER has to confirm before it counts.',
  })
  @ApiOkResponse({ description: 'Awaiting the opponent.' })
  report(@Param('matchId') matchId: string, @Body() dto: ReportResultDto) {
    return this.play.report(matchId, dto.reporter_id, dto.winner_id);
  }

  @Post('matches/:matchId/confirm')
  @Roles('player')
  @ApiOperation({
    summary: 'Confirm your opponent\'s report',
    description:
      'The reporter cannot confirm their own report — otherwise "dual report" is ' +
      'one player deciding twice.',
  })
  @ApiOkResponse({ description: 'Confirmed; the bracket advances.' })
  @ApiForbiddenResponse({ description: 'You reported it, so you cannot confirm it.' })
  confirm(@Param('matchId') matchId: string, @Body() dto: ConfirmResultDto) {
    return this.play.confirm(matchId, dto.user_id);
  }

  @Post('matches/:matchId/dispute')
  @Roles('player')
  @ApiOperation({
    summary: 'Dispute a reported result',
    description:
      'Parks the match for the organizer. Disputes previously went nowhere at all — ' +
      'a disagreement simply stopped the tournament with no way to resume it.',
  })
  @ApiOkResponse({ description: 'Disputed; the organizer is asked to decide.' })
  dispute(@Param('matchId') matchId: string, @Body() dto: DisputeResultDto) {
    return this.play.dispute(matchId, dto.user_id, dto.reason);
  }

  @Post('matches/:matchId/resolve')
  // 'player' included: the multi-game extension lets a player organize a
  // tournament (a "Friday Night FIFA" style casual/college-fest event), not
  // just a publisher's official one — the service layer's own
  // `t.organizer !== callerId` check is still what actually enforces it.
  @Roles('player', 'publisher', 'admin', 'superuser')
  @ApiOperation({ summary: 'Organizer settles a disputed match' })
  @ApiOkResponse({ description: 'Settled; the bracket advances.' })
  @ApiForbiddenResponse({ description: 'Not the organizer.' })
  resolve(@Param('matchId') matchId: string, @Body() dto: ResolveDisputeDto) {
    return this.play.resolve(matchId, dto.organizer_id, dto.winner_id);
  }

  @Get('disputes/:organizerId')
  // 'player' included: the multi-game extension lets a player organize a
  // tournament (a "Friday Night FIFA" style casual/college-fest event), not
  // just a publisher's official one — the service layer's own
  // `t.organizer !== callerId` check is still what actually enforces it.
  @Roles('player', 'publisher', 'admin', 'superuser')
  @ApiOperation({ summary: 'Disputed matches waiting on this organizer' })
  @ApiOkResponse({ description: 'Disputed matches.' })
  disputes(@Param('organizerId', ParseIntPipe) organizerId: number) {
    return this.play.disputes(organizerId);
  }

  // ── chat ──────────────────────────────────────────────────

  @Get(':id/chat')
  @ApiOperation({
    summary: 'Tournament public chat',
    description:
      'Everyone in the tournament sees the same thread. Stored in `messages` with ' +
      'tournament_id set and to_user null — a different addressee, not a different ' +
      'kind of message.',
  })
  @ApiOkResponse({ description: 'Messages, oldest first.' })
  chat(@Param('id', ParseIntPipe) id: number) {
    return this.play.chat(id);
  }

  @Post(':id/chat')
  @Roles('player')
  @ApiOperation({
    summary: 'Post to the tournament chat',
    description: 'Registered entrants only — otherwise it is a billboard, not a tournament chat.',
  })
  @ApiCreatedResponse({ description: 'The stored message.' })
  @ApiForbiddenResponse({ description: 'Not registered for this tournament.' })
  postChat(@Param('id', ParseIntPipe) id: number, @Body() dto: PostChatDto) {
    return this.play.postChat(id, dto.user_id, dto.body);
  }
}
