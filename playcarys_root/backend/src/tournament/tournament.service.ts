import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { CreateTournamentDto, UpdateTournamentDto, RegisterPlayerDto } from './tournament.dto';
import { games, player_profiles } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-TRN-1: tournament_name must be unique
// R-TRN-2: start_date must be <= end_date; regClose must be <= start_date
// R-TRN-3: Registration only allowed for upcoming tournaments before regClose
// R-TRN-4: A player cannot register twice for the same tournament
// R-TRN-5: Tournament cannot exceed maxParticipants
// R-TRN-6: Only players with player_status=true can register
// R-TRN-7: A completed tournament cannot be updated
// R-TRN-8: The game linked must be approved and enabled
// ────────────────────────────────────────────────────────────

@Injectable()
export class TournamentService {
  constructor(private readonly repo: TournamentRepository) {}

  findAll(filter?: { status?: string; gameId?: number }) {
    if (filter?.status) return this.repo.findByStatus(filter.status);
    if (filter?.gameId) return this.repo.findByGame(filter.gameId);
    return this.repo.findAll();
  }

  findOne(id: number) {
    const t = this.repo.findById(id);
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);
    return this.enrich(t);
  }

  create(dto: CreateTournamentDto) {
    // R-TRN-8
    const game = games.find((g) => g.game_id === dto.game_id);
    if (!game) throw new NotFoundException(`Game ${dto.game_id} not found`);
    if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
      throw new BadRequestException('Tournament can only be created for active approved games');
    }

    // R-TRN-1
    if (this.repo.nameExists(dto.tournament_name)) {
      throw new ConflictException(`Tournament name "${dto.tournament_name}" already exists`);
    }

    // R-TRN-2
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('start_date must be before or equal to end_date');
    }
    if (new Date(dto.regClose) > new Date(dto.start_date)) {
      throw new BadRequestException('Registration close date must be before or on start_date');
    }

    const newId = this.repo.nextId();
    const tournament = this.repo.create({
      tournament_id: newId,
      game_id: dto.game_id,
      tournament_name: dto.tournament_name,
      desc: dto.desc,
      participants: 0,
      maxParticipants: dto.maxParticipants,
      status: 'upcoming',
      start_date: dto.start_date,
      end_date: dto.end_date,
      regClose: dto.regClose,
      prize: dto.prize,
      organizer: dto.organizer,
    });

    return this.enrich(tournament);
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

    this.repo.registerPlayer(dto.player_id, tournamentId);
    this.repo.update(tournamentId, { participants: currentCount + 1 });

    return { message: 'Successfully registered for tournament', tournament_id: tournamentId, player_id: dto.player_id };
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

    this.repo.unregisterPlayer(playerId, tournamentId);
    const remaining = this.repo.getRegistrations(tournamentId).length;
    this.repo.update(tournamentId, { participants: remaining });

    return { message: 'Successfully unregistered from tournament' };
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
    this.repo.remove(id);
    return { message: `Tournament ${id} removed` };
  }

  private enrich(t: any) {
    const registrations = this.repo.getRegistrations(t.tournament_id);
    const game = games.find((g) => g.game_id === t.game_id);
    return {
      ...t,
      participants: registrations.length,
      registered_player_ids: registrations.map((r) => r.player_id),
      game_name: game?.game_name ?? 'Unknown',
    };
  }
}
