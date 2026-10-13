import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  RegisterPlayerDto,
  CreateTournamentGameDto,
} from './tournament.dto';
import {
  games, player_profiles, team_tournament, teams, users, roles,
  DEFAULT_RAKE_PCT, formatPaise, Transaction, TournamentPrizeShare,
} from '../data/store';
import { EconomyService } from '../economy/economy.service';
import { GroupsService } from '../groups/groups.service';

// ── Domain Rules ────────────────────────────────────────────
// R-TRN-1: tournament_name must be unique
// R-TRN-2: start_date must be <= end_date; regClose must be <= start_date
// R-TRN-3: Registration only allowed for upcoming tournaments before regClose
// R-TRN-4: A player cannot register twice for the same tournament
// R-TRN-5: Tournament cannot exceed maxParticipants
// R-TRN-6: Only players with player_status=true can register
// R-TRN-7: A completed tournament cannot be updated
// R-TRN-8: The game linked must be approved and enabled
// R-TRN-9: A private tournament requires the correct invite_code to register
// R-TRN-10: A multi-game tournament needs >= 2 stages, each for an approved
//           enabled game; a single-game tournament needs a game_id and no
//           stages at all — the two shapes are mutually exclusive
// R-TRN-11: Stages can only be added/removed before the tournament starts
// R-TRN-12: A TEAM tournament is decided head-to-head, never by score. Teams
//           enter as a unit and play each other; a "best score" board has no
//           coherent meaning for them, and a score-format team tournament can
//           never generate a bracket — it becomes a dead end nobody can start.
// ────────────────────────────────────────────────────────────

