import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  games,
  payouts,
  publisher_profiles,
  tournaments,
  users,
  Payout,
  MIN_PAYOUT_PAISE,
  PAISE_PER_CARYS,
  PUBLISHER_REVENUE_SHARE_PCT,
  ROYALTY_CARYS_PER_SESSION,
  formatPaise,
} from '../data/store';
import { scheduleSave } from '../data/persistence';
import { PaymentGateway } from './payment.gateway';
import { WithdrawDto } from './economy.dto';

// ── Domain Rules ────────────────────────────────────────────
// R-PAY-1: The publisher keeps PUBLISHER_REVENUE_SHARE_PCT of gross attributable
//          revenue; the platform keeps the remainder
// R-PAY-2: Gross is attributable to a GAME, and a game has exactly one publisher
// R-PAY-3: A payout row is a historical fact. Only its status moves, and only
//          forward (pending/processing -> paid | failed), never back to earlier
// R-PAY-4: Revenue is credited once. `settled_*` marks how far the last close got
// R-PAY-5: A payout below MIN_PAYOUT_PAISE is refused — it costs more to send
//          than it is worth
// R-PAY-6: A studio's money is always in exactly one of three places:
//            available   (earned, not yet withdrawn)
//            in transit  (withdrawn / closed, not yet delivered)
//            paid out    (delivered)
//          and  available + in transit + paid out = lifetime earned.
// R-PAY-7: One withdrawal at a time per studio. A declined transfer returns the
//          money exactly (the settled marks are rewound), so nothing is lost.
// ────────────────────────────────────────────────────────────

/** Lifetime session royalty of a studio, in Carys: sessions of its games x the per-session rate. */
export function royaltyLifetimeCarys(publisherId: number): number {
  return games
    .filter((g) => g.game_publisher === publisherId)
    .reduce((sum, g) => sum + (Number(g.sessions) || 0) * ROYALTY_CARYS_PER_SESSION, 0);
}

/** Lifetime tournament rake attributable to a studio's games, in paise. */
export function rakeLifetimePaise(publisherId: number): number {
  const ids = new Set(games.filter((g) => g.game_publisher === publisherId).map((g) => g.game_id));
  return tournaments
    .filter((t) => ids.has(t.game_id))
    .reduce((sum, t) => sum + rakeCollected(t), 0);
}

@Injectable()
export class PayoutService implements OnModuleInit {
  private readonly logger = new Logger(PayoutService.name);

  constructor(private readonly gateway: PaymentGateway) {}

  /**
   * A transfer that was in flight when the server stopped will never hear back
   * from the gateway. Left alone it would sit on "processing" for ever and
   * block the studio's next withdrawal, so it is failed and the money returned.
   */
  onModuleInit(): void {
    const stuck = payouts.filter((p) => p.status === 'processing');
    for (const p of stuck) {
      this.fail(p.payout_id, 'The transfer was interrupted by a server restart. Nothing was sent; the money is available again.');
    }
    if (stuck.length) {
      this.logger.warn(`failed ${stuck.length} payout(s) left processing by a restart`);
      scheduleSave();
    }
  }

