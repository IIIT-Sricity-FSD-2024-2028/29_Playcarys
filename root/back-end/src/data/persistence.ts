// ============================================================
//  Durable storage for the in-memory store.
//
//  Until now exactly ONE code path wrote application data to disk:
//  the fs.writeFileSync inside db-import. Every other mutation —
//  all 37 POST/PATCH/DELETE handlers — changed a TypeScript array
//  and nothing else, so the data survived only because the browser
//  kept posting its whole database back. Anything done purely
//  through the API was lost on the next restart. Reproduced: four
//  games created and approved via the API were gone after a
//  restart, with their extracted builds orphaned on disk.
//
//  This module makes the backend responsible for its own data.
//  No new dependencies — Node's built-in fs, the same file and the
//  same JSON format the project already uses.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as store from './store';

/** Tables owned by the backend store, in db-export order. */
function storeTables(): Record<string, unknown> {
  return {
    roles: store.roles,
    users: store.users,
    player_profiles: store.player_profiles,
    publisher_profiles: store.publisher_profiles,
    games: store.games,
    tournaments: store.tournaments,
    sessions: store.sessions,
    // Matches replace sessions. Both are listed while the frontend is being
    // converted over; `sessions` goes once nothing reads it.
    matches: store.matches,
    match_results: store.match_results,
    reports: store.reports,
    moderator_actions: store.moderator_actions,
    player_tournament: store.player_tournament,
    bans: store.bans,
    notifications: store.notifications,
    tournament_matches: store.tournament_matches,
    tournament_results: store.tournament_results,
    // Stages of a multi-game tournament. Same reasoning as tournament_matches
    // above — omitting it from this list would discard every stage on restart.
    tournament_games: store.tournament_games,
    deleted_tournaments: store.deleted_tournaments,
    deleted_users: store.deleted_users,
    favorites: store.favorites,
    reviews: store.reviews,
    game_reviews: store.game_reviews,
    deleted_games: store.deleted_games,
    friendships: store.friendships,
    // Requests are their own records now, not notifications — see store.ts.
    friend_requests: store.friend_requests,
    // Stored conversations. Without this line every message the platform holds
    // would be discarded on the next restart — the exact failure mode this
    // module was written to end.
    messages: store.messages,
    // Per-game save blobs (coins, diamonds, progress). Server-owned in the
    // sense that only the save endpoint writes them, but they must persist, so
    // they belong in this list rather than only in db-export.
    game_saves: store.game_saves,
    // Server-owned (never accepted from db-import), so the store is the only
    // source for these and they must be written from here or they never persist.
    achievements: store.achievements,
    player_achievements: store.player_achievements,
    // Also server-owned, and deliberately absent from db-export: a recovery
    // code — even hashed — has no business being handed to every visitor.
    password_resets: store.password_resets,
    // Teams, Groups and linked external accounts — same reasoning as every
    // other line here: omitted from this list means gone on the next restart.
    teams: store.teams,
    team_tournament: store.team_tournament,
    groups: store.groups,
    group_join_requests: store.group_join_requests,
    linked_game_accounts: store.linked_game_accounts,

    // ── Economy ───────────────────────────────────────────────
    // These six sat in live_database.json for the whole life of the project
    // as PASSTHROUGH — tables the backend had no model for, carried along
    // untouched on every write. Declaring them in store.ts makes them owned,
    // and owned tables must be listed here or the next write drops them.
    //
    // carys_ledger and payouts are new and are the two that matter most: a
    // ledger that vanishes on restart cannot settle a disputed balance, and a
    // payout is a historical fact about money that left the platform.
    // Migration markers. Owned here or the one-off scrubs they guard run
    // again on every restart.
    platform_flags: store.platform_flags,

    cosmetic_items: store.cosmetic_items,
    user_cosmetics: store.user_cosmetics,
    subscription_plans: store.subscription_plans,
    subscriptions: store.subscriptions,
    transactions: store.transactions,
    carys_ledger: store.carys_ledger,
    payouts: store.payouts,
  };
}

/**
 * Tables that live in live_database.json but that the backend has no model
 * for — settings, activityLog, genres, live_events, quickPlayQueue,
 * telemetry. They belong to the frontend's db.js and reach the file only by
 * riding along on a db-import payload.
 *
 * They MUST be carried through every write. Persisting just the store would
 * quietly delete six tables the app depends on, including `settings`, which
 * 39 pages read.
 */
let passthrough: Record<string, unknown> = {};

