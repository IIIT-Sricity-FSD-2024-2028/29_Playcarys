import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  achievements,
  games,
  player_achievements,
  player_profiles,
  users,
  Achievement,
} from '../data/store';
import {
  CreateAchievementDto,
  CreatePlatformAchievementDto,
  DEFAULT_ACHIEVEMENT_BUDGET_CARYS,
  DEFAULT_ACHIEVEMENT_BUDGET_XP,
  MAX_ACHIEVEMENT_REWARD,
  MAX_ACHIEVEMENT_XP,
  ReviewAchievementDto,
  SetActiveTitleDto,
  UnlockAchievementDto,
} from './achievement.dto';
import { friendships, matches, match_results, player_tournament } from '../data/store';
import { creditCarys } from '../economy/carys.ledger';

// ── Domain Rules ────────────────────────────────────────────
// R-ACH-1: A code is unique within a game and immutable once created
// R-ACH-2: Only the owning publisher may define a game's achievements
// R-ACH-3: A game may only unlock codes it declared — nothing invented at runtime
// R-ACH-4: An achievement pays out ONCE per player, ever
// R-ACH-5: The reward is capped by the platform, not by the publisher
// R-ACH-6: A player may only display a title they have actually earned
// R-ACH-7: A publisher PROPOSES; an admin APPROVES. A pending or rejected
//          achievement is not grantable and is invisible to players.
// R-ACH-8: A game's APPROVED achievements may not sum past its lifetime budget.
//          An admin may raise a specific game's budget at review time.
// R-ACH-9: Platform achievements (game_id null) belong to no publisher, are
//          exempt from any budget, and are evaluated by the platform from its
//          own data — never reported by a game.
// ────────────────────────────────────────────────────────────

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  /**
   * An achievement counts as approved unless it says otherwise.
   *
   * The five seeded before this field existed were created by an admin through
   * the real endpoint, so treating a missing status as approved keeps them
   * working rather than silently switching them off.
   */
  private isApproved(a: Achievement) {
    return (a.status ?? 'approved') === 'approved';
  }

  /**
   * What a game's achievements commit it to paying out.
   *
   * `includePending` decides whether proposals count, and the two callers want
   * different answers on purpose:
   *
   *   creating  — pending ones DO count, so a publisher is told they are
   *               over-committing while they are still writing, rather than
   *               proposing six and having five rejected later. Without this a
   *               publisher could queue up 3,220 Carys of proposals against a
   *               2,000 budget and be told everything was fine.
   *   approving — only APPROVED ones count, because a pending proposal is not a
   *               commitment and a rejected one never will be. Counting them
   *               here would let one abandoned proposal block every real
   *               approval after it.
   */
  private committed(gameId: number, includePending = false) {
    return achievements
      .filter(
        (a) =>
          a.game_id === gameId &&
          (this.isApproved(a) || (includePending && a.status === 'pending')),
      )
      .reduce(
        (acc, a) => ({
          carys: acc.carys + (a.carys_reward || 0),
          xp: acc.xp + (a.xp_reward || 0),
        }),
        { carys: 0, xp: 0 },
      );
  }

  /** R-ACH-8. Throws with the actual numbers, so the message is actionable. */
  private assertWithinBudget(game: any, addCarys: number, addXp: number, includePending = false) {
    const budgetCarys = Number.isFinite(game.achievement_budget_carys)
      ? game.achievement_budget_carys
      : DEFAULT_ACHIEVEMENT_BUDGET_CARYS;
    const budgetXp = Number.isFinite(game.achievement_budget_xp)
      ? game.achievement_budget_xp
      : DEFAULT_ACHIEVEMENT_BUDGET_XP;

    const spent = this.committed(game.game_id, includePending);
    const word = includePending ? 'commit or propose' : 'commit';

    if (spent.carys + addCarys > budgetCarys) {
      throw new BadRequestException(
        `This game's achievements already ${word} ${spent.carys} of ${budgetCarys} Carys. ` +
          `Adding ${addCarys} would exceed the budget — lower the reward, or ask an admin to raise the budget.`,
      );
    }
    if (spent.xp + addXp > budgetXp) {
      throw new BadRequestException(
        `This game's achievements already ${word} ${spent.xp} of ${budgetXp} XP. ` +
          `Adding ${addXp} would exceed the budget.`,
      );
    }
  }

  /**
   * Public list for a game. Secret achievements are withheld until earned, and
   * unapproved ones are not shown at all — a player should not be told about a
   * reward that cannot yet be granted.
   *
   * `includeUnapproved` is for the publisher's own view and the admin review
   * console, which both need to see what is waiting.
   */
  findForGame(gameId: number, viewerId?: number, includeUnapproved = false) {
    const earned = new Set(
      player_achievements
        .filter((p) => viewerId != null && p.user_id === viewerId)
        .map((p) => p.achievement_id),
    );

    return achievements
      .filter((a) => a.game_id === gameId)
      .filter((a) => includeUnapproved || this.isApproved(a))
      .map((a) => {
        const unlocked = earned.has(a.achievement_id);
        // A secret achievement still appears, as a locked placeholder — hiding
        // it entirely makes the list look incomplete and invites players to
        // think the count is broken.
        if (a.secret && !unlocked) {
          return {
            achievement_id: a.achievement_id,
            game_id: a.game_id,
            code: a.code,
            name: 'Hidden achievement',
            description: 'Keep playing to discover this one.',
            icon: '❓',
            carys_reward: a.carys_reward,
            secret: true,
            unlocked: false,
          };
        }
        return { ...a, unlocked };
      });
  }

  /** Everything a player has earned, newest first, with the game's name. */
  findForPlayer(userId: number) {
    return player_achievements
      .filter((p) => p.user_id === userId)
      .sort((a, b) => Date.parse(b.unlocked_at) - Date.parse(a.unlocked_at))
      .map((p) => {
        const def = achievements.find((a) => a.achievement_id === p.achievement_id);
        const game = games.find((g) => g.game_id === p.game_id);
        return {
          ...p,
          name: def?.name ?? 'Unknown achievement',
          description: def?.description ?? '',
          icon: def?.icon ?? '🏆',
          title_awarded: def?.title_awarded ?? null,
          // A platform achievement belongs to no game, so "Unknown game" was
          // both wrong and alarming — it reads as broken data rather than as
          // the deliberate absence it is.
          game_name: p.game_id == null ? 'PlayCarys' : (game?.game_name ?? 'Unknown game'),
        };
      });
  }

  /** Titles this player is entitled to display. */
  titlesFor(userId: number): string[] {
    const owned = player_achievements.filter((p) => p.user_id === userId);
    const titles = owned
      .map((p) => achievements.find((a) => a.achievement_id === p.achievement_id)?.title_awarded)
      .filter((t): t is string => !!t);
    return [...new Set(titles)];
  }

  // Workflow: publisher defines an achievement
  create(gameId: number, dto: CreateAchievementDto) {
    const game = games.find((g) => g.game_id === gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);

    // R-ACH-2
    if (game.game_publisher !== dto.publisher_id) {
      throw new ForbiddenException('You can only define achievements for your own games');
    }

    // R-ACH-1
    const code = dto.code.trim().toLowerCase();
    if (achievements.some((a) => a.game_id === gameId && a.code === code)) {
      throw new ConflictException(`This game already has an achievement with the code "${code}"`);
    }

    // R-ACH-5 — belt and braces. The DTO caps it too, but the ceiling is a
    // platform rule and should not depend on validation config staying put.
    const reward = Math.max(0, Math.min(MAX_ACHIEVEMENT_REWARD, Math.floor(dto.carys_reward)));
    const xp = Math.max(0, Math.min(MAX_ACHIEVEMENT_XP, Math.floor(dto.xp_reward ?? 0)));

    // R-ACH-8 — checked here so a publisher finds out while they are writing
    // it, not after an admin has already spent time reviewing it. Pending
    // proposals count towards the total at this point; see committed().
    this.assertWithinBudget(game, reward, xp, true);

    const achievement: Achievement = {
      achievement_id: this.nextId(),
      game_id: gameId,
      code,
      name: dto.name.trim(),
      description: dto.description.trim(),
      icon: (dto.icon || '🏆').trim(),
      carys_reward: reward,
      xp_reward: xp,
      title_awarded: dto.title_awarded?.trim() || undefined,
      secret: !!dto.secret,
      created_at: new Date().toISOString(),
      // R-ACH-7. An achievement pays real Carys; letting the party that
      // benefits from it also publish it is the same hole max_carys_per_match
      // was opened to close.
      status: 'pending',
    };
    achievements.push(achievement);
    return achievement;
  }

  /** Everything waiting on an admin, newest first, with its game for context. */
  findPending() {
    return achievements
      .filter((a) => a.status === 'pending')
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .map((a) => {
        const game = games.find((g) => g.game_id === a.game_id);
        const spent = a.game_id != null ? this.committed(a.game_id) : { carys: 0, xp: 0 };
        return {
          ...a,
          game_name: game?.game_name ?? 'Platform',
          publisher_id: game?.game_publisher ?? null,
          // So the reviewer can see what approving this would commit the game to.
          budget: {
            carys_committed: spent.carys,
            carys_budget: game?.achievement_budget_carys ?? DEFAULT_ACHIEVEMENT_BUDGET_CARYS,
            xp_committed: spent.xp,
            xp_budget: game?.achievement_budget_xp ?? DEFAULT_ACHIEVEMENT_BUDGET_XP,
          },
        };
      });
  }

  /**
   * Workflow: an admin approves or rejects a proposed achievement.
   *
   * The budget is re-checked at approval, not just at creation: several
   * achievements can be proposed while all of them are still pending, and each
   * one passed the check against a total that did not yet include the others.
   * Approval is the moment the commitment becomes real, so it is the moment
   * that has to hold.
   */
  review(achievementId: number, dto: ReviewAchievementDto) {
    const achievement = achievements.find((a) => a.achievement_id === achievementId);
    if (!achievement) throw new NotFoundException(`Achievement ${achievementId} not found`);

    const reviewer = users.find((u) => u.user_id === dto.reviewer_id);
    if (!reviewer) throw new NotFoundException(`Reviewer ${dto.reviewer_id} not found`);

    if (achievement.status === 'approved' && dto.decision === 'approve') {
      throw new BadRequestException('That achievement is already approved.');
    }

    if (dto.decision === 'reject') {
      achievement.status = 'rejected';
      achievement.approved_by = dto.reviewer_id;
      achievement.approved_at = new Date().toISOString();
      return { message: 'Achievement rejected.', achievement };
    }

    const game = games.find((g) => g.game_id === achievement.game_id);
    if (game) {
      // An admin may raise this game's budget as part of the decision — that is
      // the sanctioned way past the cap, rather than quietly ignoring it.
      if (dto.budget_carys != null) game.achievement_budget_carys = dto.budget_carys;
      if (dto.budget_xp != null) game.achievement_budget_xp = dto.budget_xp;

      this.assertWithinBudget(game, achievement.carys_reward || 0, achievement.xp_reward || 0);
    }

    achievement.status = 'approved';
    achievement.approved_by = dto.reviewer_id;
    achievement.approved_at = new Date().toISOString();

    this.logger.log(
      `Admin ${dto.reviewer_id} approved achievement "${achievement.code}" on game ${achievement.game_id}`,
    );
    return { message: 'Achievement approved.', achievement };
  }

  /**
   * Workflow: an admin defines a PLATFORM achievement (R-ACH-9).
   *
   * game_id is null, no publisher owns it, and no budget applies — the platform
   * is not paying itself on someone else's behalf. Approved on creation,
   * because the party defining it is already the party who would review it.
   */
  createPlatform(dto: CreatePlatformAchievementDto) {
    const admin = users.find((u) => u.user_id === dto.admin_id);
    if (!admin) throw new NotFoundException(`Admin ${dto.admin_id} not found`);

    const code = dto.code.trim().toLowerCase();
    if (achievements.some((a) => a.game_id == null && a.code === code)) {
      throw new ConflictException(`A platform achievement with the code "${code}" already exists`);
    }

    const achievement: Achievement = {
      achievement_id: this.nextId(),
      game_id: null,
      code,
      name: dto.name.trim(),
      description: dto.description.trim(),
      icon: (dto.icon || '🌟').trim(),
      carys_reward: Math.max(0, Math.min(MAX_ACHIEVEMENT_REWARD, Math.floor(dto.carys_reward))),
      xp_reward: Math.max(0, Math.min(MAX_ACHIEVEMENT_XP, Math.floor(dto.xp_reward ?? 0))),
      title_awarded: dto.title_awarded?.trim() || undefined,
      created_at: new Date().toISOString(),
      status: 'approved',
      rule: dto.rule.trim(),
      threshold: dto.threshold ?? 1,
    };
    achievements.push(achievement);
    return achievement;
  }

  /**
   * Evaluate every platform achievement for one player and grant what they have
   * earned. Cheap enough to call after a match, a friendship or a tournament
   * entry — it only ever grants what is not already held.
   */
  evaluatePlatform(userId: number) {
    const player = users.find((u) => u.user_id === userId);
    if (!player) throw new NotFoundException('Player not found');

    const held = new Set(
      player_achievements.filter((p) => p.user_id === userId).map((p) => p.achievement_id),
    );

    const measure = (rule: string): number => {
      switch (rule) {
        case 'first_match':
        case 'matches_played':
          return new Set(
            match_results
              .filter((r) => String(r.player_id) === String(userId))
              .map((r) => String(r.session_id)),
          ).size;
        case 'friends':
          return friendships.filter(
            (f) =>
              !f.removed_at &&
              (Number(f.user_a) === Number(userId) || Number(f.user_b) === Number(userId)),
          ).length;
        case 'first_tournament':
          return player_tournament.filter((p) => Number(p.player_id) === Number(userId)).length;
        default:
          return 0;
      }
    };

    const granted: any[] = [];
    for (const a of achievements) {
      if (a.game_id != null || !this.isApproved(a) || !a.rule) continue;
      if (held.has(a.achievement_id)) continue;
      if (measure(a.rule) < (a.threshold ?? 1)) continue;
      granted.push(this.grant(a, userId, undefined));
    }
    return { granted: granted.length, achievements: granted };
  }

  // Workflow: publisher removes an achievement
  remove(achievementId: number, publisherId: number) {
    const idx = achievements.findIndex((a) => a.achievement_id === achievementId);
    if (idx === -1) throw new NotFoundException(`Achievement ${achievementId} not found`);

    const game = games.find((g) => g.game_id === achievements[idx].game_id);
    if (!game || game.game_publisher !== publisherId) {
      throw new ForbiddenException('You can only remove achievements from your own games');
    }

    // Unlocks are NOT deleted. Someone earned it; removing the definition
    // should not rewrite their history or silently claw back their title.
    achievements.splice(idx, 1);
    return { message: `Achievement ${achievementId} removed` };
  }

  /**
   * Workflow: a game reports that a player earned something.
   *
   * This is the trust boundary. The game supplies only a code — never a
   * reward — so the worst a malicious build can do is unlock its own declared
   * achievements early. It cannot invent one, cannot choose the payout, and
   * cannot earn the same one twice.
   */
  unlock(dto: UnlockAchievementDto) {
    const game = games.find((g) => g.game_id === dto.game_id);
    if (!game) throw new NotFoundException(`Game ${dto.game_id} not found`);

    const player = users.find((u) => u.user_id === dto.user_id);
    if (!player) throw new NotFoundException('Player not found');

    // R-ACH-3
    const code = String(dto.code || '').trim().toLowerCase();
    const achievement = achievements.find((a) => a.game_id === dto.game_id && a.code === code);
    if (!achievement) {
      throw new BadRequestException(
        `"${code}" is not an achievement declared by this game. Add it on the publish page first.`,
      );
    }

    // R-ACH-7 — a proposed achievement is not a promise the platform has made.
    // Refused explicitly rather than silently ignored, so a publisher testing
    // their own game learns why nothing happened.
    if (!this.isApproved(achievement)) {
      throw new ForbiddenException(
        `Achievement "${code}" is ${achievement.status ?? 'pending'} and cannot be granted yet. ` +
          `An admin has to approve it first.`,
      );
    }

    // R-ACH-4 — already earned is not an error worth failing the game over;
    // a build that calls unlock on every win would otherwise show the player
    // an error toast every match after the first.
    const already = player_achievements.find(
      (p) => p.user_id === dto.user_id && p.achievement_id === achievement.achievement_id,
    );
    if (already) {
      return { unlocked: false, already_earned: true, achievement, carys_granted: 0, xp_granted: 0 };
    }

    return { unlocked: true, already_earned: false, ...this.grant(achievement, dto.user_id, dto.session_id) };
  }

  /**
   * Actually pay out one achievement to one player.
   *
   * Shared by the game-reported path (unlock) and the platform-evaluated one,
   * so the caps, the profile update and the title rule cannot drift apart
   * between them.
   */
  private grant(achievement: Achievement, userId: number, sessionId?: string) {
    const granted = Math.max(0, Math.min(MAX_ACHIEVEMENT_REWARD, achievement.carys_reward || 0));
    const xpGranted = Math.max(0, Math.min(MAX_ACHIEVEMENT_XP, achievement.xp_reward || 0));

    player_achievements.push({
      user_id: userId,
      achievement_id: achievement.achievement_id,
      game_id: achievement.game_id,
      unlocked_at: new Date().toISOString(),
      session_id: sessionId,
      carys_granted: granted,
      xp_granted: xpGranted,
    });

    // Points are added HERE, server-side. The client is told what happened but
    // never gets to decide it.
    const profile = player_profiles.find((p) => p.user_id === userId);
    // Routed through creditCarys rather than writing carys_points directly:
    // once Carys can be spent, a bare total cannot answer "where did this come
    // from". The ledger records the movement and updates the cached total.
    if (profile && granted > 0) {
      creditCarys(userId, granted, `Achievement: ${achievement.name}`, {
        type: 'achievement',
        id: achievement.achievement_id,
      });
    }

    // First title earned becomes the active one, so a player who never visits
    // their profile still gets to show it.
    if (profile && achievement.title_awarded && !profile.active_title) {
      profile.active_title = achievement.title_awarded;
    }

    this.logger.log(
      `Player ${userId} unlocked "${achievement.code}" ` +
        `(${achievement.game_id == null ? 'platform' : 'game ' + achievement.game_id}) ` +
        `(+${granted} Carys, +${xpGranted} XP)`,
    );

    return {
      achievement,
      carys_granted: granted,
      xp_granted: xpGranted,
      title_awarded: achievement.title_awarded ?? null,
      carys_total: profile?.carys_points ?? null,
    };
  }

  // Workflow: player chooses which earned title to display (R-ACH-6)
  setActiveTitle(dto: SetActiveTitleDto) {
    const profile = player_profiles.find((p) => p.user_id === dto.user_id);
    if (!profile) throw new NotFoundException('Player profile not found');

    const requested = dto.title?.trim();
    if (!requested) {
      profile.active_title = null;
      return { active_title: null };
    }

    if (!this.titlesFor(dto.user_id).includes(requested)) {
      throw new ForbiddenException('You have not earned that title');
    }

    profile.active_title = requested;
    return { active_title: profile.active_title };
  }

  private nextId(): number {
    return achievements.length === 0
      ? 1
      : Math.max(...achievements.map((a) => a.achievement_id)) + 1;
  }
}
