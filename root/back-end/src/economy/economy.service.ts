import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  cosmetic_items,
  games,
  player_profiles,
  publisher_profiles,
  subscription_plans,
  subscriptions,
  transactions,
  user_cosmetics,
  users,
  roles,
  payouts,
  Transaction,
  PAISE_PER_CARYS,
  PUBLISHER_REVENUE_SHARE_PCT,
  MIN_PAYOUT_PAISE,
  ROYALTY_CARYS_PER_SESSION,
  DEFAULT_RAKE_PCT,
  formatPaise,
} from '../data/store';
import { balanceOf, creditCarys, ledgerFor } from './carys.ledger';
import {
  AwardMatchDto,
  ClaimStipendDto,
  DEFAULT_CARYS_CAP,
  EquipCosmeticDto,
  PurchaseCosmeticDto,
  SubscribeDto,
} from './economy.dto';

// ── Domain Rules ────────────────────────────────────────────
// R-ECO-1: A player may own an item once. Buying it twice is refused, not charged
// R-ECO-2: One equipped item per category — equipping unequips the incumbent
// R-ECO-3: A Carys purchase that cannot afford itself is refused (see R-CARYS-3)
// R-ECO-4: An item with price_carys = null cannot be bought with Carys at all
// R-ECO-5: Match awards are capped by the game's max_carys_per_match, else by
//          the platform default — a game does not get to set its own ceiling
// R-ECO-6: A stipend pays once per interval, tracked by last_stipend_at
// R-ECO-7: Every INR flow is simulated. The states are real; no money moves
// ────────────────────────────────────────────────────────────

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);

  // ── Catalogue ─────────────────────────────────────────────

  /** The shop, annotated with what this viewer already owns and wears. */
  catalogue(viewerId?: number) {
    const owned = new Map(
      user_cosmetics
        .filter((uc) => viewerId != null && uc.user_id === viewerId)
        .map((uc) => [uc.item_id, uc]),
    );

    return {
      balance_carys: viewerId != null ? balanceOf(viewerId) : 0,
      items: cosmetic_items.map((item) => {
        const mine = owned.get(item.id);
        return {
          ...item,
          price_display: formatPaise(item.price_paise),
          owned: !!mine,
          is_equipped: mine?.is_equipped ?? false,
        };
      }),
      plans: subscription_plans.map((p) => ({
        ...p,
        price_display: formatPaise(p.price_paise),
      })),
      subscription:
        viewerId != null
          ? subscriptions.find((s) => s.user_id === viewerId && s.status === 'active') ?? null
          : null,
    };
  }

  /** Balance plus the recent ledger, so a player can see where their Carys went. */
  balance(userId: number) {
    const profile = player_profiles.find((p) => p.user_id === userId);
    if (!profile) throw new NotFoundException(`No player profile for user ${userId}`);
    return {
      user_id: userId,
      carys_points: profile.carys_points,
      carys_value_display: formatPaise(profile.carys_points * PAISE_PER_CARYS),
      ledger: ledgerFor(userId),
    };
  }

  // ── Purchasing ────────────────────────────────────────────

  purchase(dto: PurchaseCosmeticDto) {
    const item = cosmetic_items.find((i) => i.id === dto.item_id);
    if (!item) throw new NotFoundException(`Cosmetic ${dto.item_id} not found`);
    if (!players().has(dto.user_id)) {
      throw new NotFoundException(`No player profile for user ${dto.user_id}`);
    }

    // R-ECO-1. Checked before any charge — the alternative is taking the money
    // and then discovering the item is already owned.
    //
    // A mystery box is exempt: it is consumed rather than kept, so owning one
    // before is normal and buying a second is the point.
    if (!item.is_mystery &&
        user_cosmetics.some((uc) => uc.user_id === dto.user_id && uc.item_id === item.id)) {
      throw new ConflictException(`You already own ${item.name}.`);
    }

    // R-ECO-8: resolve the prize BEFORE charging.
    //
    // Deciding after payment means a player with the full set pays for an empty
    // box — the money is gone and there is nothing to hand back. Picking first
    // lets the whole purchase be refused instead.
    let granted = item;
    if (item.is_mystery) {
      const ownedIds = new Set(
        user_cosmetics.filter((uc) => uc.user_id === dto.user_id).map((uc) => uc.item_id),
      );
      const pool = cosmetic_items.filter(
        (c) => c.category === item.category && !c.is_mystery && !ownedIds.has(c.id),
      );
      if (!pool.length) {
        throw new ConflictException(
          `You already own every ${item.category.replace(/_/g, ' ')}. Nothing left to win.`,
        );
      }
      granted = pool[Math.floor(Math.random() * pool.length)];
    }

    if (dto.idempotency_key && transactions.some((t) => t.idempotency_key === dto.idempotency_key)) {
      throw new ConflictException('This purchase has already been submitted.');
    }

    let charged: string;
    let transaction: Transaction | null = null;

    if (dto.currency === 'carys') {
      // R-ECO-4
      if (item.price_carys == null) {
        throw new BadRequestException(`${item.name} can only be bought with money.`);
      }
      // R-ECO-3 — creditCarys refuses an overdraw rather than clamping it.
      creditCarys(dto.user_id, -item.price_carys, `Purchased ${item.name}`, {
        type: 'cosmetic',
        id: item.id,
      });
      charged = `${item.price_carys.toLocaleString('en-IN')} Carys`;
    } else {
      // R-ECO-7: simulated. A real integration replaces this one call with a
      // provider round-trip; everything around it — the pending row, the
      // idempotency key, the completed transition — is already the right shape.
      transaction = this.recordTransaction({
        user_id: dto.user_id,
        type: 'cosmetic_purchase',
        amount_paise: item.price_paise,
        description: `${item.name} (${item.rarity})`,
        ref_type: 'cosmetic',
        ref_id: item.id,
        idempotency_key: dto.idempotency_key,
      });
      transaction.status = 'completed';
      charged = formatPaise(item.price_paise);
    }

    user_cosmetics.push({
      user_id: dto.user_id,
      item_id: granted.id,
      purchased_at: new Date().toISOString(),
      is_equipped: false,
    });

    this.logger.log(
      `user ${dto.user_id} bought "${item.name}" for ${charged}` +
        (granted.id === item.id ? '' : ` -> won "${granted.name}" (${granted.rarity})`),
    );
    return {
      ok: true,
      // `item` is what was WON, so the client can show it without a second
      // lookup. `paid_for` names the box, for the "you opened X" line.
      item: granted,
      paid_for: granted.id === item.id ? null : item,
      was_mystery: !!item.is_mystery,
      charged,
      balance_carys: balanceOf(dto.user_id),
      transaction,
    };
  }

  /**
   * How a set of players should be DRAWN, in one request.
   *
   * Everything the app needs to render someone with their cosmetics on: the
   * frame around their avatar, the theme behind it, the effect on their name,
   * their banner, and the emotes they may send.
   *
   * Batched on purpose. A leaderboard shows fifty players and a friends list a
   * dozen; asking per player would turn one screen into fifty round trips, and
   * the payload work done elsewhere in this codebase would be undone by the
   * feature that finally made cosmetics visible.
   */
  skins(userIds: number[]): Record<string, unknown> {
    const wanted = new Set(userIds.map(Number).filter((n) => Number.isFinite(n)));
    const byId = new Map(cosmetic_items.map((c) => [c.id, c]));
    const out: Record<string, unknown> = {};

    for (const uid of wanted) {
      const worn = user_cosmetics
        .filter((uc) => uc.user_id === uid && uc.is_equipped)
        .map((uc) => byId.get(uc.item_id))
        .filter(Boolean) as typeof cosmetic_items;

      const pick = (cat: string) => worn.find((c) => c.category === cat) ?? null;
      const frame = pick('avatar_frame');
      const theme = pick('profile_theme');
      const nameFx = pick('name_effect');
      const banner = pick('banner');
      const victory = pick('victory_animation');

      // Emotes are the exception: a player sends from EVERY pack they own, not
      // just one. Equipping a pack to use it would make owning several
      // pointless.
      const emotes = user_cosmetics
        .filter((uc) => uc.user_id === uid)
        .map((uc) => byId.get(uc.item_id))
        .filter((c) => c && c.category === 'chat_emote' && c.emotes?.length)
        .flatMap((c) => c!.emotes!);

      out[String(uid)] = {
        frame: frame && {
          name: frame.name, charm: frame.preview,
          color: frame.ring_color, glow: frame.ring_glow,
        },
        theme: theme && { name: theme.name, css: theme.preview },
        name_effect: nameFx && { name: nameFx.name, css: nameFx.preview },
        banner: banner && { name: banner.name, css: banner.preview },
        victory: victory && { name: victory.name, burst: victory.burst ?? [victory.preview] },
        emotes: [...new Set(emotes)],
      };
    }
    return out;
  }

  /**
   * The platform's own books, and who is running it.
   *
   * Every money figure on this platform was previously per-publisher: a studio
   * could see its own ₹, and nobody could see the platform's. `platform_cut_paise`
   * was computed on each payout and never summed, so the 30% the platform keeps
   * existed only as a column nobody read.
   *
   * Superuser-only, because it is the whole business in one object.
   *
   * Nothing here is estimated. Inflow is the transactions table, outflow is the
   * payouts table, and liability is what studios have earned and not yet been
   * paid — all three are rows, not projections.
   */
  platformOverview() {
    const paise = (n: number) => Math.round(n || 0);

    // ── Inflow: what players actually paid ──────────────────
    //
    // Completed only. A pending or failed row is not income, and counting it
    // would overstate the platform on the one screen that must not be wrong.
    const completed = transactions.filter((t) => t.status === 'completed');
    const byType = (type: string) =>
      completed.filter((t) => t.type === type).reduce((a, t) => a + paise(t.amount_paise), 0);

    const subs = byType('subscription');
    const cosmetics = byType('cosmetic_purchase');
    const entries = byType('tournament_entry');
    const grossIn = subs + cosmetics + entries;

    // ── Outflow: what has left, and what is owed ────────────
    const paidOut = payouts
      .filter((p) => p.status === 'paid')
      .reduce((a, p) => a + paise(p.net_paise), 0);
    const pendingOut = payouts
      .filter((p) => p.status === 'pending')
      .reduce((a, p) => a + paise(p.net_paise), 0);

    // Earned by studios but never closed into a payout row. This is a real
    // liability — money the platform holds and owes — and it is invisible in
    // the payouts table precisely because it has not been closed yet.
    const unsettled = publisher_profiles.reduce((a, p) => {
      const owedCarys = (p.revenue_pcp ?? 0) - (p.settled_pcp ?? 0);
      const gross = Math.max(0, owedCarys) * PAISE_PER_CARYS +
                    ((p.balance_paise ?? 0) === 0 ? 0 : 0);
      return a + Math.round((gross * PUBLISHER_REVENUE_SHARE_PCT) / 100);
    }, 0);
    const heldBalances = publisher_profiles.reduce((a, p) => a + paise(p.balance_paise), 0);

    // ── Carys in circulation ────────────────────────────────
    //
    // A float, not income: every Carys outstanding is something a player may
    // still spend, so it is a claim on the shop rather than money earned.
    const carysOutstanding = player_profiles.reduce((a, p) => a + (p.carys_points || 0), 0);

    // ── Staffing ────────────────────────────────────────────
    //
    // The ratios come from the capacity model: moderators scale with PLAYERS
    // (reports are filed by people), admins scale with GAMES (their work is
    // reviewing builds). They are independent axes, which is why a single
    // "staff per user" number would be meaningless.
    const roleName = (u: { role_id: number }) =>
      roles.find((r) => r.role_id === u.role_id)?.role_name ?? 'player';
    const count = (r: string) => users.filter((u) => roleName(u) === r).length;

    const playersN = count('player');
    const modsN = count('moderator');
    const adminsN = count('admin');
    const pubsN = count('publisher');
    const gamesN = games.length;
    const approvedN = games.filter((g) => g.game_approval_status === 'approved').length;
    const pendingN = games.filter((g) => g.game_approval_status === 'pending').length;

    return {
      money: {
        inflow: {
          subscriptions_paise: subs,
          cosmetics_paise: cosmetics,
          tournament_entries_paise: entries,
          total_paise: grossIn,
          total_display: formatPaise(grossIn),
          transaction_count: completed.length,
        },
        outflow: {
          paid_paise: paidOut,
          paid_display: formatPaise(paidOut),
          pending_paise: pendingOut,
          pending_display: formatPaise(pendingOut),
          payout_count: payouts.length,
        },
        // What the platform has kept: everything in, minus everything paid or
        // promised to studios.
        retained_paise: grossIn - paidOut - heldBalances,
        retained_display: formatPaise(grossIn - paidOut - heldBalances),
        liability: {
          owed_to_studios_paise: heldBalances + unsettled,
          owed_to_studios_display: formatPaise(heldBalances + unsettled),
          carys_outstanding: carysOutstanding,
          carys_value_display: formatPaise(carysOutstanding * PAISE_PER_CARYS),
        },
        share_pct: PUBLISHER_REVENUE_SHARE_PCT,
        min_payout_display: formatPaise(MIN_PAYOUT_PAISE),
      },
      staffing: {
        players: playersN,
        moderators: modsN,
        admins: adminsN,
        publishers: pubsN,
        superusers: count('superuser'),
        games: gamesN,
        approved_games: approvedN,
        pending_games: pendingN,
        // Presented as ratios rather than raw counts because the question a
        // superuser has is "are we staffed", not "how many people are there".
        players_per_moderator: modsN ? Math.round(playersN / modsN) : null,
        games_per_admin: adminsN ? Math.round(gamesN / adminsN) : null,
        games_per_publisher: pubsN ? Number((gamesN / pubsN).toFixed(1)) : null,
        moderators_per_admin: adminsN ? Number((modsN / adminsN).toFixed(1)) : null,
      },
    };
  }

  // ── Entitlements ──────────────────────────────────────────
  //
  // What a subscription actually BUYS, in one place.
  //
  // The plans advertised five benefits each and delivered exactly one — the
  // Carys stipend. Nothing outside this module read `subscriptions` at all, so
  // "Reduced platform cut" and "Create private tournaments" were text on a card
  // and nothing more. A paid tier whose benefits are fiction is worse than a
  // free one: it takes money for a promise the code never keeps.
  //
  // These are the two that could be made true against features that already
  // exist. The rest were removed from the plans rather than left as decoration.

  /** The active plan id for a user, or null. */
  planOf(userId: number): string | null {
    const sub = subscriptions.find(
      (x) => x.user_id === userId && x.status === 'active',
    );
    if (!sub) return null;
    // An expired row that nothing has swept yet is not an active plan.
    if (sub.expires_at && Date.parse(sub.expires_at) < Date.now()) return null;
    return sub.tier;
  }

  /**
   * Platform cut for a tournament this user organises, in percent.
   *
   * Subscribers keep more of the pool for their players — which is the point
   * of the perk: it makes YOUR tournament more attractive to enter.
   */
  rakePctFor(userId: number): number {
    const plan = this.planOf(userId);
    if (plan === 'pro_plus') return 3;
    if (plan === 'pro') return 6;
    return DEFAULT_RAKE_PCT;
  }

  /** Private, invite-only tournaments are a paid feature. */
  canCreatePrivateTournament(userId: number): boolean {
    return this.planOf(userId) !== null;
  }

  /** R-ECO-2: one per category, so equipping is also an unequip. */
  equip(dto: EquipCosmeticDto) {
    const owned = user_cosmetics.find(
      (uc) => uc.user_id === dto.user_id && uc.item_id === dto.item_id,
    );
    if (!owned) throw new NotFoundException('You do not own that item.');

    const item = cosmetic_items.find((i) => i.id === dto.item_id);
    if (!item) throw new NotFoundException(`Cosmetic ${dto.item_id} not found`);

    const sameCategory = new Set(
      cosmetic_items.filter((i) => i.category === item.category).map((i) => i.id),
    );
    for (const uc of user_cosmetics) {
      if (uc.user_id === dto.user_id && sameCategory.has(uc.item_id)) uc.is_equipped = false;
    }
    owned.is_equipped = true;

    return { ok: true, equipped: item };
  }

  /**
   * Take something off.
   *
   * equip() could only ever swap one item for another in the same category, so
   * a player who bought a crown could never go back to wearing nothing on their
   * head. Every slot needs an empty state — half the point of a wardrobe is
   * choosing not to wear a thing.
   */
  unequip(dto: EquipCosmeticDto) {
    const owned = user_cosmetics.find(
      (uc) => uc.user_id === dto.user_id && uc.item_id === dto.item_id,
    );
    if (!owned) throw new NotFoundException('You do not own that item.');

    const item = cosmetic_items.find((i) => i.id === dto.item_id);

    // The default body is what every other layer is worn ON. Removing it would
    // leave the rig with nothing to build a skeleton from and silently drop the
    // player back to the flat 2D figure.
    if (item?.slot === 'body') {
      throw new BadRequestException('The base body cannot be removed.');
    }

    owned.is_equipped = false;
    return { ok: true, unequipped: item ?? null };
  }

  // ── Earning ───────────────────────────────────────────────

  /**
   * Credit a completed match, server-side.
   *
   * This replaces the Carys write inside Economy.awardPostMatchProgression in
   * front-end/js/utils.js, which ran entirely in the browser: it mutated the
   * client's copy of player_profiles and posted the whole database back. A
   * player could therefore grant themselves any balance they liked by editing
   * one number before the sync — and the publisher royalty rode along in the
   * same client-side try/catch, marked "silent fail".
   */
  awardMatch(dto: AwardMatchDto) {
    const profile = player_profiles.find((p) => p.user_id === dto.user_id);
    if (!profile) throw new NotFoundException(`No player profile for user ${dto.user_id}`);

    const game = games.find((g) => g.game_id === dto.game_id);
    const gross = carysForResult(dto.game_id, dto.result);

    // R-ECO-5: the publisher chooses the number, the platform sets the ceiling.
    const cap = Number.isFinite(game?.max_carys_per_match as number)
      ? Number(game!.max_carys_per_match)
      : DEFAULT_CARYS_CAP;
    const granted = Math.min(gross, cap);
    if (granted < gross) {
      this.logger.warn(
        `clamped match award ${gross} -> ${cap} for game ${dto.game_id} (player ${dto.user_id})`,
      );
    }

    const entry = creditCarys(dto.user_id, granted, `Match ${dto.result}`, {
      type: 'match',
      id: dto.session_id ?? dto.game_id,
    });

    const royalty = this.creditPublisherRoyalty(dto.game_id);

    return {
      ok: true,
      carys_awarded: granted,
      balance_carys: entry.balance_after,
      royalty_carys: royalty,
    };
  }

  /**
   * Pay the game's publisher for one session played.
   *
   * Non-fatal by design — a player's own award must not fail because their
   * game has no publisher profile — but it logs, unlike the client-side
   * version whose comment read "silent fail — royalty is non-critical". A
   * royalty that silently does not accrue is a studio not getting paid.
   */
  private creditPublisherRoyalty(gameId: number): number {
    const game = games.find((g) => g.game_id === gameId);
    if (!game) return 0;

    // R-ECO-9: a game only earns once it is APPROVED and can actually be played.
    //
    // Call of Duty sat at status 'pending' with no uploaded build — nobody
    // could launch it, and there was nothing for a reviewer to have approved —
    // and the earnings page still reported 29 sessions and ₹44 of royalty
    // against it. Sessions were credited on the strength of a game_id alone,
    // so any caller naming an unapproved game minted revenue for its studio.
    //
    // The check is here rather than at the call site because this is the only
    // place royalty is created, and a gate the callers have to remember is a
    // gate that gets forgotten.
    if (game.game_approval_status !== 'approved') {
      this.logger.warn(
        `royalty refused: game ${gameId} ("${game.game_name}") is ` +
          `${game.game_approval_status ?? 'unreviewed'}, not approved`,
      );
      return 0;
    }
    if (game.game_status && game.game_status !== 'enabled') {
      this.logger.warn(`royalty refused: game ${gameId} is ${game.game_status}`);
      return 0;
    }

    const pub = publisher_profiles.find((p) => p.user_id === game.game_publisher);
    if (!pub) {
      this.logger.warn(`game ${gameId} has no publisher profile — royalty not credited`);
      return 0;
    }
    pub.revenue_pcp = (pub.revenue_pcp || 0) + ROYALTY_CARYS_PER_SESSION;
    game.sessions = (game.sessions || 0) + 1;
    return ROYALTY_CARYS_PER_SESSION;
  }

  // ── Subscriptions ─────────────────────────────────────────

  subscribe(dto: SubscribeDto) {
    const plan = subscription_plans.find((p) => p.id === dto.plan_id);
    if (!plan) throw new NotFoundException(`Plan ${dto.plan_id} not found`);
    if (!users.some((u) => u.user_id === dto.user_id)) {
      throw new NotFoundException(`User ${dto.user_id} not found`);
    }

    const existing = subscriptions.find((s) => s.user_id === dto.user_id && s.status === 'active');
    if (existing) {
      throw new ConflictException(`Already subscribed to ${existing.tier}.`);
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);

    const tx = this.recordTransaction({
      user_id: dto.user_id,
      type: 'subscription',
      amount_paise: plan.price_paise,
      description: `${plan.name} — ${plan.interval}`,
      ref_type: 'subscription_plan',
      ref_id: plan.id,
    });
    tx.status = 'completed';

    const sub = {
      id: nextId(subscriptions.map((s) => s.id)),
      user_id: dto.user_id,
      tier: plan.id,
      status: 'active' as const,
      price_paise: plan.price_paise,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      last_stipend_at: null as string | null,
    };
    subscriptions.push(sub);

    // The first stipend lands immediately — a subscription whose headline perk
    // arrives a month late does not feel like it started.
    const stipend = this.grantStipend(sub, plan.stipend_carys);

    return { ok: true, subscription: sub, stipend_carys: stipend, transaction: tx };
  }

  /** R-ECO-6: pays at most once per interval. */
  claimStipend(dto: ClaimStipendDto) {
    const sub = subscriptions.find((s) => s.user_id === dto.user_id && s.status === 'active');
    if (!sub) throw new NotFoundException('No active subscription.');

    const plan = subscription_plans.find((p) => p.id === sub.tier);
    if (!plan || !plan.stipend_carys) {
      throw new BadRequestException('This plan carries no Carys stipend.');
    }

    if (sub.last_stipend_at) {
      const due = new Date(sub.last_stipend_at);
      due.setMonth(due.getMonth() + 1);
      if (new Date() < due) {
        throw new ConflictException(
          `Next stipend is due ${due.toISOString().slice(0, 10)}.`,
        );
      }
    }

    const granted = this.grantStipend(sub, plan.stipend_carys);
    return { ok: true, stipend_carys: granted, balance_carys: balanceOf(dto.user_id) };
  }

  private grantStipend(sub: { user_id: number; tier: string; last_stipend_at?: string | null }, amount: number): number {
    if (!amount) return 0;
    // A subscriber who is not a player has no profile to credit — the
    // subscription is still valid, it simply has nowhere to put Carys.
    if (!player_profiles.some((p) => p.user_id === sub.user_id)) return 0;
    creditCarys(sub.user_id, amount, `${sub.tier} monthly stipend`, {
      type: 'subscription',
      id: sub.tier,
    });
    sub.last_stipend_at = new Date().toISOString();
    return amount;
  }

  // ── Transactions ──────────────────────────────────────────

  /**
   * Append a transaction in `pending`.
   *
   * Every row starts pending and is moved on explicitly. The seeded table had
   * one state — "completed" — which is not a schema that can record a payment
   * failing, and payments fail constantly.
   */
  recordTransaction(input: {
    user_id: number;
    type: Transaction['type'];
    amount_paise: number;
    description: string;
    ref_type?: string;
    ref_id?: number | string;
    idempotency_key?: string;
  }): Transaction {
    const tx: Transaction = {
      id: nextId(transactions.map((t) => t.id)),
      user_id: input.user_id,
      type: input.type,
      amount_paise: input.amount_paise,
      currency: 'INR',
      status: 'pending',
      description: input.description,
      created_at: new Date().toISOString(),
      ref_type: input.ref_type,
      ref_id: input.ref_id,
      idempotency_key: input.idempotency_key,
    };
    transactions.push(tx);
    return tx;
  }

  transactionsFor(userId: number) {
    return transactions
      .filter((t) => t.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((t) => ({ ...t, amount_display: formatPaise(t.amount_paise) }));
  }
}

/** Base Carys for a result, before the cap. Ported from Economy.calculatePCP in utils.js. */
export function carysForResult(gameId: number, result: 'win' | 'loss' | 'draw'): number {
  const base = result === 'win' ? 100 : result === 'draw' ? 25 : 15;
  // Chess (7) is a longer, harder game than Hill Climbing (8); both pay more
  // than the flat rate a game with no declared complexity gets.
  const complexity: Record<string, number> = { '7': 1.5, '8': 1.1 };
  return Math.round(base * (complexity[String(gameId)] ?? 1.0));
}

function players(): Set<number> {
  return new Set(player_profiles.map((p) => p.user_id));
}

function nextId(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}