/**
 * Shout if the store booted with accounts that have no password.
 *
 * This exact state happened and nobody noticed until a user tried to sign in:
 * every one of 24 credentials was gone, because a maintenance script merged
 * the output of /db-export back into live_database.json — and db-export
 * deliberately strips `password`. The file then had password-less users, the
 * store loaded them, and db-import's carry-forward had nothing left to carry.
 * Silent, irreversible, and it locked out the entire platform.
 *
 * Never treat /db-export as a backup: it is a redacted view. persistence.ts
 * writes the full store and is the only thing that should author this file.
 */
export function warnIfCredentialsMissing(): void {
  const active = store.users.filter((u) => u.status !== 'banned');
  const without = active.filter((u) => !u.password);
  if (!without.length) return;

  console.error(
    `[persistence] ${without.length} of ${active.length} active accounts have NO password — ` +
      `they cannot sign in. This usually means live_database.json was overwritten with ` +
      `/db-export output, which strips credentials. Restore from a .bak file.`,
  );
  console.error(
    `[persistence] affected: ${without.slice(0, 8).map((u) => u.user_name).join(', ')}` +
      (without.length > 8 ? ` … +${without.length - 8} more` : ''),
  );
}

/** Seed the passthrough set from whatever was on disk at boot. */
function loadPassthroughFromDisk(): void {
  try {
    const raw = fs.readFileSync(dbPath(), 'utf8');
    const parsed = JSON.parse(raw);
    const owned = new Set(Object.keys(storeTables()));
    for (const key of Object.keys(parsed)) {
      if (!owned.has(key)) passthrough[key] = parsed[key];
    }
  } catch {
    /* no file yet, or unreadable — nothing to carry forward */
  }
}

/**
 * Record any table in a db-import payload that the store does not own, so it
 * is not lost by later API-driven saves.
 */
/** What the store is currently carrying for tables it does not own. */
export function currentPassthrough(): Record<string, unknown> {
  return passthrough;
}

export function rememberPassthrough(body: Record<string, unknown>): void {
  if (!body || typeof body !== 'object') return;
  const owned = new Set(Object.keys(storeTables()));
  for (const key of Object.keys(body)) {
    if (!owned.has(key)) passthrough[key] = body[key];
  }
}

/** The complete database as it should appear on disk. */
export function snapshot(): Record<string, unknown> {
  return { ...passthrough, ...storeTables() };
}

function dbPath(): string {
  return (
    process.env.DB_FILE ||
    path.join(__dirname, '..', '..', '..', 'front-end', 'live_database.json')
  );
}

let timer: NodeJS.Timeout | null = null;
let writing = false;
let dirtyWhileWriting = false;
let lastError: string | null = null;

/**
 * Write now, atomically.
 *
 * Serialises to a temp file and renames over the target: rename is atomic on
 * the same volume, so a crash mid-write can never leave a half-written
 * live_database.json. This file is the only copy of the data, so a torn write
 * is unrecoverable.
 */
export function saveNow(): void {
  if (writing) { dirtyWhileWriting = true; return; }
  writing = true;
  const target = dbPath();
  const tmp = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(snapshot(), null, 2), 'utf8');
    fs.renameSync(tmp, target);
    lastError = null;
  } catch (err) {
    lastError = (err as Error).message;
    console.error('[persistence] Could not write live_database.json:', lastError);
    try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ }
  } finally {
    writing = false;
    if (dirtyWhileWriting) { dirtyWhileWriting = false; scheduleSave(); }
  }
}

/**
 * Queue a write. Debounced so a burst of mutations (a tournament bracket
 * advancing, a db-import touching 21 tables) collapses into one file write
 * instead of dozens.
 */
export function scheduleSave(delayMs = 300): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; saveNow(); }, delayMs);
  // Never hold the process open just to flush a save.
  if (typeof timer.unref === 'function') timer.unref();
}

/** True when there is an unwritten change pending. */
export function isPending(): boolean {
  return timer !== null || dirtyWhileWriting;
}

export function lastWriteError(): string | null {
  return lastError;
}

/**
 * Flush on the way out, so a Ctrl-C between the debounce and the write does
 * not discard the last few seconds of activity.
 */
export function installShutdownFlush(): void {
  const flush = () => { if (timer) { clearTimeout(timer); timer = null; } saveNow(); };
  process.once('SIGINT', () => { flush(); process.exit(0); });
  process.once('SIGTERM', () => { flush(); process.exit(0); });
  process.once('beforeExit', flush);
}

loadPassthroughFromDisk();
