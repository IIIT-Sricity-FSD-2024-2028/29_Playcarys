import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  tournaments,
  games,
  users,
  match_results,
  player_tournament,
  tournament_matches,
  tournament_results,
  tournament_games,
  messages,
  team_tournament,
  teams,
  Tournament,
  TournamentMatch,
  TournamentGame,
} from '../data/store';
import {
  issueMatchToken,
  verifyMatchToken,
  verifyWebhookSignature,
} from './match-token.util';

// ── Domain rules ────────────────────────────────────────────
// R-TP-1: A tournament is decided EITHER by score (single-player) or by a
//         bracket (multiplayer). Which one is declared, not guessed per game id.
// R-TP-2: A score leaderboard ranks a DECLARED metric in a DECLARED direction,
//         so it works for distance, points and lap times alike.
// R-TP-3: Only results recorded inside the tournament's window and tagged with
//         its id count towards it.
// R-TP-4: The bracket lives server-side. It used to be generated in db.js on
//         the client, which means a player could edit their own copy and sync
//         a win.
// R-TP-5: A publisher-reported result must be HMAC-signed with that game's
//         shared secret, or it is just an HTTP request anybody could send.
// R-TP-6: Games with no integration fall back to dual-report: both players
//         report, agreement advances, disagreement raises a dispute.
//
// ── Multi-game extension ─────────────────────────────────────
// R-TP-7: A multi-game tournament has no game_id/format/metric of its own —
//         every one of those questions is answered per STAGE (TournamentGame).
//         Everything above (R-TP-1..6) still applies, just re-run once per
//         stage instead of once for the whole tournament.
// R-TP-8: Every entrant of the TOURNAMENT plays every stage — there is no
//         separate per-stage registration. A stage is a leg, not a new event.
// R-TP-9: A stage's placements convert to POINTS (STAGE_POINTS, scaled by the
//         stage's points_weight) which sum across stages into the OVERALL
//         standing. The overall standing is provisional until every stage is
//         'completed'; the tournament itself is marked 'completed' and final
//         tournament_results are written the moment the LAST stage finishes.
// R-TP-10: A bracket stage's placement is simplified to three tiers — winner,
//          runner-up (lost the final), everyone else who played at least one
//          match. This is a deliberate simplification: a full round-by-round
//          placement (quarterfinalist vs. round-of-16, etc.) is real bracket
//          scoring but meaningfully more bookkeeping for a fest-organizer
//          feature where "who won the leg" is what people actually care about.
// ────────────────────────────────────────────────────────────

/**
 * Placement -> points, 1st through 10th; anyone placed lower gets the flat
 * participation amount. Loosely modelled on how esports circuits score a
 * leg of a multi-stage series (win the leg, still bank points for showing
 * up) — not a claim of matching any specific real scoring table.
 */
const STAGE_POINTS: number[] = [100, 80, 65, 55, 45, 35, 25, 20, 15, 10];
const PARTICIPATION_POINTS = 5;

function pointsForPlacement(placement: number | null): number {
  if (!placement || placement < 1) return 0;
  return STAGE_POINTS[placement - 1] ?? PARTICIPATION_POINTS;
}

@Injectable()
export class TournamentPlayService {
  private readonly logger = new Logger(TournamentPlayService.name);

  // ── helpers ───────────────────────────────────────────────

