import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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

// ── Domain Rules ────────────────────────────────────────────
// R-PAY-1: The publisher keeps PUBLISHER_REVENUE_SHARE_PCT of gross attributable
//          revenue; the platform keeps the remainder
// R-PAY-2: Gross is attributable to a GAME, and a game has exactly one publisher
// R-PAY-3: A payout row is append-only — a historical fact, never edited
// R-PAY-4: Revenue is credited once. `settled_*` marks how far the last close got
// R-PAY-5: A payout below MIN_PAYOUT_PAISE is refused — it costs more to send
//          than it is worth
// ────────────────────────────────────────────────────────────

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  /**
   * What a studio has earned, and from what.
   *
   * Two sources, both attributable to specific games:
   *
   *   Session royalty — ROYALTY_CARYS_PER_SESSION per completed session,
   *   accumulated in revenue_pcp by the economy module. Converted to money at
   *   PAISE_PER_CARYS. This counter has been running for months; until now it
   *   converted to nothing, which made it a number measuring an imaginary
   *   quantity.
   *
   *   Tournament rake — the platform's cut of entry fees on this studio's
   *   games. The studio's share of that cut is its share of the audience it
   *   brought.
   */
  earnings(publisherId: number) {
    const profile = publisher_profiles.find((p) => p.user_id === publisherId);
    if (!profile) throw new NotFoundException(`No publisher profile for user ${publisherId}`);

    const myGames = games.filter((g) => g.game_publisher === publisherId);
    const myGameIds = new Set(myGames.map((g) => g.game_id));

    const royaltyPcp = Number(profile.revenue_pcp) || 0;
    const unsettledPcp = Math.max(0, royaltyPcp - (Number(profile.settled_pcp) || 0));

    const rakeTotal = tournaments
      .filter((t) => myGameIds.has(t.game_id))
      .reduce((sum, t) => sum + rakeCollected(t), 0);
    const unsettledRake = Math.max(0, rakeTotal - (Number(profile.settled_rake_paise) || 0));

    const grossPaise = unsettledPcp * PAISE_PER_CARYS + unsettledRake;
    const { net, cut } = split(grossPaise);

    return {
      publisher_id: publisherId,
      studio_name: profile.studio_name ?? users.find((u) => u.user_id === publisherId)?.user_name ?? null,
      share_pct: PUBLISHER_REVENUE_SHARE_PCT,

      // Lifetime engagement counter, not money.
      revenue_pcp: royaltyPcp,

      unsettled: {
        royalty_carys: unsettledPcp,
        royalty_paise: unsettledPcp * PAISE_PER_CARYS,
        rake_paise: unsettledRake,
        gross_paise: grossPaise,
        platform_cut_paise: cut,
        net_paise: net,
        net_display: formatPaise(net),
        payable: net >= MIN_PAYOUT_PAISE,
      },

      balance_paise: Number(profile.balance_paise) || 0,
      balance_display: formatPaise(Number(profile.balance_paise) || 0),
      lifetime_earned_paise: Number(profile.lifetime_earned_paise) || 0,
      lifetime_earned_display: formatPaise(Number(profile.lifetime_earned_paise) || 0),
      min_payout_display: formatPaise(MIN_PAYOUT_PAISE),

      // Lifetime attribution per title, so a studio can see which game earns.
      // Royalty is derived from the session count rather than stored per game:
      // revenue_pcp is a single studio-level counter, and sessions x rate is
      // exactly what fed it.
      per_game: myGames.map((g) => {
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
          gross_display: formatPaise(royaltyPaise + gameRake),
        };
      }),

      history: payouts
        .filter((p) => p.publisher_id === publisherId)
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
  close(publisherId: number, period: string, minPaise = MIN_PAYOUT_PAISE): Payout {
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
    profile.settled_pcp = Number(profile.revenue_pcp) || 0;
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
      created_at: new Date().toISOString(),
      paid_at: null,
    };
    payouts.push(payout);

    this.logger.log(
      `closed ${period} for publisher ${publisherId}: gross ${formatPaise(gross)}, ` +
        `platform ${formatPaise(cut)}, net ${formatPaise(net)}`,
    );
    return payout;
  }

  /** Mark a payout sent. Simulated — no money leaves anywhere. */
  markPaid(payoutId: number): Payout {
    const payout = payouts.find((p) => p.payout_id === payoutId);
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
    if (payout.status === 'paid') throw new BadRequestException('Already paid.');

    payout.status = 'paid';
    payout.paid_at = new Date().toISOString();

    const profile = publisher_profiles.find((p) => p.user_id === payout.publisher_id);
    if (profile) {
      profile.balance_paise = Math.max(0, (Number(profile.balance_paise) || 0) - payout.net_paise);
    }
    return payout;
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
