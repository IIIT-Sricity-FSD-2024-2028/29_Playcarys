import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ModeratorActionRepository } from './moderator-action.repository';
import { CreateModeratorActionDto, HandleViolationDto } from './moderator-action.dto';
import { users, reports, player_profiles, bans } from '../data/store';
import { appendAudit } from '../data/persistence';

const ROLE_NAMES: Record<number, string> = { 1: 'superuser', 2: 'admin', 3: 'moderator' };

// ── Domain Rules ────────────────────────────────────────────
// R-MOD-1: Only users with role moderator (3) or admin (2) or superuser (1) can create actions
// R-MOD-2: A ban action must include a ban_duration
// R-MOD-3: A player cannot be banned twice simultaneously (must lift existing ban first)
// R-MOD-4: Banning a player sets their user status='banned' and player_status=false
// R-MOD-5: A warning/restrict action updates the report status to 'resolved' if report_id given
// R-MOD-6: A moderator cannot take action against another moderator or higher role
// R-MOD-7: Violation handling without a report_id is valid (direct detection)
// R-MOD-8: Permanent bans require senior review or second-reviewer signoff
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

  findAppeals() {
    return this.repo.findAllBans().filter((b) => b.appealStatus === 'pending').map((b) => this.enrichBan(b));
  }

  // Workflow: Review Player Reports — moderator takes action on a queued report
  actOnReport(dto: CreateModeratorActionDto, actorId?: number) {
    const effectiveModeratorId = actorId ?? dto.moderator_id;
    // R-MOD-1
    const moderator = users.find((u) => u.user_id === effectiveModeratorId);
    if (!moderator) throw new NotFoundException(`Moderator user ${effectiveModeratorId} not found`);
    if (!MODERATOR_ROLES.includes(moderator.role_id)) {
      throw new ForbiddenException('Only moderators and admins can apply enforcement actions');
    }
    dto.moderator_id = effectiveModeratorId;

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

    // R-MOD-6: Cannot act on user of equal or higher role
    if (MODERATOR_ROLES.includes(target.role_id) && target.role_id <= moderator.role_id) {
      throw new ForbiddenException('Cannot take enforcement action against a user of equal or higher role');
    }

    // R-MOD-2: ban duration required for bans
    if (dto.action_type === 'ban' && !dto.ban_duration) {
      throw new BadRequestException('ban_duration is required for ban actions');
    }

    // R-MOD-8: Permanent bans require senior approval / second reviewer
    if (dto.action_type === 'ban' && (dto.ban_duration || '').toLowerCase().includes('permanent')) {
      if (moderator.role_id === 3 && !dto.second_reviewer_id) {
        throw new BadRequestException('Permanent bans require senior approval / second-reviewer signoff before enforcement.');
      }
    }

    // R-MOD-3: Single active ban rule
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
  handleViolation(dto: HandleViolationDto, actorId?: number) {
    return this.actOnReport({
      moderator_id: actorId ?? dto.moderator_id,
      report_id: undefined,
      action_type: dto.action_type as any,
      action_reason: `[${dto.violation_type}] ${dto.action_reason}`,
      target_user_id: dto.target_user_id,
      ban_duration: dto.ban_duration,
      evidence_summary: dto.evidence_summary,
      second_reviewer_id: dto.second_reviewer_id,
      session_id: dto.session_id,
    }, actorId);
  }

  // Lift an active ban
  liftBan(playerId: number, moderatorId?: number) {
    const effectiveModeratorId = moderatorId ?? 0;
    const moderator = users.find((u) => u.user_id === effectiveModeratorId);
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

    appendAudit({
      type: 'ban',
      msg: `Ban lifted for ${users[userIdx]?.user_name ?? 'player ' + playerId}`,
      detail: `Ban lifted by ${moderator.user_name}`,
      actor: moderator.user_name,
      actor_role: ROLE_NAMES[moderator.role_id] ?? 'moderator',
    });

    return { message: `Ban lifted for player ${playerId}` };
  }

  // Ban Appeals workflow
  submitAppeal(playerId: number, reason: string, evidenceNotes?: string) {
    const ban = this.repo.findBanByPlayer(playerId);
    if (!ban || !ban.active) {
      throw new NotFoundException(`No active ban found for player ${playerId}`);
    }
    if (ban.appealStatus === 'pending') {
      throw new BadRequestException('An appeal is already pending review for this ban.');
    }
    ban.appealStatus = 'pending';
    ban.appealReason = reason;
    if (evidenceNotes) {
      ban.evidenceSummary = (ban.evidenceSummary ? ban.evidenceSummary + '; ' : '') + `Appeal notes: ${evidenceNotes}`;
    }

    appendAudit({
      type: 'ban',
      msg: `Ban appeal submitted by ${ban.playerName}`,
      detail: `Reason: ${reason.slice(0, 200)}`,
      actor: ban.playerName,
      actor_role: 'player',
    });

    return { message: 'Appeal submitted successfully for review', ban: this.enrichBan(ban) };
  }

  decideAppeal(playerId: number, decision: 'approved' | 'rejected', moderatorId?: number, notes?: string) {
    const effectiveModeratorId = moderatorId ?? 0;
    const moderator = users.find((u) => u.user_id === effectiveModeratorId);
    if (!moderator || !MODERATOR_ROLES.includes(moderator.role_id)) {
      throw new ForbiddenException('Only moderators and admins can decide ban appeals');
    }

    const ban = this.repo.findBanByPlayer(playerId);
    if (!ban || !ban.active) {
      throw new NotFoundException(`No active ban found for player ${playerId}`);
    }

    ban.appealStatus = decision;
    ban.appealDecidedBy = moderator.user_name;
    ban.appealDecidedAt = new Date().toISOString();

    if (decision === 'approved') {
      this.liftBan(playerId, moderatorId);
    }

    appendAudit({
      type: 'ban',
      msg: `Ban appeal ${decision} for ${ban.playerName}`,
      detail: `Decided by ${moderator.user_name}. Notes: ${notes ?? 'None'}`,
      actor: moderator.user_name,
      actor_role: ROLE_NAMES[moderator.role_id] ?? 'moderator',
    });

    return { message: `Ban appeal ${decision}`, ban: this.enrichBan(ban) };
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

      const secondReviewer = dto.second_reviewer_id
        ? users.find((u) => u.user_id === dto.second_reviewer_id)
        : null;

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
        violationCategory: dto.violation_category,
        evidenceSummary: dto.evidence_summary,
        evidenceStatus: dto.evidence_status ?? 'unverified',
        reportId: dto.report_id,
        sessionId: dto.session_id,
        requiresSeniorApproval: (dto.ban_duration || '').toLowerCase().includes('permanent'),
        secondReviewerId: dto.second_reviewer_id,
        secondReviewerName: secondReviewer?.user_name,
        appealStatus: 'none',
      });

      appendAudit({
        type: 'ban',
        msg: `${users[userIdx]?.user_name ?? 'User ' + targetUserId} banned (${dto.ban_duration ?? '7 Days'})`,
        detail: `Reason: ${dto.action_reason}`,
        actor: moderator.user_name,
        actor_role: ROLE_NAMES[moderator.role_id] ?? 'moderator',
      });
    }

    if (actionType === 'restrict') {
      // Restrict: keep account active but flag profile as inactive
      if (profileIdx !== -1) player_profiles[profileIdx].player_status = false;
    }
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
