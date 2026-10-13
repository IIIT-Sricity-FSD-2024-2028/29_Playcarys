import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ModeratorActionService } from './moderator-action.service';
import { Roles } from '../roles/roles.decorator';
import { CreateModeratorActionDto, HandleViolationDto, LiftBanDto } from './moderator-action.dto';

@Controller('moderator-actions')
export class ModeratorActionController {
  constructor(private readonly moderatorActionService: ModeratorActionService) {}

  // GET /moderator-actions
  // GET /moderator-actions?moderatorId=3
  @Get()
  findAll(@Query('moderatorId') moderatorId?: string) {
    if (moderatorId) {
      return this.moderatorActionService.findByModerator(parseInt(moderatorId, 10));
    }
    return this.moderatorActionService.findAll();
  }

  // GET /moderator-actions/bans
  @Get('bans')
  findAllBans() {
    return this.moderatorActionService.findAllBans();
  }

  // GET /moderator-actions/bans/active
  @Get('bans/active')
  findActiveBans() {
    return this.moderatorActionService.findActiveBans();
  }

  // POST /moderator-actions/act-on-report
  // Workflow: Moderator reviews a queued player report and applies an action
  @Post('act-on-report')
  @Roles('moderator', 'admin')
  actOnReport(@Body() dto: CreateModeratorActionDto) {
    return this.moderatorActionService.actOnReport(dto);
  }

  // POST /moderator-actions/handle-violation
  // Workflow: Moderator handles a rule violation detected directly (no report)
  @Post('handle-violation')
  @Roles('moderator', 'admin')
  handleViolation(@Body() dto: HandleViolationDto) {
    return this.moderatorActionService.handleViolation(dto);
  }

  // PATCH /moderator-actions/bans/:playerId/lift
  // Moderator lifts an active ban
  @Patch('bans/:playerId/lift')
  @Roles('moderator', 'admin')
  liftBan(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Body() body: LiftBanDto,
  ) {
    return this.moderatorActionService.liftBan(playerId, body.moderator_id);
  }
}
