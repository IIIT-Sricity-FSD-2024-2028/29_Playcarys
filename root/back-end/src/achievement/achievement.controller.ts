import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AchievementService } from './achievement.service';
import { Roles } from '../roles/roles.decorator';
import {
  CreateAchievementDto,
  CreatePlatformAchievementDto,
  ReviewAchievementDto,
  SetActiveTitleDto,
  UnlockAchievementDto,
} from './achievement.dto';

@ApiTags('achievements')
@Controller()
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  // GET /games/:id/achievements?viewerId=9&includeUnapproved=true
  @Get('games/:id/achievements')
  @ApiOperation({
    summary: "List a game's achievements",
    description:
      'Locked and unlocked together, which is what the player-facing panel needs. ' +
      'Secret achievements appear as masked placeholders until earned. Pending and ' +
      'rejected ones are hidden unless includeUnapproved is set — a player should ' +
      'not be shown a reward that cannot yet be granted.',
  })
  @ApiParam({ name: 'id', example: 8 })
  @ApiQuery({ name: 'viewerId', required: false, example: 7 })
  @ApiQuery({
    name: 'includeUnapproved',
    required: false,
    description: "For the publisher's own view and the admin review console.",
  })
  @ApiOkResponse({ description: 'Achievements, each with an `unlocked` flag.' })
  listForGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Query('viewerId') viewerId?: string,
    @Query('includeUnapproved') includeUnapproved?: string,
  ) {
    return this.achievementService.findForGame(
      gameId,
      viewerId ? parseInt(viewerId, 10) : undefined,
      includeUnapproved === 'true' || includeUnapproved === '1',
    );
  }

  // POST /games/:id/achievements — publisher PROPOSES one
  @Post('games/:id/achievements')
  @Roles('publisher')
  @ApiHeader({ name: 'role', description: 'Must be publisher.', required: true })
  @ApiOperation({
    summary: 'Propose an achievement for your own game',
    description:
      'Created as PENDING — it is not grantable until an admin approves it. Also ' +
      "checked against this game's lifetime reward budget, so a publisher finds out " +
      'while writing it rather than after review.',
  })
  @ApiCreatedResponse({ description: 'Created with status "pending".' })
  @ApiBadRequestResponse({ description: 'Would exceed the game\'s lifetime budget.' })
  @ApiForbiddenResponse({ description: 'Not your game.' })
  create(@Param('id', ParseIntPipe) gameId: number, @Body() dto: CreateAchievementDto) {
    return this.achievementService.create(gameId, dto);
  }

  // GET /achievements/pending — the admin review queue
  @Get('achievements/pending')
  @Roles('admin', 'superuser')
  @ApiHeader({ name: 'role', description: 'Must be admin or superuser.', required: true })
  @ApiOperation({
    summary: 'Achievements awaiting review',
    description:
      "Each row carries its game's committed spend and budget, so the reviewer can " +
      'see what approving it would commit the game to.',
  })
  @ApiOkResponse({ description: 'Pending achievements, newest first.' })
  pending() {
    return this.achievementService.findPending();
  }

  // PATCH /achievements/:id/review — admin decides
  @Patch('achievements/:id/review')
  @Roles('admin', 'superuser')
  @ApiHeader({ name: 'role', description: 'Must be admin or superuser.', required: true })
  @ApiOperation({
    summary: 'Approve or reject a proposed achievement',
    description:
      'The budget is re-checked here, not only at creation: several achievements can ' +
      'be proposed while all are still pending, each passing a check against a total ' +
      'that did not include the others. An admin may raise this game\'s budget as part ' +
      'of the decision.',
  })
  @ApiOkResponse({ description: 'Decision recorded.' })
  @ApiBadRequestResponse({ description: 'Approving would exceed the budget.' })
  @ApiNotFoundResponse({ description: 'No such achievement.' })
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewAchievementDto) {
    return this.achievementService.review(id, dto);
  }

  // POST /achievements/platform — admin defines a platform-wide achievement
  @Post('achievements/platform')
  @Roles('admin', 'superuser')
  @ApiHeader({ name: 'role', description: 'Must be admin or superuser.', required: true })
  @ApiOperation({
    summary: 'Define a platform-wide achievement',
    description:
      'Belongs to no game, exempt from any publisher budget, and evaluated by the ' +
      'platform from its own data — a game cannot see how many friends a player has, ' +
      'and should not be trusted with it if it could.',
  })
  @ApiCreatedResponse({ description: 'Created and approved.' })
  createPlatform(@Body() dto: CreatePlatformAchievementDto) {
    return this.achievementService.createPlatform(dto);
  }

  // POST /players/:userId/achievements/evaluate — grant what the platform owes
  @Post('players/:userId/achievements/evaluate')
  @ApiOperation({
    summary: 'Evaluate platform achievements for a player',
    description:
      'Grants any platform achievement the player now qualifies for. Safe to call ' +
      'after a match, a new friendship or a tournament entry — it only ever grants ' +
      'what is not already held.',
  })
  @ApiOkResponse({ description: '{ granted: <count>, achievements: [...] }' })
  evaluate(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.evaluatePlatform(userId);
  }

  // DELETE /achievements/:id?publisherId=5
  @Delete('achievements/:id')
  @Roles('publisher')
  remove(
    @Param('id', ParseIntPipe) achievementId: number,
    @Query('publisherId', ParseIntPipe) publisherId: number,
  ) {
    return this.achievementService.remove(achievementId, publisherId);
  }

  // POST /achievements/unlock — called by the game wrapper on the player's behalf
  //
  // Intentionally unguarded by role: the caller is a game running as an
  // ordinary player, and the endpoint grants nothing that can be chosen by the
  // caller. It accepts a code, not a reward, and refuses codes the game never
  // declared — so there is no privilege here to protect.
  @Post('achievements/unlock')
  @ApiOperation({ summary: 'Record that a player earned a declared achievement' })
  unlock(@Body() dto: UnlockAchievementDto) {
    return this.achievementService.unlock(dto);
  }

  // GET /players/:userId/achievements
  @Get('players/:userId/achievements')
  listForPlayer(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.findForPlayer(userId);
  }

  // GET /players/:userId/titles
  @Get('players/:userId/titles')
  titles(@Param('userId', ParseIntPipe) userId: number) {
    return { titles: this.achievementService.titlesFor(userId) };
  }

  // PATCH /players/:userId/title — display an earned title
  @Patch('players/:userId/title')
  setTitle(@Param('userId', ParseIntPipe) userId: number, @Body() dto: SetActiveTitleDto) {
    return this.achievementService.setActiveTitle({ ...dto, user_id: userId });
  }
}