  private tournamentOrThrow(id: number): Tournament {
    const t = tournaments.find((x) => Number(x.tournament_id) === Number(id));
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);
    return t;
  }

  private gameOf(t: Tournament) {
    return games.find((g) => Number(g.game_id) === Number(t.game_id));
  }

  /**
   * Score contest or bracket?
   *
   * Declared on the tournament when it was created; otherwise inferred from the
   * GAME's declared mode, which Phase 0 added for exactly this kind of question.
   * A single-player game cannot have a bracket — there is no opponent.
   */
  private formatOf(t: Tournament): 'score' | 'bracket' {
    if (t.format === 'score' || t.format === 'bracket') return t.format;
    const g = this.gameOf(t);
    return g?.game_mode === 'multi' ? 'bracket' : 'score';
  }

  /**
   * The tournament's entrants, as opaque ids — bracket generation and every
   * ranking function below only ever compares/stores these ids, so making
   * this branch is what makes team tournaments reuse that same code
   * unchanged: a team_size tournament hands back team_ids instead of
   * player_ids, and everything downstream (seeding, matches, placements,
   * points) works exactly as it already did.
   */
  private entrants(t: Tournament): number[] {
    if (t.team_size) {
      return team_tournament
        .filter((r) => Number(r.tournament_id) === Number(t.tournament_id))
        .map((r) => Number(r.team_id));
    }
    return player_tournament
      .filter((p) => Number(p.tournament_id) === Number(t.tournament_id))
      .map((p) => Number(p.player_id));
  }

  private nameOf(userId: number | string) {
    const u = users.find((x) => String(x.user_id) === String(userId));
    return u?.user_name ?? 'Unknown';
  }

  /** Same as nameOf, but resolves a TEAM name when the tournament is team-based. */
  private nameOfEntrant(t: Tournament, id: number | string) {
    if (t.team_size) {
      const team = teams.find((x) => String(x.team_id) === String(id));
      return team?.name ?? 'Unknown Team';
    }
    return this.nameOf(id);
  }

  // ── score contests ────────────────────────────────────────

  /**
   * Rank every entrant by the tournament's declared metric.
   *
   * Replaces buildHillLeaderboard(), which was hardcoded to game_id 8 and the
   * field `distance` — so a score contest for any other game ranked the whole
   * field at zero and looked, convincingly, like nobody had played.
   */
  leaderboard(tournamentId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const metric = t.metric || 'score';
    const direction = t.direction === 'low' ? 'low' : 'high';

    const from = Date.parse(t.start_date);
    const to = Date.parse(t.end_date);

    const rows = this.entrants(t).map((pid) => {
      // Solo: match_results are keyed on the one player_id. Team: a
      // score-contest match_result is still recorded per PLAYER (the game
      // itself has no idea a team exists), so a team's results are every
      // result any of its members produced — the team's score is its best
      // member's contribution, same as any co-op high-score board works.
      const resultOwnerIds = t.team_size
        ? (teams.find((x) => Number(x.team_id) === Number(pid))?.member_ids ?? []).map(String)
        : [String(pid)];

      // R-TP-3. Two conditions, both required: tagged with this tournament AND
      // inside its window. Either alone lets a run from a different contest, or
      // from before the start, decide this one.
      const mine = match_results.filter((r: any) => {
        if (!resultOwnerIds.includes(String(r.player_id))) return false;
        if (String(r.game_id) !== String(t.game_id)) return false;
        if (String(r.tournament_id ?? '') !== String(t.tournament_id)) return false;
        const at = Date.parse(r.joined_at ?? '');
        if (!isNaN(at) && !isNaN(from) && at < from) return false;
        if (!isNaN(at) && !isNaN(to) && at > to) return false;
        return true;
      });

      const values = mine
        .map((r: any) => Number(r[metric]))
        .filter((v) => Number.isFinite(v));

      const best = values.length
        ? (direction === 'low' ? Math.min(...values) : Math.max(...values))
        : null;

      return {
        player_id: pid,
        player_name: this.nameOfEntrant(t, pid),
        avatar: t.team_size ? undefined : users.find((u) => Number(u.user_id) === pid)?.avatar ?? '??',
        attempts: mine.length,
        value: best,
        played: best !== null,
      };
    });

    // Unplayed entrants sort last whichever direction we are ranking, rather
    // than winning a "lowest time" contest by never turning up.
    rows.sort((a, b) => {
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return direction === 'low' ? a.value - b.value : b.value - a.value;
    });

    return {
      tournament_id: t.tournament_id,
      format: 'score' as const,
      metric,
      direction,
      metric_label: t.metric_label || metric,
      metric_unit: t.metric_unit || '',
      standings: rows.map((r, i) => ({ ...r, rank: r.played ? i + 1 : null })),
    };
  }

  // ── brackets ──────────────────────────────────────────────

  /**
   * Generate the bracket. Server-side, and only once.
   *
   * This lived in db.js on the client, which meant the bracket — who plays whom,
   * and who advances — was whatever the last browser to sync said it was.
   */
  startTournament(tournamentId: number, organizerId: number) {
    const t = this.tournamentOrThrow(tournamentId);

    if (Number(t.organizer) !== Number(organizerId)) {
      throw new ForbiddenException('Only the organizer can start this tournament.');
    }
    if (this.formatOf(t) !== 'bracket') {
      throw new BadRequestException(
        'This is a score contest — there is no bracket to generate. Players simply play and the leaderboard ranks them.',
      );
    }
    if (tournament_matches.some((m) => String(m.tournamentId) === String(t.tournament_id))) {
      throw new BadRequestException('This tournament already has a bracket.');
    }

    const pids = this.entrants(t);
    if (pids.length < 2) throw new BadRequestException('At least 2 players are required.');

    const size = Math.pow(2, Math.ceil(Math.log2(pids.length)));

    // Standard seeding fold: 1v8, 4v5, 2v7, 3v6 — keeps the top seeds apart
    // until late rather than drawing them against each other in round 1.
    let order = [1];
    for (let i = 1; i <= Math.log2(size); i++) {
      const next: number[] = [];
      const sum = Math.pow(2, i) + 1;
      for (const slot of order) next.push(slot, sum - slot);
      order = next;
    }
    const seeds = order.map((slot) => (slot <= pids.length ? pids[slot - 1] : 'BYE'));

    const totalRounds = Math.log2(size);
    const created: TournamentMatch[] = [];

    for (let i = 0; i < size; i += 2) {
      const a = seeds[i];
      const b = seeds[i + 1];
      const bye = a === 'BYE' || b === 'BYE';
      created.push({
        match_id: `T${t.tournament_id}R1M${i / 2}`,
        tournamentId: t.tournament_id,
        round: 1,
        player1: a === 'BYE' ? 'BYE' : a,
        player2: b === 'BYE' ? 'BYE' : b,
        score1: 0,
        score2: 0,
        status: bye ? 'completed' : 'waiting',
        winnerId: b === 'BYE' ? a : a === 'BYE' ? b : null,
        parentMatchId: totalRounds > 1 ? `T${t.tournament_id}R2M${Math.floor(i / 4)}` : null,
      });
    }

    let perRound = size / 4;
    for (let r = 2; r <= totalRounds; r++) {
      for (let i = 0; i < perRound; i++) {
        created.push({
          match_id: `T${t.tournament_id}R${r}M${i}`,
          tournamentId: t.tournament_id,
          round: r,
          player1: null,
          player2: null,
          score1: 0,
          score2: 0,
          status: 'waiting',
          winnerId: null,
          parentMatchId: r < totalRounds ? `T${t.tournament_id}R${r + 1}M${Math.floor(i / 2)}` : null,
        });
      }
      perRound /= 2;
    }

    tournament_matches.push(...created);

    // Feed byes forward immediately, or round 1 sits with winners that never
    // reach round 2 and the bracket can never be advanced.
    created
      .filter((m) => m.round === 1 && m.status === 'completed' && m.winnerId)
      .forEach((m) => this.advance(m, m.winnerId!));

    t.status = 'in-progress';
    this.logger.log(`Tournament ${t.tournament_id}: bracket of ${created.length} matches generated`);
    return this.bracket(tournamentId);
  }

  bracket(tournamentId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const rows = tournament_matches
      .filter((m) => String(m.tournamentId) === String(t.tournament_id))
      .sort((a, b) => a.round - b.round || a.match_id.localeCompare(b.match_id))
      .map((m) => ({
        ...m,
        player1_name: m.player1 === 'BYE' ? 'BYE' : m.player1 ? this.nameOfEntrant(t, m.player1) : null,
        player2_name: m.player2 === 'BYE' ? 'BYE' : m.player2 ? this.nameOfEntrant(t, m.player2) : null,
        winner_name: m.winnerId ? this.nameOfEntrant(t, m.winnerId) : null,
      }));
    return { tournament_id: t.tournament_id, format: 'bracket' as const, matches: rows };
  }

  /** Move a winner into the next match, or finish the tournament. */
  private advance(m: TournamentMatch, winnerId: number | string) {
    m.status = 'completed';
    m.winnerId = winnerId;
    m.score1 = String(m.player1) === String(winnerId) ? 1 : 0;
    m.score2 = String(m.player2) === String(winnerId) ? 1 : 0;

    if (m.parentMatchId) {
      const parent = tournament_matches.find((x) => x.match_id === m.parentMatchId);
      if (parent) {
        if (!parent.player1) parent.player1 = winnerId;
        else if (!parent.player2) parent.player2 = winnerId;
      }
      return;
    }

    // No parent: this was the final — of the whole tournament (single-game)
    // or of one stage (multi-game). R-TP-7: multi-game defers to
    // maybeCompleteStage(), which only completes the TOURNAMENT once every
    // stage has finished, and writes the combined-points standing rather
    // than a single winner.
    if (m.tournament_game_id != null) {
      this.maybeCompleteStage(m.tournament_game_id);
      return;
    }

    const t = tournaments.find((x) => String(x.tournament_id) === String(m.tournamentId));
    if (t) {
      t.status = 'completed';
      tournament_results.push({
        tournament_id: t.tournament_id,
        player_id: Number(winnerId),
        placement: 1,
        prize_awarded: t.prize,
        recorded_at: new Date().toISOString(),
      });
      this.logger.log(`Tournament ${t.tournament_id} won by ${this.nameOf(winnerId)}`);
    }
  }

  private matchOrThrow(matchId: string): TournamentMatch {
    const m = tournament_matches.find((x) => String(x.match_id) === String(matchId));
    if (!m) throw new NotFoundException(`Tournament match ${matchId} not found`);
    return m;
  }

  /**
   * Is this user allowed to act on this match (get a token, report, confirm,
   * dispute)? Solo tournaments: they must literally be one of the two slots.
   * Team tournaments: the slots hold team_ids, so any MEMBER of the team in
   * either slot may act — not the captain alone, since it is realistically
   * whoever is actually at the keyboard for that match who reports it.
   */
  private isInMatch(t: Tournament, m: TournamentMatch, userId: number | string): boolean {
    if (!t.team_size) {
      return String(m.player1) === String(userId) || String(m.player2) === String(userId);
    }
    const teamIds = [m.player1, m.player2].filter((x) => x != null && x !== 'BYE');
    return teamIds.some((tid) => {
      const team = teams.find((x) => String(x.team_id) === String(tid));
      return !!team && team.member_ids.some((mid) => String(mid) === String(userId));
    });
  }

  /** Which slot (player1/player2, or its team) a user belongs to in this match, if any. */
  private sideOf(t: Tournament, m: TournamentMatch, userId: number | string): 1 | 2 | null {
    const onSlot = (slot: number | string | null) => {
      if (slot == null || slot === 'BYE') return false;
      if (!t.team_size) return String(slot) === String(userId);
      const team = teams.find((x) => String(x.team_id) === String(slot));
      return !!team && team.member_ids.some((mid) => String(mid) === String(userId));
    };
    if (onSlot(m.player1)) return 1;
    if (onSlot(m.player2)) return 2;
    return null;
  }

  // ── the match token ───────────────────────────────────────

  /**
   * Hand a player their rendezvous key for a bracket match.
   *
   * Both players get a token carrying the SAME match_id. The publisher's own
   * matchmaker groups whoever presents it — that is the whole integration, and
   * it is the only shape that works when the platform does not run the netcode.
   */
  tokenFor(matchId: string, userId: number) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    const game = this.gameOf(t);
    if (!game) throw new NotFoundException('Game not found for this tournament.');

    if (!this.isInMatch(t, m, userId)) throw new ForbiddenException('You are not in this match.');
    if (m.status === 'completed') throw new BadRequestException('That match is already finished.');

    const secret = game.webhook_secret;
    if (!secret) {
      throw new BadRequestException(
        'This game has no integration secret, so a signed match token cannot be issued. ' +
          'Results for it fall back to both players reporting.',
      );
    }

    const payload = {
      tournament_id: t.tournament_id,
      match_id: m.match_id,
      player_ids: [m.player1, m.player2].filter(Boolean) as (number | string)[],
      game_id: game.game_id,
      // Short-lived on purpose: a token is permission to play one match now,
      // not a permanent pass into that fixture.
      expires_at: Date.now() + 2 * 60 * 60 * 1000,
    };

    const token = issueMatchToken(payload, secret);

    // The deep link the player follows: the publisher's own game URL with the
    // match id and token attached. Both players get the same pc_match, which is
    // the only thing their matchmaker needs in order to put them together.
    const base = game.game_url || '';
    const deep_link = base
      ? `${base}${base.includes('?') ? '&' : '?'}pc_match=${encodeURIComponent(m.match_id)}` +
        `&pc_token=${encodeURIComponent(token)}`
      : null;

    return { match_id: m.match_id, token, deep_link, expires_at: payload.expires_at };
  }

  /** Let a publisher's server check a token a player presented to them. */
  verifyToken(gameId: number, token: string) {
    const game = games.find((g) => Number(g.game_id) === Number(gameId));
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (!game.webhook_secret) throw new BadRequestException('This game has no integration secret.');
    const res = verifyMatchToken(token, game.webhook_secret);
    if (!res.ok) throw new ForbiddenException(res.reason || 'Invalid token.');
    return { valid: true, payload: res.payload };
  }

  // ── results: the integrated path ──────────────────────────

  /**
   * A publisher's SERVER reporting the outcome of a bracket match.
   *
   * This is what finally gives Game.webhook_url a purpose — it has existed, been
   * validated and been shown in the admin review UI, and nothing has ever
   * posted to it or accepted a post from it.
   */
  reportSigned(matchId: string, rawBody: string, signature: string, winnerId: number | string) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    const game = this.gameOf(t);
    if (!game?.webhook_secret) {
      throw new BadRequestException('This game has no integration secret configured.');
    }

    // R-TP-5
    if (!verifyWebhookSignature(rawBody, signature, game.webhook_secret)) {
      throw new ForbiddenException('Signature does not match. Result rejected.');
    }
    if (m.status === 'completed') {
      throw new BadRequestException('That match already has a result.');
    }
    // A publisher may only name somebody who is actually in the fixture.
    if (String(m.player1) !== String(winnerId) && String(m.player2) !== String(winnerId)) {
      throw new BadRequestException('The reported winner is not in this match.');
    }

    this.advance(m, winnerId);
    this.logger.log(`Match ${matchId} decided by signed report from game ${game.game_id}`);
    return { recorded: true, match: m, bracket: this.bracket(Number(m.tournamentId)) };
  }

  // ── results: the fallback ─────────────────────────────────

  /**
   * R-TP-6 — dual report, for games with no integration.
   *
   * One player reports; the other confirms or disputes. Agreement advances the
   * bracket, disagreement parks it for the organizer. Half of this existed in
   * db.js already (reportResult / confirmResult / disputeResult) but disputes
   * went nowhere at all, so a disagreement simply stopped the tournament.
   */
  report(matchId: string, reporterId: number, winnerId: number | string) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    if (m.status === 'completed') throw new BadRequestException('That match is already decided.');

    if (!this.isInMatch(t, m, reporterId)) throw new ForbiddenException('You are not in this match.');
    if (String(m.player1) !== String(winnerId) && String(m.player2) !== String(winnerId)) {
      throw new BadRequestException('That player is not in this match.');
    }

    m.status = 'pending';
    m.reportedWinner = winnerId;
    m.reportedBy = reporterId;
    return { message: 'Result reported. Waiting for your opponent to confirm.', match: m };
  }

  confirm(matchId: string, confirmerId: number) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    if (m.status !== 'pending' || !m.reportedWinner) {
      throw new BadRequestException('There is no reported result to confirm.');
    }
    if (!this.isInMatch(t, m, confirmerId)) throw new ForbiddenException('You are not in this match.');
    // The reporter's OWN SIDE cannot also be the one who agrees with it —
    // otherwise "dual report" is one side deciding twice. In a team match this
    // blocks any teammate of the reporter, not just the literal same person,
    // since a teammate rubber-stamping their own side's report is the same
    // failure the solo check exists to prevent.
    const reporterSide = this.sideOf(t, m, m.reportedBy ?? '');
    const confirmerSide = this.sideOf(t, m, confirmerId);
    if (reporterSide != null && reporterSide === confirmerSide) {
      throw new ForbiddenException('Your opponent has to confirm this, not your own side.');
    }

    this.advance(m, m.reportedWinner);
    return { message: 'Result confirmed.', match: m, bracket: this.bracket(Number(m.tournamentId)) };
  }

  dispute(matchId: string, disputerId: number, reason?: string) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    if (!this.isInMatch(t, m, disputerId)) throw new ForbiddenException('You are not in this match.');

    m.status = 'disputed';
    (m as any).disputed_by = disputerId;
    (m as any).dispute_reason = reason || '';
    this.logger.warn(`Match ${matchId} disputed by ${disputerId}: ${reason || 'no reason given'}`);
    return { message: 'Match disputed. The organizer has been asked to decide.', match: m };
  }

  /** The organizer settling a dispute. Their word is final. */
  resolve(matchId: string, organizerId: number, winnerId: number | string) {
    const m = this.matchOrThrow(matchId);
    const t = this.tournamentOrThrow(Number(m.tournamentId));
    if (Number(t.organizer) !== Number(organizerId)) {
      throw new ForbiddenException('Only the organizer can settle a dispute.');
    }
    if (String(m.player1) !== String(winnerId) && String(m.player2) !== String(winnerId)) {
      throw new BadRequestException('That player is not in this match.');
    }
    this.advance(m, winnerId);
    return { message: 'Dispute settled.', match: m, bracket: this.bracket(Number(m.tournamentId)) };
  }

  /** Disputes waiting on an organizer. */
  disputes(organizerId: number) {
    const mine = new Set(
      tournaments
        .filter((t) => Number(t.organizer) === Number(organizerId))
        .map((t) => String(t.tournament_id)),
    );
    return tournament_matches
      .filter((m) => m.status === 'disputed' && mine.has(String(m.tournamentId)))
      .map((m) => ({
        ...m,
        player1_name: m.player1 ? this.nameOf(m.player1) : null,
        player2_name: m.player2 ? this.nameOf(m.player2) : null,
      }));
  }

  // ── tournament chat ───────────────────────────────────────

  /**
   * Public chat scoped to one tournament.
   *
   * Reuses the `messages` table with tournament_id set and to_user null — the
   * doc asks for "a tournament specific chat box where all players can chat,
   * like a public chat", and that is a different addressee, not a different
   * kind of message.
   */
  chat(tournamentId: number, limit = 100) {
    this.tournamentOrThrow(tournamentId);
    return messages
      .filter((m) => String(m.tournament_id ?? '') === String(tournamentId))
      .sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
      .slice(-limit)
      .map((m) => ({
        id: m.id,
        from_user: m.from_user,
        from_name: this.nameOf(m.from_user),
        body: m.body,
        sent_at: m.sent_at,
      }));
  }

  postChat(tournamentId: number, userId: number, body: string) {
    const t = this.tournamentOrThrow(tournamentId);
    const text = String(body ?? '').trim();
    if (!text) throw new BadRequestException('Message cannot be empty.');
    if (text.length > 500) throw new BadRequestException('Tournament messages are limited to 500 characters.');

    // Entrants only. A public chat that anyone on the platform can post into is
    // not a tournament chat, it is a billboard.
    if (!this.entrants(t).some((p) => Number(p) === Number(userId))) {
      throw new ForbiddenException('Only registered entrants can post here.');
    }

    const highest = messages.reduce((mx, m) => (Number(m.id) > mx ? Number(m.id) : mx), 0);
    const row = {
      id: Math.max(highest + 1, Date.now()),
      from_user: Number(userId),
      to_user: null,
      tournament_id: t.tournament_id,
      body: text,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      deleted_for: [] as number[],
    };
    messages.push(row);
    return { ...row, from_name: this.nameOf(userId) };
  }

  // ── multi-game stages ─────────────────────────────────────

  private isMulti(t: Tournament): boolean {
    return (t.type ?? 'single') === 'multi';
  }

  private stageOrThrow(tournamentId: number, stageId: number): TournamentGame {
    const s = tournament_games.find(
      (g) => g.tournament_game_id === stageId && g.tournament_id === tournamentId,
    );
    if (!s) throw new NotFoundException(`Stage ${stageId} not found on tournament ${tournamentId}`);
    return s;
  }

  private stagesOf(tournamentId: number): TournamentGame[] {
    return tournament_games
      .filter((g) => g.tournament_id === tournamentId)
      .sort((a, b) => a.stage_order - b.stage_order);
  }

  /** R-TP-8 — a stage has no registration of its own; every tournament entrant plays it. */
  private stageEntrants(tournamentId: number): number[] {
    return player_tournament
      .filter((p) => Number(p.tournament_id) === Number(tournamentId))
      .map((p) => Number(p.player_id));
  }

  /** Score-format stage: rank every entrant by THIS stage's declared metric. */
  stageLeaderboard(tournamentId: number, stageId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const stage = this.stageOrThrow(tournamentId, stageId);
    const metric = stage.metric || 'score';
    const direction = stage.direction === 'low' ? 'low' : 'high';

    const rows = this.stageEntrants(tournamentId).map((pid) => {
      const mine = match_results.filter((r: any) => {
        if (String(r.player_id) !== String(pid)) return false;
        if (String(r.game_id) !== String(stage.game_id)) return false;
        if (String(r.tournament_id ?? '') !== String(tournamentId)) return false;
        return true;
      });
      const values = mine.map((r: any) => Number(r[metric])).filter((v) => Number.isFinite(v));
      const best = values.length
        ? (direction === 'low' ? Math.min(...values) : Math.max(...values))
        : null;
      return {
        player_id: pid,
        player_name: this.nameOf(pid),
        avatar: users.find((u) => Number(u.user_id) === pid)?.avatar ?? '??',
        attempts: mine.length,
        value: best,
        played: best !== null,
      };
    });

    rows.sort((a, b) => {
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return direction === 'low' ? a.value - b.value : b.value - a.value;
    });

    return {
      tournament_game_id: stage.tournament_game_id,
      game_id: stage.game_id,
      game_name: games.find((g) => g.game_id === stage.game_id)?.game_name ?? 'Unknown',
      stage_order: stage.stage_order,
      format: 'score' as const,
      metric,
      direction,
      metric_label: stage.metric_label || metric,
      metric_unit: stage.metric_unit || '',
      standings: rows.map((r, i) => ({ ...r, rank: r.played ? i + 1 : null })),
    };
  }

  /** Generate ONE stage's bracket. Same algorithm as startTournament(), scoped to a stage. */
  startStage(tournamentId: number, stageId: number, organizerId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const stage = this.stageOrThrow(tournamentId, stageId);

    if (Number(t.organizer) !== Number(organizerId)) {
      throw new ForbiddenException('Only the organizer can start this stage.');
    }
    if (stage.status !== 'pending') {
      throw new BadRequestException('This stage has already been started.');
    }

    // Score stage: nothing to generate — open it and players simply play,
    // exactly like the single-game score-contest path. completeStage() is
    // the organizer action that closes it back out later.
    if (stage.format === 'score') {
      stage.status = 'active';
      return this.stageLeaderboard(tournamentId, stageId);
    }

    if (tournament_matches.some((m) => m.tournament_game_id === stageId)) {
      throw new BadRequestException('This stage already has a bracket.');
    }

    const pids = this.stageEntrants(tournamentId);
    if (pids.length < 2) throw new BadRequestException('At least 2 players are required.');

    const size = Math.pow(2, Math.ceil(Math.log2(pids.length)));
    let order = [1];
    for (let i = 1; i <= Math.log2(size); i++) {
      const next: number[] = [];
      const sum = Math.pow(2, i) + 1;
      for (const slot of order) next.push(slot, sum - slot);
      order = next;
    }
    const seeds = order.map((slot) => (slot <= pids.length ? pids[slot - 1] : 'BYE'));

    const totalRounds = Math.log2(size);
    const prefix = `T${tournamentId}S${stageId}`;
    const created: TournamentMatch[] = [];

    for (let i = 0; i < size; i += 2) {
      const a = seeds[i];
      const b = seeds[i + 1];
      const bye = a === 'BYE' || b === 'BYE';
      created.push({
        match_id: `${prefix}R1M${i / 2}`,
        tournamentId,
        tournament_game_id: stageId,
        round: 1,
        player1: a === 'BYE' ? 'BYE' : a,
        player2: b === 'BYE' ? 'BYE' : b,
        score1: 0,
        score2: 0,
        status: bye ? 'completed' : 'waiting',
        winnerId: b === 'BYE' ? a : a === 'BYE' ? b : null,
        parentMatchId: totalRounds > 1 ? `${prefix}R2M${Math.floor(i / 4)}` : null,
      });
    }

    let perRound = size / 4;
    for (let r = 2; r <= totalRounds; r++) {
      for (let i = 0; i < perRound; i++) {
        created.push({
          match_id: `${prefix}R${r}M${i}`,
          tournamentId,
          tournament_game_id: stageId,
          round: r,
          player1: null,
          player2: null,
          score1: 0,
          score2: 0,
          status: 'waiting',
          winnerId: null,
          parentMatchId: r < totalRounds ? `${prefix}R${r + 1}M${Math.floor(i / 2)}` : null,
        });
      }
      perRound /= 2;
    }

    tournament_matches.push(...created);
    created
      .filter((m) => m.round === 1 && m.status === 'completed' && m.winnerId)
      .forEach((m) => this.advance(m, m.winnerId!));

    stage.status = 'active';
    this.logger.log(`Tournament ${tournamentId} stage ${stageId}: bracket of ${created.length} matches generated`);
    return this.stageBracket(tournamentId, stageId);
  }

  stageBracket(tournamentId: number, stageId: number) {
    this.stageOrThrow(tournamentId, stageId);
    const rows = tournament_matches
      .filter((m) => m.tournament_game_id === stageId)
      .sort((a, b) => a.round - b.round || a.match_id.localeCompare(b.match_id))
      .map((m) => ({
        ...m,
        player1_name: m.player1 === 'BYE' ? 'BYE' : m.player1 ? this.nameOf(m.player1) : null,
        player2_name: m.player2 === 'BYE' ? 'BYE' : m.player2 ? this.nameOf(m.player2) : null,
        winner_name: m.winnerId ? this.nameOf(m.winnerId) : null,
      }));
    return { tournament_game_id: stageId, format: 'bracket' as const, matches: rows };
  }

  /**
   * Organizer manually closes a SCORE-format stage. A bracket stage completes
   * itself the moment its final match is decided (see advance() ->
   * maybeCompleteStage()); a score contest has no equivalent "last play"
   * signal — someone always COULD submit one more run — so closing it is a
   * deliberate organizer action, exactly like ending the whole single-game
   * score contest already requires elsewhere in this platform.
   */
  completeStage(tournamentId: number, stageId: number, organizerId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const stage = this.stageOrThrow(tournamentId, stageId);
    if (Number(t.organizer) !== Number(organizerId)) {
      throw new ForbiddenException('Only the organizer can close this stage.');
    }
    if (stage.format !== 'score') {
      throw new BadRequestException('Bracket stages complete themselves when the final is decided.');
    }
    if (stage.status === 'completed') {
      throw new BadRequestException('This stage is already complete.');
    }
    this.maybeCompleteStage(stageId);
    return { message: `Stage ${stageId} closed.`, overall: this.overallLeaderboard(tournamentId) };
  }

  /**
   * A stage's final placements. R-TP-10: bracket stages collapse to three
   * tiers (winner / runner-up / everyone who played); score stages use the
   * real rank straight from stageLeaderboard.
   */
  private stagePlacements(tournamentId: number, stage: TournamentGame): Map<number, number> {
    const out = new Map<number, number>();
    if (stage.format === 'score') {
      const board = this.stageLeaderboard(tournamentId, stage.tournament_game_id);
      board.standings.forEach((row) => {
        if (row.rank) out.set(row.player_id, row.rank);
      });
      return out;
    }

    const matches = tournament_matches.filter((m) => m.tournament_game_id === stage.tournament_game_id);
    const totalRounds = matches.length ? Math.max(...matches.map((m) => m.round)) : 0;
    const final = matches.find((m) => m.round === totalRounds && m.status === 'completed');
    const winner = final?.winnerId;
    const runnerUp = final
      ? (String(final.player1) === String(winner) ? final.player2 : final.player1)
      : null;

    if (winner && winner !== 'BYE') out.set(Number(winner), 1);
    if (runnerUp && runnerUp !== 'BYE') out.set(Number(runnerUp), 2);

    // Everyone else who actually played at least one match, participation tier.
    matches.forEach((m) => {
      [m.player1, m.player2].forEach((p) => {
        if (p == null || p === 'BYE') return;
        const pid = Number(p);
        if (!out.has(pid)) out.set(pid, 0); // 0 = participation, not a numbered placement
      });
    });
    return out;
  }

  /** Sum points across every COMPLETED stage. Provisional until all stages are done. */
  overallLeaderboard(tournamentId: number) {
    const t = this.tournamentOrThrow(tournamentId);
    const stages = this.stagesOf(tournamentId);
    const totals = new Map<number, { points: number; breakdown: Record<number, number> }>();

    this.stageEntrants(tournamentId).forEach((pid) => totals.set(pid, { points: 0, breakdown: {} }));

    stages
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const placements = this.stagePlacements(tournamentId, s);
        placements.forEach((placement, pid) => {
          const base = placement === 0 ? PARTICIPATION_POINTS : pointsForPlacement(placement);
          const earned = Math.round(base * (s.points_weight || 1));
          const entry = totals.get(pid) ?? { points: 0, breakdown: {} };
          entry.points += earned;
          entry.breakdown[s.tournament_game_id] = earned;
          totals.set(pid, entry);
        });
      });

    const rows = Array.from(totals.entries())
      .map(([player_id, v]) => ({
        player_id,
        player_name: this.nameOf(player_id),
        avatar: users.find((u) => Number(u.user_id) === player_id)?.avatar ?? '??',
        points: v.points,
        by_stage: v.breakdown,
      }))
      .sort((a, b) => b.points - a.points);

    return {
      tournament_id: tournamentId,
      complete: stages.length > 0 && stages.every((s) => s.status === 'completed'),
      stages_completed: stages.filter((s) => s.status === 'completed').length,
      stages_total: stages.length,
      standings: rows.map((r, i) => ({ ...r, rank: i + 1 })),
    };
  }

  /**
   * Called after a stage's last match finishes (see advance()). Marks the
   * stage completed; if it was the LAST stage, marks the whole tournament
   * completed too and freezes the overall standing into tournament_results —
   * the same moment single-game advance() does it for a plain bracket final.
   */
  private maybeCompleteStage(stageId: number) {
    const stage = tournament_games.find((g) => g.tournament_game_id === stageId);
    if (!stage) return;
    stage.status = 'completed';

    const t = tournaments.find((x) => x.tournament_id === stage.tournament_id);
    if (!t) return;
    const remaining = this.stagesOf(stage.tournament_id).filter((s) => s.status !== 'completed');
    if (remaining.length) return;

    t.status = 'completed';
    const final = this.overallLeaderboard(stage.tournament_id);
    final.standings.forEach((row) => {
      tournament_results.push({
        tournament_id: t.tournament_id,
        player_id: row.player_id,
        placement: row.rank,
        score: row.points,
        prize_awarded: row.rank === 1 ? t.prize : undefined,
        recorded_at: new Date().toISOString(),
      });
    });
    this.logger.log(`Multi-game tournament ${t.tournament_id} completed — ${final.standings[0]?.player_name ?? 'nobody'} finished 1st`);
  }

  /** One call the tournament page can make to know what to render. */
  overview(tournamentId: number) {
    const t = this.tournamentOrThrow(tournamentId);

    if (this.isMulti(t)) {
      return {
        tournament_id: t.tournament_id,
        name: t.tournament_name,
        format: 'multi' as const,
        status: t.status,
        entrants: this.stageEntrants(tournamentId).length,
        stages: this.stagesOf(tournamentId).map((s) => ({
          tournament_game_id: s.tournament_game_id,
          stage_order: s.stage_order,
          game_id: s.game_id,
          game_name: games.find((g) => g.game_id === s.game_id)?.game_name ?? 'Unknown',
          format: s.format,
          status: s.status,
        })),
        overall_leaderboard: this.overallLeaderboard(tournamentId),
      };
    }

    const format = this.formatOf(t);
    return {
      tournament_id: t.tournament_id,
      name: t.tournament_name,
      game_id: t.game_id,
      game_name: this.gameOf(t)?.game_name ?? 'Unknown game',
      format,
      status: t.status,
      entrants: this.entrants(t).length,
      team_size: t.team_size,
      ...(format === 'score' ? this.leaderboard(tournamentId) : this.bracket(tournamentId)),
    };
  }
}
