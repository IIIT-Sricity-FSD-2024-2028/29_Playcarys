import { Controller, Get, Post, Body, Headers, Query } from '@nestjs/common';
import { stripScanManifests } from './game/game.util';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import * as storeUtils from './data/store';
import { rememberPassthrough, currentPassthrough } from './data/persistence';
import { bearerFrom, verifyToken } from './auth/token.util';

/**
 * Ceiling on Carys from one match when a game has not declared its own.
 *
 * Chosen to sit above what the existing games actually pay — Hill Climbing
 * self-caps at 400 — so honest builds are unaffected and only absurd claims
 * are cut.
 */
const DEFAULT_CARYS_CAP = 500;

/** The frontend writes some game fields in camelCase (publish.html) and some
 *  in snake_case (backend sync), so delivery-field checks must look for both. */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

@ApiTags('root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Health Check' })
  getHello() {
    return {
      message: 'Welcome to the PlayCarys OMGMP API',
      status: 'success',
      version: 'v1'
    };
  }

  /**
   * GET /api/v1/db-export
   * Returns the full in-memory data store. Used by the frontend on boot to
   * replace the static mock data in db.js with live server-side state.
   */
  @Get('db-export')
  @ApiOperation({
    summary: 'Export the in-memory DB. ?tables=a,b,c returns only those tables.',
  })
  exportDb(
    @Query('tables') tables?: string,
    @Query('userId') userId?: string,
    @Query('scope') scope?: string,
    @Query('historyLimit') historyLimit?: string,
  ) {
    let full: Record<string, any> = this.buildExport();

    // ── Row scoping ───────────────────────────────────────────
    // Table filtering alone barely helps, because the four biggest tables —
    // match_results, matches, sessions, notifications — are ones nearly every
    // page touches. Measured: filtering to the 14 tables the shared scripts
    // read still shipped 158 KB of 177 KB.
    //
    // The size is not in the number of tables, it is in the rows: a player
    // opening their own match history was downloading every match ever played
    // by anyone, and every notification addressed to anyone else. Scoping to
    // the viewer is what actually shrinks it.
    //
    // Opt-in, same reasoning as ?tables: a page that scopes when it needed the
    // full set reads short. Leaderboards and staff consoles pass no userId.
    if (userId) {
      const uid = String(userId);
      const mine = (v: unknown) => String(v) === uid;

      // WHICH tables to scope. Naming them matters: Presence.spectate() looks
      // up any match by id to watch someone else's game, so a page that scopes
      // `matches` loses the ability to spectate — silently, because the lookup
      // just returns nothing. Default stays all four for callers that pass no
      // list; a page that spectates asks for notifications+match_results only.
      const only = scope
        ? new Set(scope.split(',').map((t) => t.trim()).filter(Boolean))
        : null;
      const want = (t: string) => !only || only.has(t);

      full = {
        ...full,
        // Addressed to this user, or to a whole role (toUser null) — those are
        // legitimately theirs too.
        notifications: want('notifications')
          ? (full.notifications || []).filter(
              (n: any) => mine(n.toUser) || n.toUser == null,
            )
          : full.notifications,
        match_results: want('match_results')
          ? (full.match_results || []).filter((r: any) => mine(r.player_id))
          : full.match_results,
        sessions: want('sessions')
          ? (full.sessions || []).filter(
              (s: any) => mine(s.created_by) || mine(s.hostId),
            )
          : full.sessions,
        matches: want('matches')
          ? (full.matches || []).filter((m: any) => mine(m.created_by))
          : full.matches,
      };
    }

    // Most recent N rows of the append-only history tables. `prize` aside,
    // nothing on a page reads the 400th match back — but every page paid to
    // download it. Newest-first, so the cap keeps what is actually shown.
    const limit = Number(historyLimit);
    if (Number.isFinite(limit) && limit > 0) {
      const tail = (rows: any[]) => (rows || []).slice(-limit);
      full = {
        ...full,
        match_results: tail(full.match_results),
        matches: tail(full.matches),
        sessions: tail(full.sessions),
        notifications: tail(full.notifications),
      };
    }

    // ── Partial sync ──────────────────────────────────────────
    // Every page used to hydrate by pulling EVERY table, because this endpoint
    // could only answer with all of them. A page that renders a leaderboard
    // was downloading tombstones and the whole games table to do it.
    //
    // A page now declares what it needs (window.PC_TABLES in db.js) and gets
    // only that. No argument still means everything, so any page not yet
    // converted — and any external caller — behaves exactly as before.
    if (!tables) return full;

    const wanted = new Set(
      tables.split(',').map((t) => t.trim()).filter(Boolean),
    );
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(full)) {
      if (wanted.has(key)) out[key] = full[key];
    }
    return out;
  }

  /** The full export payload. Split out so exportDb can filter it. */
  private buildExport() {
    return {
      roles: storeUtils.roles,
      // Credentials are stripped on the way out. This endpoint is unauthenticated
      // and the frontend calls it on every page load, so the previous version
      // handed every visitor all 24 accounts' plaintext passwords — including
      // the superuser's. Sign-in goes through POST /auth/login instead, which
      // compares server-side. db-import carries the stored password forward
      // whenever a client omits it, so nothing is lost by not sending it.
      users: storeUtils.users.map(({ password, ...safe }) => safe),
      player_profiles: storeUtils.player_profiles,
      publisher_profiles: storeUtils.publisher_profiles,
      // The per-file scan manifest is stripped here, and ONLY here.
      //
      // It is a complete file listing of the uploaded bundle — 665 entries and
      // 86.7 KB for Ancient Beast alone — stored on the game row. This endpoint
      // is fetched by every visitor on every page load, so that listing was 65%
      // of the entire 247 KB payload, shipped to players who can never see it:
      // its one and only reader is the admin file list on game-review.html,
      // which now fetches GET /games/:id/scan-manifest on demand.
      //
      // Everything else on `scan` (verdict, summary, findings, hashes) is small
      // and genuinely used by the review UI, so it stays.
      // Same strip GET /games applies — one helper, four call sites. It was
      // written inline here first, which is why GET /games still shipped the
      // full manifest and quietly reintroduced the payload through another door.
      games: stripScanManifests(storeUtils.games),
      tournaments: storeUtils.tournaments,
      sessions: storeUtils.sessions,
      matches: storeUtils.matches,
      match_results: storeUtils.match_results,
      reports: storeUtils.reports,
      moderator_actions: storeUtils.moderator_actions,
      player_tournament: storeUtils.player_tournament,
      bans: storeUtils.bans,
      notifications: storeUtils.notifications,
      // Round-trip these too, or the client's copy is silently discarded on every
      // page load (see the note in data/store.ts — this is what erased brackets).
      tournament_matches: storeUtils.tournament_matches,
      tournament_results: storeUtils.tournament_results,
      // Stages of a multi-game tournament — same reasoning as tournament_matches
      // right above: absent here means the client's copy is wiped on reload.
      tournament_games: storeUtils.tournament_games,
      deleted_tournaments: storeUtils.deleted_tournaments,
      favorites: storeUtils.favorites,
      reviews: storeUtils.reviews,
      // Friendships are their own table now, not a nested array on the user
      // row. Without this line the client's copy would be wiped on every load,
      // which is exactly what used to happen to tournament brackets.
      friendships: storeUtils.friendships,
      // Pending requests are needed by the drawer to draw Accept/Reject, and
      // they carry no private content — who asked whom, and when.
      friend_requests: storeUtils.friend_requests,
      // Admin approval decisions. Exported so the review page can show a
      // listing's history without a second round trip.
      game_reviews: storeUtils.game_reviews,
      // Round-trip the tombstones too, or a client reloads without them and
      // its next sync resurrects every deleted game.
      deleted_games: storeUtils.deleted_games,
      // Same for removed accounts — without this a browser that still has them
      // in localStorage re-creates them on its next save.
      deleted_users: storeUtils.deleted_users,
      // Achievement definitions are public — the games page lists them so a
      // player can see what there is to earn. Unlocks are public too; they are
      // the basis of the titles shown next to a player's name.
      achievements: storeUtils.achievements,
      player_achievements: storeUtils.player_achievements,
      // Teams, Groups and linked external-game accounts — exported for read the
      // same way friend_requests is (see below): every write to these goes
      // through its own dedicated REST endpoint, never through db-import, so a
      // client cannot forge team membership, group ownership, or a "win".
      teams: storeUtils.teams,
      team_tournament: storeUtils.team_tournament,
      groups: storeUtils.groups,
      group_join_requests: storeUtils.group_join_requests,
      linked_game_accounts: storeUtils.linked_game_accounts
      // NOTE: `messages` and `game_saves` are deliberately ABSENT from this
      // export, and from the import list below.
      //
      // This endpoint takes no authentication and every visitor fetches it on
      // every page load. A private conversation between two friends, and a
      // game's save blob for one player, are not things to hand to everyone who
      // opens the site — putting them here would publish every chat on the
      // platform to any anonymous caller.
      //
      // They are read through their own scoped endpoints, which can check who
      // is asking, and written only by those endpoints. That is also what the
      // Review-4 requirement asks for: new features get real per-operation REST
      // APIs rather than another bulk-sync path.
    };
  }

  /**
   * POST /api/v1/db-import
   * Receives the full DB state from the frontend (after mutations) and
   * writes it back into the running in-memory arrays. This keeps the
   * NestJS store in sync with every DB.save() call from the frontend.
   */
  @Post('db-import')
  @ApiOperation({ summary: 'Import/sync full DB state from frontend (write-back)' })
  @ApiHeader({ name: 'role', description: 'Caller role for RBAC (any authenticated role accepted)', required: false })
  importDb(@Body() body: Record<string, any>, @Headers('authorization') authHeader?: string) {
    // This endpoint accepts the whole database from anyone, so "who is asking"
    // can only come from a signature. A verified admin/superuser token lifts
    // the role and status clamps below so the staff pages keep working; every
    // other caller — including one simply omitting the header — does not.
    const caller = verifyToken(bearerFrom(authHeader));
    const staffCaller = !!caller && ['admin', 'superuser'].includes(String(caller.role).toLowerCase());
    const tables: (keyof typeof storeUtils)[] = [
      'roles', 'users', 'player_profiles', 'publisher_profiles',
      'games', 'tournaments', 'sessions', 'matches', 'match_results',
      'reports', 'moderator_actions', 'player_tournament',
      'bans', 'notifications',
      // Previously missing — see the comment block in data/store.ts. Without these
      // the generated bracket, final results, delete tombstones, favourites and
      // reviews were absent from /db-export and were wiped on the next page load.
      'tournament_matches', 'tournament_results', 'tournament_games', 'deleted_tournaments',
      'favorites', 'reviews', 'game_reviews', 'friendships',
      // Tombstones for deliberately deleted games. The games union reads this
      // from the request body as well as the store, so it does not matter that
      // 'games' is processed earlier in this list.
      'deleted_games',
      // ...and for deliberately deleted accounts. Same reasoning.
      'deleted_users',
      // NOTE: `achievements` and `player_achievements` are deliberately ABSENT.
      //
      // They are exported for reading but never imported. Both carry rewards,
      // so a client that could write them could simply post itself an unlock —
      // or rewrite an achievement to be worth 10,000 Carys — and skip the
      // unlock endpoint that exists to check exactly that. The only writer is
      // the achievement module.
    ];
    // Identity for append-only history tables. A recorded match is a historical
    // fact — a client is allowed to ADD one but never to delete one.
    const appendOnlyKey: Record<string, (r: any) => string> = {
      match_results: (r) => `${r.session_id}|${r.player_id}`,
      sessions: (r) => `${r.session_id ?? r.id}`,
      // A played match is a historical fact, same as the match_results rows
      // that hang off it. Union, never truncate-and-replace.
      matches: (r) => `${r.match_id}`,
      // Accounts are protected for the same reason as matches: a client still
      // holding the seed user list was wiping every registered account here.
      //
      // Keyed on user_id, NOT email. Email is editable from the profile page, and
      // keying identity on a mutable field made every email change fork the account
      // into two rows here — the pre-edit row looked like one the client had simply
      // omitted, so it was "preserved" forever alongside the edited one.
      // The email fallback carries role_id too. Email is unique per role
      // rather than globally (R-AUTH-2), so a bare address is no longer an
      // identity: a player account and a studio account on the same inbox
      // would otherwise collapse into one row here.
      users: (u) =>
        u.user_id !== null && u.user_id !== undefined && String(u.user_id) !== 'undefined'
          ? `id:${u.user_id}`
          : `em:${u.email}|r:${u.role_id ?? ''}`,
      player_profiles: (p) => `${p.user_id}`,
      // Notifications are messages between players. A client that had not yet
      // pulled the newest state was wiping friend requests and chats another
      // client had just sent, which is why those "only showed up sometimes".
      // The client tombstones with a `cleared` flag instead of deleting, so
      // treating this as append-only does not break "Clear All".
      notifications: (n) => `${n.id}`,
      // The history junctions. Everything else that records "this happened" is
      // append-only here; these two were left on truncate-and-replace, so a
      // client posting a stale or empty list deleted them for everyone. Seen:
      // player_session went from 17 rows to 0 on an ordinary sync, taking every
      // record of who was in which room with it. (That table is gone now.)
      player_tournament: (r) => `${r.player_id}|${r.tournament_id}`,
      // An approval decision is a historical fact about who let a build onto
      // the platform. A client may read it; it may never drop one.
      game_reviews: (r) => `${r.review_id}`,
      // One row per pair, and the pair IS the key — user_a is always the lower
      // id, so (7,8) and (8,7) can never become two rows. Append-only for the
      // same reason as notifications: a client holding a stale copy must not be
      // able to delete a friendship for both people. Unfriending sets
      // removed_at, which is an ordinary field update on the surviving row.
      friendships: (f) => `${f.user_a}|${f.user_b}`,
      // A game listing outlives any one tab's snapshot. Four games created and
      // approved through the API were destroyed seconds later by a client that
      // had loaded its list before they existed — their extracted builds were
      // left orphaned on disk with nothing pointing at them. Deletion is still
      // possible, but it has to be stated via deleted_games rather than implied
      // by an absence. Same reasoning as `users` above.
      games: (g) => `${g.game_id}`,
      // The tombstones themselves must be append-only, or the protection above
      // unravels: a client that has never seen a deletion sends an empty
      // deleted_games, that wipes the tombstone, and the next sync from a tab
      // still holding the game re-creates it. Observed exactly once — a
      // tombstone written by DELETE /games/17 was gone from the store minutes
      // later because a page load POSTed its empty list.
      deleted_games: (d) => `${d && typeof d === 'object' ? d.game_id ?? d.id : d}`,
      deleted_users: (d) => `${d && typeof d === 'object' ? d.user_id ?? d.id : d}`,
      // The bracket. These two were in the table list but had no identity here,
      // so they took the truncate-and-replace path: whichever client saved last
      // decided what the bracket was. A player whose tab loaded before the
      // publisher pressed "Start Tournament" wiped every generated match on
      // their next ordinary sync — the same failure that erased brackets before
      // they were added to db-export at all, just one layer further in.
      //
      // A match in a bracket is a scheduled fact, so the union is correct: a
      // client may add or update a row, never delete one for everyone else.
      tournament_matches: (m) => `${m.match_id}`,
      // Final standings — one row per player per tournament, and a placement
      // is a historical fact for the same reason a match result is.
      tournament_results: (r) => `${r.tournament_id}|${r.player_id}`,
      // A stage declaration is the same kind of scheduled fact as a bracket
      // match — same union reasoning, same failure mode if it were absent
      // here (a client syncing before a stage was added would wipe it).
      tournament_games: (g) => `${g.tournament_game_id}`,
    };

    // Accounts that have been deliberately removed. Read once, up front, from
    // the store AND the incoming body, because `users` is processed before
    // `deleted_users` in the table list above.
    const removedUsers = new Set(
      [
        ...(storeUtils.deleted_users as any[]),
        ...(Array.isArray(body.deleted_users) ? body.deleted_users : []),
      ].map((d) => `${d && typeof d === 'object' ? d.user_id ?? d.id : d}`),
    );

    // Which column names point at an account, per table. Deleting the `users`
    // row alone is not deletion: match_results, sessions and player_session are
    // append-only, so the deleted player's matches and rooms kept returning
    // from any tab that had not reloaded, leaving history rows whose owner does
    // not exist. Mirrors USER_REFS in front-end/data/db.js.
    const USER_REF_FIELDS: Record<string, string[]> = {
      users: ['user_id'],
      player_profiles: ['user_id'],
      publisher_profiles: ['user_id'],
      match_results: ['player_id'],
      player_tournament: ['player_id'],
      sessions: ['created_by', 'hostId'],
      // A match has no host — created_by is simply who started the play.
      matches: ['created_by'],
      notifications: ['toUser', 'fromUserId'],
      reviews: ['playerId'],
    };
    const ownedByRemovedUser = (row: any, table: string) => {
      const fields = USER_REF_FIELDS[table];
      if (!row || !fields) return false;
      return fields.some((f) => row[f] != null && removedUsers.has(String(row[f])));
    };

    // A player reference of NaN / null / "" names nobody — a write that ran
    // before the id resolved. There is no account behind it to tombstone, so
    // cleaning the file was never enough: match_results is append-only, and the
    // first client still holding its copy posted it straight back. Rejected here
    // so the row cannot re-enter the store at all.
    //
    // Note NaN does not survive JSON: JSON.stringify turns it into null. So a
    // missing owner has to be caught as null, not just as the string "NaN" —
    // but only on the tables where a row without an owner is meaningless. On
    // `sessions` and `notifications` a null is legitimate (an unhosted room, a
    // notification addressed to a whole role via toRole), so those tables are
    // deliberately absent from this list.
    const OWNER_REQUIRED: Record<string, string> = {
      match_results: 'player_id',
      player_tournament: 'player_id',
      player_profiles: 'user_id',
      publisher_profiles: 'user_id',
      reviews: 'playerId',
      users: 'user_id',
    };
    const JUNK_REF = new Set(['nan', 'null', 'undefined', '']);
    const hasUnidentifiableOwner = (row: any, table: string) => {
      const owner = OWNER_REQUIRED[table];
      if (!row || !owner) return false;
      if (row[owner] == null) return true;
      return JUNK_REF.has(String(row[owner]).trim().toLowerCase());
    };
    const isRejected = (row: any, table: string) =>
      ownedByRemovedUser(row, table) || hasUnidentifiableOwner(row, table);

    for (const table of tables) {
      if (body[table] && Array.isArray(body[table])) {
        const arr = storeUtils[table] as any[];
        const keyOf = appendOnlyKey[table];

        // ── Carys cap ──────────────────────────────────────────
        // A game declares its own payout by passing carys_earned through the
        // SDK, and nothing bounded it: a published build could award itself
        // 999,999 per match and own the leaderboard. Hosted bundles are
        // third-party code, so that was a two-line exploit.
        //
        // Clamped here rather than only in the wrapper because this is the
        // path every recorded match takes, whatever produced it.
        if (table === 'match_results') {
          const capOf = new Map(
            (storeUtils.games as any[]).map((g) => [
              String(g.game_id),
              Number.isFinite(g.max_carys_per_match) ? Number(g.max_carys_per_match) : DEFAULT_CARYS_CAP,
            ]),
          );
          for (const row of body[table] as any[]) {
            const cap = capOf.get(String(row?.game_id)) ?? DEFAULT_CARYS_CAP;
            const claimed = Number(row?.carys_earned);
            if (Number.isFinite(claimed) && claimed > cap) {
              console.warn(
                `[db-import] clamped carys_earned ${claimed} -> ${cap} for game ${row.game_id}` +
                  ` (player ${row.player_id})`,
              );
              row.carys_earned = cap;
            }
            if (Number.isFinite(claimed) && claimed < 0) row.carys_earned = 0;
          }
        }

        // Presence is a heartbeat, but each client uploads the whole user list, so
        // an older snapshot would drag every OTHER player's lastSeen backwards and
        // flap them between Online and Offline. Carry the newer stamp forward.
        if (table === 'users') {
          const byId = new Map(
            (arr as any[]).map((u) => [`${u.user_id ?? u.email}`, u]),
          );
          // Collected here and filtered after the loop — splicing the array
          // being iterated skips the row after each removal.
          const dropDuplicates = new Set<string>();
          for (const incoming of body[table] as any[]) {
            const existing = byId.get(`${incoming.user_id ?? incoming.email}`);

            // ── Session claims never travel in a bulk sync ──────────────
            //
            // active_session_token / active_session_at say "this account is
            // open right now, on this device". They are written by /auth/login,
            // refreshed by /auth/heartbeat and cleared by /auth/release — all
            // of which prove they hold the token.
            //
            // db-import carries EVERY user row from whichever tab happens to
            // save, so a client with a stale snapshot was re-asserting old
            // tokens onto other people's accounts. The owner then signs in and
            // is told "your account is open somewhere else, wait for approval"
            // about a session that stopped existing hours ago. Reproduced here:
            // twelve accounts, all released, all re-claimed by a single page
            // load.
            //
            // The server's copy always wins, in both directions — a client can
            // neither claim an account nor release one by syncing.
            if (existing) {
              incoming.active_session_token = existing.active_session_token ?? null;
              incoming.active_session_at = existing.active_session_at ?? null;
            } else {
              // A brand-new account arrives unclaimed; signing in is what
              // claims it.
              delete incoming.active_session_token;
              delete incoming.active_session_at;
            }

            // A row with no counterpart is a NEW account. Self-registration
            // may only create a player (4) or a publisher (5) — the same rule
            // R-AUTH-4 enforces on POST /auth/register. Without this clamp the
            // role check below is trivially sidestepped: rather than promoting
            // an existing account, an anonymous caller simply invents a brand
            // new one with role_id 1.
            //
            // Staff accounts are still creatable, but only by staff: the
            // superuser pages send their signed token, which lifts the clamp.
            if (!existing) {
              if (!staffCaller && incoming.role_id != null && ![4, 5].includes(Number(incoming.role_id))) {
                console.warn(
                  `[db-import] refused unauthenticated creation of role_id ${incoming.role_id}` +
                    ` for "${incoming.user_name}" — forced to player`,
                );
                incoming.role_id = 4;
                delete incoming.role;
              }

              // ── One email, one account per role ────────────────
              //
              // POST /auth/register enforces this (emailExistsForRole), but
              // this path did not — it clamped the ROLE of a new account and
              // then created it regardless of who else already used that
              // address. Client-side sign-up mints its own id and arrives
              // here, so registering twice produced two live accounts on one
              // email: "jagan" existed twice, four days apart, and the second
              // had none of the first's matches, friends or history.
              //
              // Dropped rather than merged. Merging two accounts is a
              // destructive guess about which history is authoritative, and
              // this endpoint is the wrong place to make it — refusing the
              // duplicate leaves the original account, and its owner, intact.
              const dupEmail = String(incoming.email ?? '').trim().toLowerCase();
              if (dupEmail) {
                const clash = (storeUtils.users as any[]).find(
                  (u) =>
                    String(u.email ?? '').trim().toLowerCase() === dupEmail &&
                    Number(u.role_id) === Number(incoming.role_id ?? 4) &&
                    String(u.user_id) !== String(incoming.user_id),
                );
                if (clash) {
                  console.warn(
                    `[db-import] refused duplicate account for ${dupEmail}: ` +
                      `"${incoming.user_name}" (${incoming.user_id}) — ` +
                      `already held by "${clash.user_name}" (${clash.user_id})`,
                  );
                  dropDuplicates.add(String(incoming.user_id));
                }
              }
              continue;
            }

            // db-export no longer sends passwords, so a client's user rows
            // normally carry none. An absent password therefore means "not
            // changed", NOT "cleared" — without this the first sync after a
            // page load would blank every credential on the platform.
            //
            // A password that IS present is honoured: that is how sign-up and
            // the profile page's password change reach the server.
            if (incoming.password == null || incoming.password === '') {
              incoming.password = existing.password;
            }

            // ── role_id and status are NOT client-writable ──────────
            // This endpoint takes no authentication, so anything it accepts is
            // accepted from anyone. Posting a single user row with role_id: 1
            // promoted a player to superuser — a full takeover with one
            // unauthenticated request, verified against this server.
            //
            // Both fields have proper homes: role changes go through
            // PATCH /users/:id/role and bans through the moderation endpoints,
            // which the guard protects. Here they are pinned to what the
            // server already holds.
            if (!staffCaller && incoming.role_id !== existing.role_id) {
              console.warn(
                `[db-import] refused role change for user ${existing.user_id}: ` +
                  `${existing.role_id} -> ${incoming.role_id}`,
              );
              incoming.role_id = existing.role_id;
              incoming.role = existing.role;
            }
            if (!staffCaller && incoming.status !== existing.status) {
              console.warn(
                `[db-import] refused status change for user ${existing.user_id}: ` +
                  `${existing.status} -> ${incoming.status}`,
              );
              incoming.status = existing.status;
            }
            const a = Date.parse(incoming.lastSeen ?? '');
            const b = Date.parse(existing.lastSeen ?? '');
            if (!isNaN(b) && (isNaN(a) || b > a)) incoming.lastSeen = existing.lastSeen;
          }

          if (dropDuplicates.size) {
            body[table] = (body[table] as any[]).filter(
              (u) => !dropDuplicates.has(String(u.user_id)),
            );
          }
        }

        // ── carys_points is NOT client-writable ────────────────
        // Carys buys real things now, so a balance a browser can post is a
        // balance a player can mint. This endpoint takes no authentication:
        // one player_profiles row with carys_points: 999999 was a free shop.
        //
        // It is also how the cached total silently drifted away from the
        // ledger — a tab syncing its stale copy wrote a number no
        // carys_ledger entry accounted for, which is exactly the thing the
        // ledger exists to make impossible.
        //
        // Same reasoning as achievements being absent from IMPORTABLE above:
        // the only writer is creditCarys(). Everything else on the profile
        // (play_time, matches_won, active_title) stays client-writable.
        if (table === 'player_profiles') {
          const currentCarys = new Map(
            (storeUtils.player_profiles as any[]).map((p) => [String(p.user_id), p.carys_points]),
          );
          for (const row of body[table] as any[]) {
            if (!row) continue;
            const held = currentCarys.get(String(row.user_id));
            if (held === undefined) {
              // A profile the server has never seen starts at zero, not at
              // whatever the client proposed.
              row.carys_points = 0;
              continue;
            }
            if (Number(row.carys_points) !== Number(held)) {
              console.warn(
                `[db-import] refused carys_points change for user ${row.user_id}: ` +
                  `${held} -> ${row.carys_points}`,
              );
            }
            row.carys_points = held;
          }
        }

        // Delivery fields describe how a game is launched. `games` is
        // truncate-and-replace here, so any client syncing a game list it
        // captured before a bundle upload (or before a publisher set a
        // self-host URL) silently erased that config — the build stayed on
        // disk and the game went straight back to "Coming Soon".
        //
        // play_path in particular is server-owned: it names files on OUR disk,
        // so a client cannot legitimately know or clear it. Carry the whole set
        // forward unless the client is deliberately switching hosting mode,
        // which is the one case where dropping the old config is intended.
        if (table === 'games') {
          const DELIVERY_FIELDS = [
            'hosting_type', 'play_path', 'game_url', 'webhook_url',
            'bundle_size', 'bundle_uploaded_at',
          ];
          // Review state is produced by the scanner and the approve endpoint,
          // both of which run here. A client cannot compute any of it, so a
          // client value for these is always either a stale echo or a forgery
          // — they are copied down from the server unconditionally.
          const REVIEW_FIELDS = [
            'scan', 'bundle_hash', 'approved_bundle_hash', 'approved_game_url',
            'approved_by', 'approved_at', 'review_note', 'review_required_reason',
          ];
          const byId = new Map((arr as any[]).map((g) => [String(g.game_id), g]));

          for (const incoming of body[table] as any[]) {
            const existing = byId.get(String(incoming.game_id));
            if (!existing) continue;

            const incomingMode = incoming.hosting_type ?? incoming.hostingType;
            const existingMode = existing.hosting_type;
            const switchingMode = !!(incomingMode && existingMode && incomingMode !== existingMode);

            if (!switchingMode) {
              for (const key of DELIVERY_FIELDS) {
                const clientValue = incoming[key] ?? incoming[snakeToCamel(key)];
                if (existing[key] != null && clientValue == null) {
                  incoming[key] = existing[key];
                }
              }
            }

            // Server wins outright, including when the server value is absent:
            // a client that still holds a scan report the server has since
            // cleared (build removed, bundle replaced) must not restore it.
            for (const key of REVIEW_FIELDS) {
              if (existing[key] == null) delete incoming[key];
              else incoming[key] = existing[key];
            }

            // A client may never PROMOTE a game to approved. That decision
            // comes from PATCH /games/:id/approve, which is where the scan
            // check, the reviewer identity check and the audit row live —
            // the legacy admin pages simply set g.status='approved' in
            // localStorage and pushed the whole DB here, which published a
            // build nothing had looked at.
            //
            // De-escalation is left alone on purpose: a publisher resubmitting
            // a rejected game sends it back to 'pending', and a game going
            // offline is the safe direction. Only the promote path is guarded.
            const clientStatus = incoming.game_approval_status ?? incoming.status;
            if (clientStatus === 'approved' && existing.game_approval_status !== 'approved') {
              console.warn(
                `[db-import] refused client-side approval of game ${incoming.game_id}` +
                  ` — server holds "${existing.game_approval_status}". Use PATCH /games/:id/approve.`,
              );
              incoming.game_approval_status = existing.game_approval_status;
            }

            // ...and a client may not UN-approve a reviewed game either.
            //
            // De-escalation looked like the safe direction, so it was allowed.
            // It is not: a tab holding a snapshot from before an approval sends
            // 'pending', that replaces the row, and a game an admin signed off
            // on silently vanishes from the catalogue. Observed repeatedly —
            // Ancient Beast was approved five times and knocked back to pending
            // by the very next page load, each time with nothing in the UI to
            // explain it. Taking a game offline is a decision, and decisions go
            // through the review endpoints, which set approved_by.
            if (
              existing.game_approval_status === 'approved' &&
              existing.approved_by != null &&
              clientStatus !== 'approved'
            ) {
              console.warn(
                `[db-import] refused client-side un-approval of game ${incoming.game_id}` +
                  ` — reviewed by user ${existing.approved_by}. Use PATCH /games/:id/approve.`,
              );
              incoming.game_approval_status = 'approved';
              incoming.game_status = existing.game_status;
            }

            // Cover art is publisher metadata the server already holds. A stale
            // client that never saw it was blanking every image on sync.
            if (existing.img != null && existing.img !== '' && (incoming.img == null || incoming.img === '')) {
              incoming.img = existing.img;
            }

            // R-GAME-4 again, at the sync boundary: only an approved listing
            // may be enabled. Without this a client could leave game_status
            // 'enabled' on a game the server just pulled back for re-review.
            if (incoming.game_approval_status !== 'approved') {
              incoming.game_status = 'disabled';
            }
          }
        }

        if (keyOf) {
          // UNION, not truncate-and-replace.
          //
          // This used to do `arr.length = 0; arr.push(...body[table])`. Every
          // client POSTs its WHOLE database here, so a tab holding a stale
          // snapshot wiped out matches that another tab had just recorded —
          // server-side and then, via the global_db_update broadcast, in every
          // other client too. Reproduced: a run saved successfully, an unrelated
          // save followed, and the run was gone from both the store and
          // live_database.json.
          const seen = new Set(body[table].map(keyOf));
          const preserved = arr.filter((row) => !seen.has(keyOf(row)));
          arr.length = 0;
          arr.push(...body[table], ...preserved);
          if (preserved.length) {
            console.warn(
              `[db-import] kept ${preserved.length} ${table} row(s) the client did not send`,
            );
          }
          body[table] = [...arr];   // so the file we write reflects the union

          // A deleted game's HISTORY must stay deleted too.
          //
          // games is protected by tombstones below, but match_results, matches
          // and sessions are append-only with no tombstone of their own — so
          // removing a game left its history behind, and the first stale tab to
          // sync pushed it all straight back. Seen 2026-08-14: TOSIOS and Open
          // Agar were deleted, their 2 matches and 4 sessions reappeared within
          // seconds, still pointing at games that no longer exist. Orphan
          // history is exactly what the leaderboard and Match History then try
          // to render.
          //
          // The tombstone that removes the game removes its history with it.
          if (
            table === 'match_results' ||
            table === 'sessions' ||
            table === 'matches'
          ) {
            const tombstoned = new Set(
              [
                ...(storeUtils.deleted_games as any[]),
                ...(Array.isArray(body.deleted_games) ? body.deleted_games : []),
              ].map((d) => String(d && typeof d === 'object' ? d.game_id ?? d.id : d)),
            );
            if (tombstoned.size) {
              const kept = arr.filter((r: any) => !tombstoned.has(String(r.game_id)));
              if (kept.length !== arr.length) {
                console.warn(
                  `[db-import] dropped ${arr.length - kept.length} ${table} row(s) belonging to deleted games`,
                );
                arr.length = 0;
                arr.push(...kept);
              }
              body[table] = [...arr];
            }
          }

          // Games are the one append-protected table with a legitimate delete
          // path (the admin hub, publisher My Games and superuser pages all
          // remove a game by splicing the client array). The union above would
          // resurrect every one of those, so an explicit tombstone is what
          // distinguishes "deleted" from "my snapshot predates it".
          if (table === 'games') {
            const tombstones = [
              ...(storeUtils.deleted_games as any[]),
              ...(Array.isArray(body.deleted_games) ? body.deleted_games : []),
            ];
            const removed = new Set(
              tombstones.map((d) => String(d && typeof d === 'object' ? d.game_id ?? d.id : d)),
            );
            if (removed.size) {
              const kept = arr.filter((g: any) => !removed.has(String(g.game_id)));
              if (kept.length !== arr.length) {
                console.warn(`[db-import] dropped ${arr.length - kept.length} tombstoned game(s)`);
                arr.length = 0;
                arr.push(...kept);
              }
            }
            body[table] = [...arr];
          }

          // Accounts get the identical treatment. Without it the append-only
          // union makes an account undeletable: the row comes back from the
          // first stale tab that syncs, along with its profile, its matches and
          // every room it ever hosted.
          if (USER_REF_FIELDS[table]) {
            const kept = arr.filter((r: any) => !isRejected(r, table));
            if (kept.length !== arr.length) {
              console.warn(`[db-import] dropped ${arr.length - kept.length} orphaned ${table} row(s)`);
              arr.length = 0;
              arr.push(...kept);
            }
            body[table] = [...arr];
          }
        } else {
          arr.length = 0;
          // Same filter on the plain-replace path (publisher_profiles,
          // player_session, reviews, ...) — a deleted studio must not keep a
          // profile, and a deleted player must not keep rows in the junctions.
          arr.push(
            ...(USER_REF_FIELDS[table]
              ? body[table].filter((r: any) => !isRejected(r, table))
              : body[table]),
          );
        }
      }
    }

    // Tables the client owns that this store has no model for — settings,
    // activityLog, genres, live_events, quickPlayQueue, telemetry. They reach
    // the file only through this payload, so hand them to the persistence
    // layer or the next API-driven save would drop all six.
    // ── The platform's own name is superuser-only ─────────────
    //
    // `settings` is a passthrough table, so whatever a client posts here lands
    // on disk verbatim. Disabling the input on the admin page is a UI courtesy
    // and nothing more: this endpoint takes no authentication by default, so
    // before this check ANY caller — an admin, a player, a script with curl —
    // could rename the platform for everybody with one request.
    //
    // Pinned to what the server already holds unless the caller presents a
    // superuser token. Same shape as the role_id and carys_points guards above.
    const incomingSettings = (body as any)?.settings;
    if (incomingSettings && typeof incomingSettings === 'object') {
      const held = (currentPassthrough().settings ?? {}) as Record<string, unknown>;
      const superCaller = !!caller && String(caller.role).toLowerCase() === 'superuser';
      if (!superCaller && held.platformName !== undefined &&
          incomingSettings.platformName !== held.platformName) {
        console.warn(
          `[db-import] refused platform rename: "${held.platformName}" -> ` +
            `"${incomingSettings.platformName}" (caller: ${caller?.role ?? 'anonymous'})`,
        );
        incomingSettings.platformName = held.platformName;
      }
    }

    rememberPassthrough(body);

    // Writing is no longer done here. persistence.ts is the single writer for
    // live_database.json, and the global interceptor schedules the flush —
    // one debounced, atomic write instead of two code paths racing on the
    // same file with different notions of what the database contains.
    return { status: 'ok', synced: tables.filter(t => Array.isArray(body[t])) };
  }
}
