import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ModeratorActionRepository } from './moderator-action.repository';
import { CreateModeratorActionDto, HandleViolationDto } from './moderator-action.dto';
import { users, reports, player_profiles } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-MOD-1: Only users with role moderator (3) or admin (2) or superuser (1) can create actions
// R-MOD-2: A ban action must include a ban_duration
// R-MOD-3: A player cannot be banned twice simultaneously (must lift existing ban first)
// R-MOD-4: Banning a player sets their user status='banned' and player_status=false
// R-MOD-5: A warning/restrict action updates the report status to 'resolved' if report_id given
// R-MOD-6: A moderator cannot take action against another moderator or higher role
// R-MOD-7: Violation handling without a report_id is valid (direct detection)
// ────────────────────────────────────────────────────────────

const MODERATOR_ROLES = [1, 2, 3]; // superuser, admin, moderator

@Injectable()
export class ModeratorActionService {
  constructor(private readonly repo: ModeratorActionRepository) {}

  findAll() {
    return this.repo.findAll().map((a) => this.enrichAction(a));
  }

  findByModerator(moderatorId: number) {
    return this.repo.findByModerator(moderatorId).map((a) => this.enrichAction(a));
  }

  findAllBans() {
    return this.repo.findAllBans().map((b) => this.enrichBan(b));
  }

  findActiveBans() {
    return this.repo.findActiveBans().map((b) => this.enrichBan(b));
  }

  // Workflow: Review Player Reports — moderator takes action on a queued report
  actOnReport(dto: CreateModeratorActionDto) {
    // R-MOD-1
    const moderator = users.find((u) => u.user_id === dto.moderator_id);
    if (!moderator) throw new NotFoundException(`Moderator user ${dto.moderator_id} not found`);
    if (!MODERATOR_ROLES.includes(moderator.role_id)) {
      throw new ForbiddenException('Only moderators and admins can apply enforcement actions');
    }

    // Validate report exists if provided
    if (dto.report_id) {
      const report = reports.find((r) => r.report_id === dto.report_id);
      if (!report) throw new NotFoundException(`Report ${dto.report_id} not found`);
      if (report.status === 'resolved' || report.status === 'rejected') {
        throw new BadRequestException('This report is already closed');
      }
    }

    // Validate target user exists
    const target = users.find((u) => u.user_id === dto.target_user_id);
    if (!target) throw new NotFoundException(`Target user ${dto.target_user_id} not found`);

    // R-MOD-6
    if (MODERATOR_ROLES.includes(target.role_id) && target.role_id <= moderator.role_id) {
      throw new ForbiddenException('Cannot take enforcement action against a user of equal or higher role');
    }

    // R-MOD-2
    if (dto.action_type === 'ban' && !dto.ban_duration) {
      throw new BadRequestException('ban_duration is required for ban actions');
    }

    // R-MOD-3
    if (dto.action_type === 'ban') {
      const existingBan = this.repo.findBanByPlayer(dto.target_user_id);
      if (existingBan) {
        throw new BadRequestException('Player already has an active ban. Lift the existing ban first.');
      }
    }

    // Create the action record
    const action = this.repo.createAction({
      action_id: this.repo.nextActionId(),
      moderator_id: dto.moderator_id,
      report_id: dto.report_id ?? 0,
      action_type: dto.action_type,
      action_date: new Date().toISOString().split('T')[0],
      action_reason: dto.action_reason,
    });

    // Apply side effects based on action type
    this.applyActionEffects(dto.action_type, dto.target_user_id, moderator, dto);

    // R-MOD-5: resolve the linked report
    if (dto.report_id) {
      const reportIdx = reports.findIndex((r) => r.report_id === dto.report_id);
      if (reportIdx !== -1) {
        reports[reportIdx].status = 'resolved';
        reports[reportIdx].actionNote = dto.action_reason;
      }
    }

    return this.enrichAction(action);
  }

  // Workflow: Handle Rule Violations — moderator acts on a detected violation (no report needed)
  handleViolation(dto: HandleViolationDto) {
    // R-MOD-7: wrap into the action flow without a report_id
    return this.actOnReport({
      moderator_id: dto.moderator_id,
      report_id: undefined,
      action_type: dto.action_type,
      action_reason: `[${dto.violation_type}] ${dto.action_reason}`,
      target_user_id: dto.target_user_id,
      ban_duration: dto.ban_duration,
    });
  }

  // Lift an active ban
  liftBan(playerId: number, moderatorId: number) {
    const moderator = users.find((u) => u.user_id === moderatorId);
    if (!moderator || !MODERATOR_ROLES.includes(moderator.role_id)) {
      throw new ForbiddenException('Only moderators and admins can lift bans');
    }

    const lifted = this.repo.liftBan(playerId);
    if (!lifted) {
      throw new NotFoundException(`No active ban found for player ${playerId}`);
    }

    // Restore player account
    const userIdx = users.findIndex((u) => u.user_id === playerId);
    if (userIdx !== -1) users[userIdx].status = 'active';

    const profileIdx = player_profiles.findIndex((p) => p.user_id === playerId);
    if (profileIdx !== -1) player_profiles[profileIdx].player_status = true;

    return { message: `Ban lifted for player ${playerId}` };
  }

  // ── Private Helpers ──────────────────────────────────────

  private applyActionEffects(
    actionType: string,
    targetUserId: number,
    moderator: any,
    dto: CreateModeratorActionDto,
  ) {
    const userIdx = users.findIndex((u) => u.user_id === targetUserId);
    const profileIdx = player_profiles.findIndex((p) => p.user_id === targetUserId);

    if (actionType === 'ban') {
      // R-MOD-4: set user status and player profile status
      if (userIdx !== -1) users[userIdx].status = 'banned';
      if (profileIdx !== -1) player_profiles[profileIdx].player_status = false;

      // Compute expiry
      const bannedDate = new Date();
      const expiresDate = this.computeExpiry(bannedDate, dto.ban_duration ?? '7 Days');

      this.repo.createBan({
        id: this.repo.nextBanId(),
        playerId: targetUserId,
        playerName: users[userIdx]?.user_name ?? `User ${targetUserId}`,
        level: Math.floor((player_profiles[profileIdx]?.carys_points ?? 0) / 100),
        duration: dto.ban_duration ?? '7 Days',
        reason: dto.action_reason,
        bannedBy: moderator.user_name,
        bannedById: moderator.user_id,
        bannedDate: bannedDate.toISOString().split('T')[0],
        expiresDate: expiresDate.toISOString().split('T')[0],
        active: true,
      });
    }

    if (actionType === 'restrict') {
      // Restrict: keep account active but flag profile as inactive
      if (profileIdx !== -1) player_profiles[profileIdx].player_status = false;
    }

    // 'warning' and 'review' have no side effects on account status
  }

  private computeExpiry(from: Date, duration: string): Date {
    const d = new Date(from);
    if (duration.toLowerCase().includes('permanent')) {
      d.setFullYear(d.getFullYear() + 100);
    } else {
      const days = parseInt(duration) || 7;
      d.setDate(d.getDate() + days);
    }
    return d;
  }

  private enrichAction(action: any) {
    if (!action) return action;
    const moderator = users.find((u) => u.user_id === action.moderator_id);
    return {
      ...action,
      moderator_name: moderator?.user_name ?? 'Unknown',
    };
  }

  private enrichBan(ban: any) {
    return { ...ban };
  }
}