  /**
   * What a studio has earned, where that money is now, and from what.
   *
   * Two sources, both attributable to specific games:
   *
   *   Session royalty — ROYALTY_CARYS_PER_SESSION per session, counted from each
   *   game's own `sessions`, converted at PAISE_PER_CARYS. The "By game" table
   *   and every total on the page are built from this one number, so they can
   *   never disagree. (The studio-level counter `revenue_pcp` is kept as an
   *   engagement figure only: it only moves when a match award is posted, which
   *   is why it stayed at 0 while the games showed sessions.)
   *
   *   Tournament rake — the platform's cut of entry fees on this studio's games.
   */
  earnings(publisherId: number) {
    const profile = publisher_profiles.find((p) => p.user_id === publisherId);
    if (!profile) throw new NotFoundException(`No publisher profile for user ${publisherId}`);

    const myGames = games.filter((g) => g.game_publisher === publisherId);

    // ── What is available now (earned since the last close) ─
    const lifetimeRoyaltyCarys = royaltyLifetimeCarys(publisherId);
    const unsettledCarys = Math.max(0, lifetimeRoyaltyCarys - (Number(profile.settled_pcp) || 0));
    const lifetimeRake = rakeLifetimePaise(publisherId);
    const unsettledRake = Math.max(0, lifetimeRake - (Number(profile.settled_rake_paise) || 0));

    const grossPaise = unsettledCarys * PAISE_PER_CARYS + unsettledRake;
    const { net, cut } = split(grossPaise);

    // ── Where the rest of the money is ──────────────────────
    const mine = payouts.filter((p) => p.publisher_id === publisherId);
    const sumNet = (statuses: string[]) =>
      mine.filter((p) => statuses.includes(p.status)).reduce((s, p) => s + (Number(p.net_paise) || 0), 0);
    const inTransit = sumNet(['pending', 'processing']);
    const paidOut = sumNet(['paid']);
    const lifetimeEarned = net + inTransit + paidOut; // R-PAY-6

    // ── Lifetime attribution per game ───────────────────────
    const perGame = myGames.map((g) => {
      const gameRake = tournaments
        .filter((t) => t.game_id === g.game_id)
        .reduce((sum, t) => sum + rakeCollected(t), 0);
      const royaltyPaise = (g.sessions || 0) * ROYALTY_CARYS_PER_SESSION * PAISE_PER_CARYS;
      return {
        game_id: g.game_id,
        game_name: g.game_name,
        sessions: g.sessions || 0,
        royalty_paise: royaltyPaise,
        royalty_display: formatPaise(royaltyPaise),
        rake_paise: gameRake,
        rake_display: formatPaise(gameRake),
        gross_paise: royaltyPaise + gameRake,
        gross_display: formatPaise(royaltyPaise + gameRake),
      };
    });
    const lifetimeGross = perGame.reduce((s, g) => s + g.gross_paise, 0);
    // The studio's share of that lifetime gross must equal the three buckets above.
    // A few paise can differ because each close rounds its own split.
    const unaccounted = split(lifetimeGross).net - lifetimeEarned;
    const reconciled = Math.abs(unaccounted) <= mine.length + 1;

    // ── Can they withdraw right now? ────────────────────────
    const active = mine.find((p) => p.status === 'processing') ?? null;
    let reason: string | null = null;
    if (active) {
      reason = 'A withdrawal is already being processed.';
    } else if (net <= 0) {
      reason = 'Nothing has been earned since the last withdrawal.';
    } else if (net < MIN_PAYOUT_PAISE) {
      reason = `The minimum withdrawal is ${formatPaise(MIN_PAYOUT_PAISE)}. You need ${formatPaise(MIN_PAYOUT_PAISE - net)} more.`;
    }

    return {
      publisher_id: publisherId,
      studio_name: profile.studio_name ?? users.find((u) => u.user_id === publisherId)?.user_name ?? null,
      share_pct: PUBLISHER_REVENUE_SHARE_PCT,

      // Lifetime engagement counter, not money (see above).
      revenue_pcp: Number(profile.revenue_pcp) || 0,

      // ── The money, in its three places ────────────────────
      available_paise: net,
      available_display: formatPaise(net),
      in_transit_paise: inTransit,
      in_transit_display: formatPaise(inTransit),
      paid_out_paise: paidOut,
      paid_out_display: formatPaise(paidOut),
      lifetime_gross_paise: lifetimeGross,
      reconciled,
      unaccounted_paise: reconciled ? 0 : unaccounted,

      // What the available amount is made of (the "how this period splits" box).
      unsettled: {
        royalty_carys: unsettledCarys,
        royalty_paise: unsettledCarys * PAISE_PER_CARYS,
        rake_paise: unsettledRake,
        gross_paise: grossPaise,
        platform_cut_paise: cut,
        net_paise: net,
        net_display: formatPaise(net),
        payable: net >= MIN_PAYOUT_PAISE,
      },

      // Older field names, now with the consistent meaning above.
      balance_paise: inTransit,
      balance_display: formatPaise(inTransit),
      lifetime_earned_paise: lifetimeEarned,
      lifetime_earned_display: formatPaise(lifetimeEarned),

      min_payout_paise: MIN_PAYOUT_PAISE,
      min_payout_display: formatPaise(MIN_PAYOUT_PAISE),

      withdraw: {
        can_withdraw: !active && net >= MIN_PAYOUT_PAISE,
        reason,
        shortfall_paise: Math.max(0, MIN_PAYOUT_PAISE - net),
        progress_pct: Math.min(100, Math.floor((net / MIN_PAYOUT_PAISE) * 100)),
      },
      // A transfer in flight, so the page can pick the "processing" screen back up after a reload.
      active_payout: active ? { ...active, net_display: formatPaise(active.net_paise) } : null,

      per_game: perGame,

      history: mine
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((p) => ({ ...p, net_display: formatPaise(p.net_paise) })),
    };
  }

