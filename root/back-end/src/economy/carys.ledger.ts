import { BadRequestException, NotFoundException } from '@nestjs/common';
import { carys_ledger, player_profiles, CarysLedgerEntry } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-CARYS-1: creditCarys is the ONLY code that may write carys_points
// R-CARYS-2: Every movement produces a ledger row carrying the balance it made
// R-CARYS-3: A balance may never go negative — a spend that cannot afford
//            itself is refused, not clamped to zero
// R-CARYS-4: carys_points always equals the last ledger row's balance_after
// ────────────────────────────────────────────────────────────

/**
 * The single writer for Carys balances.
 *
 * A bare total on player_profiles cannot answer "where did this come from" or
 * "why is it lower than yesterday", and once Carys buy things those stop being
 * academic questions. So the ledger is the record and carys_points is a cached
 * total of it — which only holds if exactly one function maintains both.
 *
 * Deliberately a plain function rather than an injectable service: the
 * achievement module credits Carys too, and routing that through Nest DI would
 * have coupled two feature modules together to share four lines of arithmetic.
 * Everything here mutates the store arrays directly, which is how every other
 * service in this codebase already works.
 *
 * @param delta Signed. Negative is a spend.
 * @throws BadRequestException if the spend would overdraw the balance.
 */
export function creditCarys(
  userId: number,
  delta: number,
  reason: string,
  ref?: { type?: string; id?: number | string },
): CarysLedgerEntry {
  const profile = player_profiles.find((p) => p.user_id === userId);
  if (!profile) throw new NotFoundException(`No player profile for user ${userId}`);

  const amount = Math.trunc(Number(delta) || 0);
  if (amount === 0) {
    throw new BadRequestException('A ledger entry of zero records nothing.');
  }

  const before = Number(profile.carys_points) || 0;
  const after = before + amount;

  // R-CARYS-3. Clamping to zero here would let a purchase succeed while
  // charging less than the price, which is worse than refusing it.
  if (after < 0) {
    throw new BadRequestException(
      `Insufficient Carys: balance is ${before.toLocaleString('en-IN')}, ` +
        `this needs ${Math.abs(amount).toLocaleString('en-IN')}.`,
    );
  }

  profile.carys_points = after;

  const entry: CarysLedgerEntry = {
    entry_id: nextLedgerId(),
    user_id: userId,
    delta: amount,
    reason,
    ref_type: ref?.type,
    ref_id: ref?.id,
    balance_after: after,
    created_at: new Date().toISOString(),
  };
  carys_ledger.push(entry);
  return entry;
}

/** Current balance, read from the profile cache. */
export function balanceOf(userId: number): number {
  const profile = player_profiles.find((p) => p.user_id === userId);
  return Number(profile?.carys_points) || 0;
}

/** Most recent ledger rows for a user, newest first. */
export function ledgerFor(userId: number, limit = 25): CarysLedgerEntry[] {
  return carys_ledger
    .filter((e) => e.user_id === userId)
    .sort((a, b) => b.entry_id - a.entry_id)
    .slice(0, limit);
}

function nextLedgerId(): number {
  return carys_ledger.length === 0
    ? 1
    : Math.max(...carys_ledger.map((e) => e.entry_id)) + 1;
}
