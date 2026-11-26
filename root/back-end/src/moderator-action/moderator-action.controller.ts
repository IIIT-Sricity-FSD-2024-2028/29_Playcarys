import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ModeratorActionService } from './moderator-action.service';
import { Roles } from '../roles/roles.decorator';
import {
  CreateModeratorActionDto,
  HandleViolationDto,
  LiftBanDto,
  SubmitBanAppealDto,
  DecideBanAppealDto,
} from './moderator-action.dto';

@Controller('moderator-actions')
export class ModeratorActionController {
  constructor(private readonly moderatorActionService: ModeratorActionService) {}

  // GET /moderator-actions
  // GET /moderator-actions?moderatorId=3
  @Get()
  @Roles('moderator', 'admin', 'superuser')
  findAll(@Query('moderatorId') moderatorId?: string) {
    if (moderatorId) {
      return this.moderatorActionService.findByModerator(parseInt(moderatorId, 10));
    }
    return this.moderatorActionService.findAll();
  }

  // GET /moderator-actions/bans
  @Get('bans')
  @Roles('moderator', 'admin', 'superuser')
  findAllBans() {
    return this.moderatorActionService.findAllBans();
  }

  // GET /moderator-actions/bans/active
  @Get('bans/active')
  @Roles('moderator', 'admin', 'superuser')
  findActiveBans() {
    return this.moderatorActionService.findActiveBans();
  }

  // GET /moderator-actions/appeals
  @Get('appeals')
  @Roles('moderator', 'admin', 'superuser')
  findAppeals() {
    return this.moderatorActionService.findAppeals();
  }

  // POST /moderator-actions/act-on-report
  // Workflow: Moderator reviews a queued player report and applies an action
  @Post('act-on-report')
  @Roles('moderator', 'admin', 'superuser')
  actOnReport(@Body() dto: CreateModeratorActionDto, @Req() req: any) {
    const actorId = req.auth?.sub;
    return this.moderatorActionService.actOnReport(dto, actorId);
  }

  // POST /moderator-actions/handle-violation
  // Workflow: Moderator handles a rule violation detected directly (no report)
  @Post('handle-violation')
  @Roles('moderator', 'admin', 'superuser')
  handleViolation(@Body() dto: HandleViolationDto, @Req() req: any) {
    const actorId = req.auth?.sub;
    return this.moderatorActionService.handleViolation(dto, actorId);
  }

  // PATCH /moderator-actions/bans/:playerId/lift
  // Moderator lifts an active ban
  @Patch('bans/:playerId/lift')
  @Roles('moderator', 'admin', 'superuser')
  liftBan(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Body() body: LiftBanDto,
    @Req() req: any,
  ) {
    const actorId = req.auth?.sub ?? body.moderator_id;
    return this.moderatorActionService.liftBan(playerId, actorId);
  }

  // POST /moderator-actions/bans/:playerId/appeal
  // Player submits an appeal for their active ban
  @Post('bans/:playerId/appeal')
  @Roles('player', 'moderator', 'admin', 'superuser')
  submitAppeal(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Body() body: SubmitBanAppealDto,
    @Req() req: any,
  ) {
    const actorId = req.auth?.sub;
    // Verify player is appealing their own ban unless staff
    if (req.auth && req.auth.role === 'player' && actorId !== playerId) {
      throw new ForbiddenException('You can only appeal your own ban.');
    }
    return this.moderatorActionService.submitAppeal(playerId, body.reason, body.evidence_notes);
  }

  // PATCH /moderator-actions/bans/:playerId/appeal/decide
  // Moderator reviews and decides on an appeal
  @Patch('bans/:playerId/appeal/decide')
  @Roles('moderator', 'admin', 'superuser')
  decideAppeal(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Body() body: DecideBanAppealDto,
    @Req() req: any,
  ) {
    const actorId = req.auth?.sub;
    return this.moderatorActionService.decideAppeal(playerId, body.decision, actorId, body.notes);
  }
}