  /**
   * Close a period: convert everything unsettled into a payout row.
   *
   * R-PAY-4 is the important part. `settled_pcp` and `settled_rake_paise` mark
   * how far the previous close reached, so running this twice in a row pays
   * nothing the second time rather than paying the same revenue again.
   */
  close(
    publisherId: number,
    period: string,
    minPaise = MIN_PAYOUT_PAISE,
    extra: Partial<Payout> = {},
  ): Payout {
    const profile = publisher_profiles.find((p) => p.user_id === publisherId);
    if (!profile) throw new NotFoundException(`No publisher profile for user ${publisherId}`);

    const summary = this.earnings(publisherId);
    const gross = summary.unsettled.gross_paise;
    const { net, cut } = split(gross);

    // Nothing accrued since the last close. Refused ahead of the threshold
    // check because a zero payout is meaningless at ANY threshold — passing
    // min_paise: 0 would otherwise write an empty row every time it was called.
    if (net <= 0) {
      throw new BadRequestException(
        'Nothing has accrued since the last payout for this publisher.',
      );
    }

    // R-PAY-5
    if (net < minPaise) {
      throw new BadRequestException(
        `Nothing to pay out: ${formatPaise(net)} is below the ${formatPaise(minPaise)} minimum.`,
      );
    }

    // Advance the settled watermarks BEFORE the row is written, so a second
    // call cannot double-pay even if it arrives immediately.
    profile.settled_pcp = (Number(profile.settled_pcp) || 0) + summary.unsettled.royalty_carys;
    profile.settled_rake_paise =
      (Number(profile.settled_rake_paise) || 0) + summary.unsettled.rake_paise;

    profile.balance_paise = (Number(profile.balance_paise) || 0) + net;
    profile.lifetime_earned_paise = (Number(profile.lifetime_earned_paise) || 0) + net;

    const payout: Payout = {
      payout_id: payouts.length === 0 ? 1 : Math.max(...payouts.map((p) => p.payout_id)) + 1,
      publisher_id: publisherId,
      period,
      gross_paise: gross,
      platform_cut_paise: cut,
      net_paise: net,
      status: 'pending',
      source: 'admin',
      created_at: new Date().toISOString(),
      paid_at: null,
      royalty_carys: summary.unsettled.royalty_carys,
      rake_paise: summary.unsettled.rake_paise,
      ...extra,
    };
    payouts.push(payout);

    this.logger.log(
      `closed ${period} for publisher ${publisherId}: gross ${formatPaise(gross)}, ` +
        `platform ${formatPaise(cut)}, net ${formatPaise(net)}`,
    );
    return payout;
  }

  /**
   * A studio withdraws what it has earned.
   *
   * Moves the whole available amount into a payout row marked `processing`,
   * answers straight away, and finishes the transfer in the background through
   * the payment gateway. The page watches the row (GET /economy/payouts/:id)
   * until it becomes `paid` or `failed`.
   */
  withdraw(publisherId: number, dto: WithdrawDto) {
    const { destination, masked } = this.parseDestination(dto);
    const summary = this.earnings(publisherId);

    // R-PAY-7
    if (summary.active_payout) {
      throw new ConflictException('A withdrawal is already being processed. Please wait for it to finish.');
    }
    if (!summary.withdraw.can_withdraw) {
      throw new BadRequestException(summary.withdraw.reason ?? 'Nothing to withdraw.');
    }

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const payout = this.close(publisherId, `Withdrawal ${stamp}`, MIN_PAYOUT_PAISE, {
      status: 'processing',
      source: 'withdrawal',
      method: dto.method,
      destination_masked: masked,
      gateway_ref: null,
      failure_reason: null,
    });

    // Not awaited: the studio gets its answer now and the screen follows along.
    void this.runTransfer(payout, destination);

    return { ...payout, net_display: formatPaise(payout.net_paise) };
  }

  /** Hand the transfer to the gateway and record how it ended. */
  private async runTransfer(payout: Payout, destination: string): Promise<void> {
    try {
      const result = await this.gateway.transfer({
        payout_id: payout.payout_id,
        publisher_id: payout.publisher_id,
        amount_paise: payout.net_paise,
        method: payout.method as 'upi' | 'bank',
        destination,
      });
      if (result.ok) {
        this.markPaid(payout.payout_id, result.reference);
      } else {
        this.fail(payout.payout_id, result.reason || 'The transfer was declined.');
      }
    } catch (err) {
      this.logger.error(`gateway error on payout ${payout.payout_id}: ${(err as Error).message}`);
      this.fail(payout.payout_id, 'The payment partner could not be reached. Nothing was sent; the money is available again.');
    } finally {
      // This ran outside a request, so the usual save-after-a-request hook did not see it.
      scheduleSave();
    }
  }

