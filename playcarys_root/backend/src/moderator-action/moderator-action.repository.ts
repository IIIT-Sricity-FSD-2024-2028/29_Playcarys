import { Injectable } from '@nestjs/common';
import { moderator_actions, ModeratorAction, bans, Ban } from '../data/store';

@Injectable()
export class ModeratorActionRepository {
  // ── moderator_actions[] ──────────────────────────────────

  findAll(): ModeratorAction[] {
    return [...moderator_actions];
  }

  findById(action_id: number): ModeratorAction | undefined {
    return moderator_actions.find((a) => a.action_id === action_id);
  }

  findByModerator(moderator_id: number): ModeratorAction[] {
    return moderator_actions.filter((a) => a.moderator_id === moderator_id);
  }

  findByReport(report_id: number): ModeratorAction[] {
    return moderator_actions.filter((a) => a.report_id === report_id);
  }

  createAction(action: ModeratorAction): ModeratorAction {
    moderator_actions.push(action);
    return action;
  }

  nextActionId(): number {
    return moderator_actions.length === 0
      ? 1
      : Math.max(...moderator_actions.map((a) => a.action_id)) + 1;
  }

  // ── bans[] ───────────────────────────────────────────────

  findAllBans(): Ban[] {
    return [...bans];
  }

  findActiveBans(): Ban[] {
    return bans.filter((b) => b.active);
  }

  findBanByPlayer(playerId: number): Ban | undefined {
    return bans.find((b) => b.playerId === playerId && b.active);
  }

  createBan(ban: Ban): Ban {
    bans.push(ban);
    return ban;
  }

  updateBan(id: number, partial: Partial<Ban>): Ban | undefined {
    const idx = bans.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    Object.assign(bans[idx], partial);
    return bans[idx];
  }

  liftBan(playerId: number): boolean {
    const ban = bans.find((b) => b.playerId === playerId && b.active);
    if (!ban) return false;
    ban.active = false;
    return true;
  }

  nextBanId(): number {
    return bans.length === 0 ? 1 : Math.max(...bans.map((b) => b.id)) + 1;
  }
}