function randomInviteCode(): string {
  // Short, typeable, unambiguous (no 0/O/1/I) — this gets read aloud or typed
  // into a chat, not pasted from a link.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// R-TRN-10: prize pool = entries x fee x (1 - rake), split 60/25/10/5

/** How a prize pool is divided. Data, not a formula in a template. */
const PRIZE_TIERS: Array<{ place: string; pct: number }> = [
  { place: '1st', pct: 60 },
  { place: '2nd', pct: 25 },
  { place: '3rd', pct: 10 },
  { place: '4th+', pct: 5 },
];

export function distribute(poolPaise: number): TournamentPrizeShare[] {
  const pool = Math.max(0, Math.round(poolPaise));
  return PRIZE_TIERS.map((t) => ({
    place: t.place,
    pct: t.pct,
    amount_paise: Math.round((pool * t.pct) / 100),
  }));
}

@Injectable()
export class TournamentService {
  constructor(
    private readonly repo: TournamentRepository,
    private readonly groupsService: GroupsService,
    private readonly economy: EconomyService,
  ) {}

  /**
   * The three kinds shown in the UI, derived rather than stored (see the
   * docstring on Tournament.group_id) — OFFICIAL is any publisher-run
   * tournament, COMMUNITY is a player-run one scoped to a Group, and CASUAL
   * is everything else a player organizes.
   *
   * organizer_role is only reliable back to whenever it was added — every
   * tournament seeded before that field existed has none, which silently
   * misclassified every publisher-run seed tournament as Casual. Falling back
   * to the organizer's actual account role is what makes this correct for
   * rows old and new alike, not just newly-created ones.
   */
  private kindOf(t: { organizer: number; organizer_role?: string; group_id?: number }): 'official' | 'casual' | 'community' {
    const role = t.organizer_role ?? this.roleOf(t.organizer);
    if (role === 'publisher') return 'official';
    if (t.group_id != null) return 'community';
    return 'casual';
  }

  private roleOf(userId: number): string | undefined {
    const u = users.find((x) => Number(x.user_id) === Number(userId));
    if (!u) return undefined;
    return roles.find((r) => r.role_id === u.role_id)?.role_name;
  }

  findAll(filter?: { status?: string; gameId?: number; includePrivate?: boolean }) {
    let rows = filter?.status
      ? this.repo.findByStatus(filter.status)
      : filter?.gameId
        ? this.repo.findByGame(filter.gameId)
        : this.repo.findAll();

    // Public browse hides private tournaments by default — see the docstring
    // on Tournament.visibility. A caller that wants its own private ones back
    // (the organizer's own list) passes includePrivate=true explicitly.
    if (!filter?.includePrivate) {
      rows = rows.filter((t) => t.visibility !== 'private');
    }
    return rows.map((t) => this.enrich(t));
  }

  findOne(id: number) {
    const t = this.repo.findById(id);
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);
    return this.enrich(t);
  }

  create(dto: CreateTournamentDto) {
    const type = dto.type === 'multi' ? 'multi' : 'single';

    // R-TRN-10 — the two shapes are mutually exclusive, checked up front
    // before touching any game so the error names the right field.
    if (type === 'multi') {
      if (!dto.games || dto.games.length < 2) {
        throw new BadRequestException('A multi-game tournament needs at least 2 stages (games).');
      }
    } else if (!dto.game_id) {
      throw new BadRequestException('game_id is required for a single-game tournament.');
    }

    // R-TRN-12 — a team tournament is always a bracket. Rather than reject a
    // score request (the caller usually just left the default alone), coerce
    // it: the alternative is a tournament that validates fine and then can
    // never be started, which is exactly the dead end this rule exists to stop.
    if (dto.team_size && type === 'single') {
      dto.format = 'bracket';
    }

    // R-TRN-8 — every game involved must be approved and enabled, whether
    // it's the one game_id (single) or every stage's game_id (multi).
    const gameIdsToCheck = type === 'multi' ? dto.games!.map((g) => g.game_id) : [dto.game_id!];
    for (const gid of gameIdsToCheck) {
      const game = games.find((g) => g.game_id === gid);
      if (!game) throw new NotFoundException(`Game ${gid} not found`);
      if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
        throw new BadRequestException(`Tournament can only be created for active approved games (game ${gid} is not).`);
      }
    }

    // R-TRN-1
    if (this.repo.nameExists(dto.tournament_name)) {
      throw new ConflictException(`Tournament name "${dto.tournament_name}" already exists`);
    }

    // Community tournament: must belong to a real Group, and the organizer
    // must be that group's owner or an officer — this is the actual gate,
    // not organizer_role, which is just a display label. Throws 403/404 via
    // GroupsService's own checks if either is not true.
    if (dto.group_id != null) {
      this.groupsService.assertCanOrganize(dto.group_id, dto.organizer);
    }

    // R-TRN-2
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('start_date must be before or equal to end_date');
    }
    if (new Date(dto.regClose) > new Date(dto.start_date)) {
      throw new BadRequestException('Registration close date must be before or on start_date');
    }

    // Private tournaments are a subscriber feature. Advertised on both plans
    // and previously enforced nowhere — anyone could create one, so the perk
    // was decoration. Refused loudly rather than silently downgraded to public:
    // an organiser who wanted invite-only and quietly got a public bracket
    // would not find out until strangers turned up.
    if (dto.visibility === 'private' && !this.economy.canCreatePrivateTournament(dto.organizer)) {
      throw new ForbiddenException(
        'Private tournaments need a PlayCarys Pro subscription.',
      );
    }
    const visibility = dto.visibility === 'private' ? 'private' : 'public';

    const newId = this.repo.nextId();
    const tournament = this.repo.create({
      tournament_id: newId,
      // Multi-game: game_id is deliberately 0, never a real id — see the
      // docstring on Tournament.type in data/store.ts for why.
      game_id: type === 'multi' ? 0 : dto.game_id!,
      tournament_name: dto.tournament_name,
      desc: dto.desc,
      participants: 0,
      maxParticipants: dto.maxParticipants,
      status: 'upcoming',
      start_date: dto.start_date,
      end_date: dto.end_date,
      regClose: dto.regClose,
      // `prize` is now DERIVED from prize_pool_paise, never authored. It was
      // free text ("(0") that nothing funded and nothing could pay out.
      // A new tournament starts with an empty pool; it fills as entries are paid.
      prize: formatPaise(0),
      entry_fee_paise: Math.max(0, Math.trunc(Number((dto as any).entry_fee_paise) || 0)),
      entry_currency: 'INR',
      // Subscribers keep more of the pool for their entrants — 10% normally,
      // 6% on Pro, 3% on Pro+. Stored on the row at creation so a tournament's
      // economics cannot change under its players if the organiser's plan
      // lapses midway.
      rake_pct: this.economy.rakePctFor(dto.organizer),
      prize_pool_paise: 0,
      prize_distribution: distribute(0),
      organizer: dto.organizer,
      organizer_role: dto.organizer_role,
      type,
      visibility,
      invite_code: visibility === 'private' ? randomInviteCode() : undefined,
      group_id: dto.group_id,
      team_size: dto.team_size,
      // Single-game format/metric are only meaningful for type 'single' —
      // stored either way since they're harmless and cheap, but formatOf()
      // in tournament-play.service.ts only ever reads them for a single-game
      // tournament.
      format: dto.format,
      metric: dto.metric,
      direction: dto.direction,
      metric_label: dto.metric_label,
      metric_unit: dto.metric_unit,
    });

    if (type === 'multi') {
      dto.games!.forEach((g) => this.addStage(newId, g));
    }

    return this.enrich(tournament);
  }

  // ── Multi-game stages ─────────────────────────────────────

  listStages(tournamentId: number) {
    this.findOne(tournamentId); // 404s if the tournament doesn't exist
    return this.repo.getStages(tournamentId);
  }

  addStage(tournamentId: number, dto: CreateTournamentGameDto) {
    const t = this.repo.findById(tournamentId);
    if (!t) throw new NotFoundException(`Tournament ${tournamentId} not found`);
    if ((t.type ?? 'single') !== 'multi') {
      throw new BadRequestException('Stages can only be added to a multi-game tournament.');
    }
    // R-TRN-11
    if (t.status !== 'upcoming') {
      throw new BadRequestException('Stages can only be added before the tournament starts.');
    }

    const game = games.find((g) => g.game_id === dto.game_id);
    if (!game) throw new NotFoundException(`Game ${dto.game_id} not found`);
    if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
      throw new BadRequestException('A stage can only be added for an active approved game.');
    }

    const stage = this.repo.createStage({
      tournament_game_id: this.repo.nextStageId(),
      tournament_id: tournamentId,
      game_id: dto.game_id,
      stage_order: dto.stage_order,
      format: dto.format,
      metric: dto.metric,
      direction: dto.direction,
      metric_label: dto.metric_label,
      metric_unit: dto.metric_unit,
      points_weight: dto.points_weight ?? 1,
      status: 'pending',
    });
    return stage;
  }

  removeStage(tournamentId: number, tournamentGameId: number) {
    const t = this.repo.findById(tournamentId);
    if (!t) throw new NotFoundException(`Tournament ${tournamentId} not found`);
    // R-TRN-11
    if (t.status !== 'upcoming') {
      throw new BadRequestException('Stages can only be removed before the tournament starts.');
    }
    const stage = this.repo.findStage(tournamentGameId);
    if (!stage || stage.tournament_id !== tournamentId) {
      throw new NotFoundException(`Stage ${tournamentGameId} not found on this tournament`);
    }
    if ((this.repo.getStages(tournamentId).length) <= 2) {
      throw new BadRequestException('A multi-game tournament needs at least 2 stages — remove the whole tournament instead.');
    }
    this.repo.removeStage(tournamentGameId);
    return { message: `Stage ${tournamentGameId} removed` };
  }

  update(id: number, dto: UpdateTournamentDto) {
    const t = this.repo.findById(id);
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);

    // R-TRN-7
    if (t.status === 'completed') {
      throw new ForbiddenException('Completed tournaments cannot be modified');
    }

    // R-TRN-1
    if (dto.tournament_name && this.repo.nameExists(dto.tournament_name, id)) {
      throw new ConflictException(`Tournament name "${dto.tournament_name}" already exists`);
    }

    const nextStartDate = dto.start_date ?? t.start_date;
    const nextEndDate = dto.end_date ?? t.end_date;
    const nextRegClose = dto.regClose ?? t.regClose;
    if (new Date(nextStartDate) > new Date(nextEndDate)) {
      throw new BadRequestException('start_date must be before or equal to end_date');
    }
    if (new Date(nextRegClose) > new Date(nextStartDate)) {
      throw new BadRequestException('Registration close date must be before or on start_date');
    }

    if (dto.maxParticipants !== undefined) {
      const currentCount = this.repo.getRegistrations(id).length;
      if (dto.maxParticipants < currentCount) {
        throw new BadRequestException('maxParticipants cannot be lower than current registrations');
      }
    }

    const updated = this.repo.update(id, dto);
    return this.enrich(updated);
  }

  // Workflow: Register player for a tournament
  registerPlayer(tournamentId: number, dto: RegisterPlayerDto) {
    const t = this.repo.findById(tournamentId);
    if (!t) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    // R-TRN-3
    if (t.status !== 'upcoming') {
      throw new BadRequestException('Registration is only open for upcoming tournaments');
    }
    if (new Date() > new Date(t.regClose)) {
      throw new BadRequestException('Registration has closed for this tournament');
    }

    if (t.team_size) {
      throw new BadRequestException(
        `This is a team tournament — register a Team of ${t.team_size} via ` +
          `POST /teams/:id/register/${tournamentId}, not an individual player.`,
      );
    }

    // R-TRN-9
    if (t.visibility === 'private') {
      if (!dto.invite_code || dto.invite_code.toUpperCase() !== (t.invite_code ?? '').toUpperCase()) {
        throw new ForbiddenException('This is a private tournament. A valid invite code is required to join.');
      }
    }

    // R-TRN-6
    const profile = player_profiles.find((p) => p.user_id === dto.player_id);
    if (!profile) throw new NotFoundException(`Player profile ${dto.player_id} not found`);
    if (!profile.player_status) {
      throw new ForbiddenException('Your account is currently inactive and cannot join tournaments');
    }

    // R-TRN-4
    if (this.repo.isRegistered(dto.player_id, tournamentId)) {
      throw new ConflictException('Player is already registered for this tournament');
    }

    // R-TRN-5
    const currentCount = this.repo.getRegistrations(tournamentId).length;
    if (currentCount >= t.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    // R-TRN-9: a seat costs what the organiser said it costs.
    //
    // Simulated, like every INR flow here — but the transaction row is real,
    // so an entry can be refunded on withdrawal and the pool can be traced
    // back to the entries that funded it. The old schema recorded
    // tournament_entry transactions against a tournament that had no
    // entry-fee field at all: money left a pool that nothing filled.
    const fee = Number(t.entry_fee_paise) || 0;
    let entryTx: Transaction | null = null;
    if (fee > 0) {
      entryTx = this.economy.recordTransaction({
        user_id: dto.player_id,
        type: 'tournament_entry',
        amount_paise: fee,
        description: `Entry — ${t.tournament_name}`,
        ref_type: 'tournament',
        ref_id: tournamentId,
      });
      entryTx.status = 'completed';
    }

    this.repo.registerPlayer(dto.player_id, tournamentId);
    const participants = currentCount + 1;
    this.repo.update(tournamentId, { participants });
    this.recalculatePool(tournamentId, participants);

    return {
      message: 'Successfully registered for tournament',
      tournament_id: tournamentId,
      player_id: dto.player_id,
      charged: fee > 0 ? formatPaise(fee) : null,
      transaction: entryTx,
    };
  }

  /**
   * R-TRN-10: pool = entries x fee x (1 - rake), split 60/25/10/5.
   *
   * Materialised onto the row rather than computed in a template, so the
   * shares are data. The previous arrangement had a string prize on the row
   * and the split hardcoded in a page — which meant the numbers a player saw
   * were produced by whichever page they happened to be looking at.
   */
  private recalculatePool(tournamentId: number, participants: number): void {
    const t = this.repo.findById(tournamentId);
    if (!t) return;

    const fee = Number(t.entry_fee_paise) || 0;
    const rake = Number(t.rake_pct) || 0;
    const gross = fee * Math.max(0, participants);
    const pool = Math.round((gross * (100 - rake)) / 100);

    this.repo.update(tournamentId, {
      prize_pool_paise: pool,
      prize_distribution: distribute(pool),
      prize: formatPaise(pool),
    });
  }

  // Workflow: Unregister player from a tournament
  unregisterPlayer(tournamentId: number, playerId: number) {
    const t = this.repo.findById(tournamentId);
    if (!t) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    if (t.status !== 'upcoming') {
      throw new BadRequestException('Cannot withdraw from a tournament that has already started');
    }

    if (!this.repo.isRegistered(playerId, tournamentId)) {
      throw new BadRequestException('Player is not registered for this tournament');
    }

    // Withdrawing before the tournament starts refunds the entry. Registration
    // is only reversible while status is 'upcoming' (checked above), so this
    // cannot refund a seat in an event already under way.
    const fee = Number(t.entry_fee_paise) || 0;
    let refund: Transaction | null = null;
    if (fee > 0) {
      refund = this.economy.recordTransaction({
        user_id: playerId,
        type: 'tournament_entry',
        amount_paise: fee,
        description: `Refund — ${t.tournament_name}`,
        ref_type: 'tournament',
        ref_id: tournamentId,
      });
      refund.status = 'refunded';
    }

    this.repo.unregisterPlayer(playerId, tournamentId);
    const remaining = this.repo.getRegistrations(tournamentId).length;
    this.repo.update(tournamentId, { participants: remaining });
    this.recalculatePool(tournamentId, remaining);

    return {
      message: 'Successfully unregistered from tournament',
      refunded: fee > 0 ? formatPaise(fee) : null,
      transaction: refund,
    };
  }

  getRegistrations(tournamentId: number) {
    const t = this.repo.findById(tournamentId);
    if (!t) throw new NotFoundException(`Tournament ${tournamentId} not found`);
    return this.repo.getRegistrations(tournamentId);
  }

  getPlayerTournaments(playerId: number) {
    return this.repo.getPlayerTournaments(playerId).map((pt) => {
      const t = this.repo.findById(pt.tournament_id);
      return t ? this.enrich(t) : null;
    }).filter(Boolean);
  }

  remove(id: number) {
    const t = this.repo.findById(id);
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);
    if (t.status === 'in-progress') {
      throw new ForbiddenException('Cannot delete a tournament that is in progress');
    }
    // Stages belong to their tournament — deleting one without the other
    // leaves orphaned TournamentGame rows nothing ever cleans up.
    this.repo.getStages(id).forEach((s) => this.repo.removeStage(s.tournament_game_id));
    // Same for a team tournament's entries — otherwise a deleted tournament's
    // id, once reused, silently inherits teams that were never re-registered.
    for (let i = team_tournament.length - 1; i >= 0; i--) {
      if (team_tournament[i].tournament_id === id) team_tournament.splice(i, 1);
    }
    this.repo.removeAllRegistrations(id);
    this.repo.remove(id);
    return { message: `Tournament ${id} removed` };
  }

  private enrich(t: any) {
    // Team tournaments register Teams via team_tournament, never individual
    // players via player_tournament — that table stays empty for one of these,
    // so counting from it would show every team tournament as permanently empty.
    const registeredEntrantIds: (number | string)[] = t.team_size
      ? team_tournament.filter((r) => r.tournament_id === t.tournament_id).map((r) => r.team_id)
      : this.repo.getRegistrations(t.tournament_id).map((r) => r.player_id);

    // Money, rendered once here rather than in each template. The prize used
    // to be a bare string on the row and the 60/25/10 split was hardcoded in a
    // page, so the figures a player saw depended on which page they opened.
    const pool = Number(t.prize_pool_paise) || 0;
    const fee = Number(t.entry_fee_paise) || 0;

    const base = {
      kind: this.kindOf(t),
      entry_fee_paise: fee,
      entry_fee_display: fee > 0 ? formatPaise(fee) : 'Free',
      prize_pool_paise: pool,
      prize_pool_display: formatPaise(pool),
      prize_distribution: (t.prize_distribution || distribute(pool)).map(
        (sh: TournamentPrizeShare) => ({ ...sh, amount_display: formatPaise(sh.amount_paise) }),
      ),
      participants: registeredEntrantIds.length,
      registered_player_ids: t.team_size ? [] : registeredEntrantIds,
      registered_team_ids: t.team_size ? registeredEntrantIds : undefined,
      registered_teams: t.team_size
        ? registeredEntrantIds.map((id) => {
            const team = teams.find((x) => Number(x.team_id) === Number(id));
            return { team_id: id, name: team?.name ?? 'Unknown Team' };
          })
        : undefined,
    };

    const isMulti = (t.type ?? 'single') === 'multi';
    if (isMulti) {
      const stages = this.repo.getStages(t.tournament_id);
      return {
        ...t,
        ...base,
        // A multi-game tournament has no single game_name — list every stage's
        // game instead, in play order, so a browse listing can still show
        // something meaningful ("FIFA -> Valorant -> Racing") without a
        // second round trip.
        game_name: 'Multi-Game',
        stage_games: stages.map((s) => ({
          stage_order: s.stage_order,
          game_id: s.game_id,
          game_name: games.find((g) => g.game_id === s.game_id)?.game_name ?? 'Unknown',
          format: s.format,
          status: s.status,
        })),
      };
    }

    const game = games.find((g) => g.game_id === t.game_id);
    return {
      ...t,
      ...base,
      game_name: game?.game_name ?? 'Unknown',
    };
  }
}