  /** Mark a payout sent. For an admin-closed payout this is a staff decision; for a withdrawal the gateway makes it. */
  markPaid(payoutId: number, gatewayRef?: string): Payout {
    const payout = payouts.find((p) => p.payout_id === payoutId);
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
    if (payout.status === 'paid') throw new BadRequestException('Already paid.');
    if (payout.status === 'failed') throw new BadRequestException('This payout failed and cannot be marked paid.');

    payout.status = 'paid';
    payout.paid_at = new Date().toISOString();
    if (gatewayRef) payout.gateway_ref = gatewayRef;

    const profile = publisher_profiles.find((p) => p.user_id === payout.publisher_id);
    if (profile) {
      profile.balance_paise = Math.max(0, (Number(profile.balance_paise) || 0) - payout.net_paise);
    }
    return payout;
  }

  /**
   * A transfer was declined: give the money back exactly (R-PAY-7).
   *
   * Rewinding the settled marks by what THIS payout consumed makes the same
   * revenue "available" again, so the studio can simply try again.
   */
  private fail(payoutId: number, reason: string): Payout {
    const payout = payouts.find((p) => p.payout_id === payoutId);
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
    if (payout.status !== 'processing') return payout; // already settled one way or the other

    payout.status = 'failed';
    payout.failure_reason = reason;

    const profile = publisher_profiles.find((p) => p.user_id === payout.publisher_id);
    if (profile) {
      profile.balance_paise = Math.max(0, (Number(profile.balance_paise) || 0) - payout.net_paise);
      profile.lifetime_earned_paise = Math.max(0, (Number(profile.lifetime_earned_paise) || 0) - payout.net_paise);
      profile.settled_pcp = Math.max(0, (Number(profile.settled_pcp) || 0) - (Number(payout.royalty_carys) || 0));
      profile.settled_rake_paise = Math.max(
        0,
        (Number(profile.settled_rake_paise) || 0) - (Number(payout.rake_paise) || 0),
      );
    }
    this.logger.warn(`payout ${payoutId} failed: ${reason}`);
    return payout;
  }

  /** One payout, with its display amount. Used by the page to follow a withdrawal. */
  get(payoutId: number) {
    const payout = payouts.find((p) => p.payout_id === payoutId);
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
    return { ...payout, net_display: formatPaise(payout.net_paise) };
  }

  list(publisherId?: number) {
    const rows = publisherId != null
      ? payouts.filter((p) => p.publisher_id === publisherId)
      : payouts;
    return rows
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => ({ ...p, net_display: formatPaise(p.net_paise) }));
  }

  /** Check the payout details and keep only a masked copy for the record. */
  private parseDestination(dto: WithdrawDto): { destination: string; masked: string } {
    if (dto.method === 'upi') {
      const upi = (dto.upi_id || '').trim();
      if (!/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,31}$/.test(upi)) {
        throw new BadRequestException('Enter a valid UPI id, like studio@okbank.');
      }
      const [name, handle] = upi.split('@');
      return { destination: upi, masked: `${name.slice(0, 2)}****@${handle}` };
    }
    const account = (dto.account_number || '').replace(/\s+/g, '');
    const ifsc = (dto.ifsc || '').trim().toUpperCase();
    if (!/^\d{9,18}$/.test(account)) {
      throw new BadRequestException('Enter a valid bank account number (9 to 18 digits).');
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new BadRequestException('Enter a valid IFSC code, like HDFC0001234.');
    }
    return { destination: `${account}|${ifsc}`, masked: `XXXXXX${account.slice(-4)} (${ifsc})` };
  }
}

/** Rake the platform has actually collected on a tournament, in paise. */
export function rakeCollected(t: {
  entry_fee_paise?: number;
  rake_pct?: number;
  participants?: number;
}): number {
  const fee = Number(t.entry_fee_paise) || 0;
  const pct = Number(t.rake_pct) || 0;
  const entries = Number(t.participants) || 0;
  return Math.round((fee * entries * pct) / 100);
}

/** Split gross into the publisher's net and the platform's cut. */
export function split(grossPaise: number): { net: number; cut: number } {
  const gross = Math.max(0, Math.round(grossPaise));
  const net = Math.round((gross * PUBLISHER_REVENUE_SHARE_PCT) / 100);
  // The cut is the remainder rather than a second percentage, so the two
  // halves always add back to gross however the rounding fell.
  return { net, cut: gross - net };
}
