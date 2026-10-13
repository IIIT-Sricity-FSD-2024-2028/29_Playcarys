import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { CreateTeamDto, AddTeamMemberDto } from './teams.dto';
import { tournaments, users, Team } from '../data/store';

// ── Domain rules ────────────────────────────────────────────
// R-TEAM-1: A team's captain is always a member; removing the captain from
//           the roster is a captain transfer, not a plain member removal.
// R-TEAM-2: Only the captain may add/remove members or delete the team.
// R-TEAM-3: A team may register for a tournament only once its roster size
//           matches that tournament's team_size exactly — a 4-of-5 roster
//           cannot quietly play a man short.
// ────────────────────────────────────────────────────────────

@Injectable()
export class TeamsService {
  constructor(private readonly repo: TeamsRepository) {}

  private teamOrThrow(team_id: number): Team {
    const t = this.repo.findById(team_id);
    if (!t) throw new NotFoundException(`Team ${team_id} not found`);
    return t;
  }

  private captainOnly(team: Team, requesterId: number) {
    if (Number(team.captain_id) !== Number(requesterId)) {
      throw new ForbiddenException('Only the team captain can do that.');
    }
  }

  findAll() {
    return this.repo.findAll().map((t) => this.enrich(t));
  }

  findOne(team_id: number) {
    return this.enrich(this.teamOrThrow(team_id));
  }

  findForPlayer(player_id: number) {
    return this.repo.findForPlayer(player_id).map((t) => this.enrich(t));
  }

  private enrich(t: Team) {
    return {
      ...t,
      members: t.member_ids.map((id) => {
        const u = users.find((x) => Number(x.user_id) === Number(id));
        return { user_id: id, user_name: u?.user_name ?? `Player ${id}`, avatar: u?.avatar ?? '??' };
      }),
    };
  }

  create(dto: CreateTeamDto) {
    if (!users.some((u) => Number(u.user_id) === Number(dto.captain_id))) {
      throw new NotFoundException(`User ${dto.captain_id} not found`);
    }
    const member_ids = Array.from(
      new Set([dto.captain_id, ...(dto.member_ids ?? [])].map((n) => Number(n))),
    );
    const team: Team = {
      team_id: this.repo.nextId(),
      name: dto.name,
      captain_id: Number(dto.captain_id),
      member_ids,
      created_at: new Date().toISOString(),
    };
    this.repo.create(team);
    return this.enrich(team);
  }

  addMember(team_id: number, dto: AddTeamMemberDto, requesterId: number) {
    const team = this.teamOrThrow(team_id);
    this.captainOnly(team, requesterId);
    if (!users.some((u) => Number(u.user_id) === Number(dto.user_id))) {
      throw new NotFoundException(`User ${dto.user_id} not found`);
    }
    if (team.member_ids.includes(Number(dto.user_id))) {
      throw new BadRequestException('Already on this team.');
    }
    const member_ids = [...team.member_ids, Number(dto.user_id)];
    this.repo.update(team_id, { member_ids });
    return this.enrich({ ...team, member_ids });
  }

  removeMember(team_id: number, userId: number, requesterId: number) {
    const team = this.teamOrThrow(team_id);
    this.captainOnly(team, requesterId);
    if (Number(userId) === Number(team.captain_id)) {
      throw new BadRequestException(
        'The captain cannot be removed — delete the team or transfer captaincy first.',
      );
    }
    const member_ids = team.member_ids.filter((id) => Number(id) !== Number(userId));
    this.repo.update(team_id, { member_ids });
    return this.enrich({ ...team, member_ids });
  }

  remove(team_id: number, requesterId: number) {
    const team = this.teamOrThrow(team_id);
    this.captainOnly(team, requesterId);
    this.repo.remove(team_id);
    return { message: `Team ${team_id} removed` };
  }

  // ── Tournament entry ─────────────────────────────────────────

  registerForTournament(team_id: number, tournament_id: number, requesterId: number) {
    const team = this.teamOrThrow(team_id);
    this.captainOnly(team, requesterId);

    const t = tournaments.find((x) => x.tournament_id === tournament_id);
    if (!t) throw new NotFoundException(`Tournament ${tournament_id} not found`);
    if (!t.team_size) {
      throw new BadRequestException('This tournament is not team-based.');
    }
    if (team.member_ids.length !== t.team_size) {
      throw new BadRequestException(
        `This tournament needs teams of exactly ${t.team_size} — ${team.name} has ${team.member_ids.length}.`,
      );
    }
    if (this.repo.isRegistered(team_id, tournament_id)) {
      throw new BadRequestException('This team is already registered.');
    }
    if ((t.participants ?? 0) >= t.maxParticipants) {
      throw new BadRequestException('Tournament is full.');
    }

    this.repo.register(team_id, tournament_id);
    t.participants = (t.participants ?? 0) + 1;
    return { message: `${team.name} registered for ${t.tournament_name}` };
  }

  /**
   * Withdraw a team from a tournament. The register half of this shipped
   * without it, so a team that entered could never leave — the UI had a
   * Withdraw button with no endpoint behind it.
   *
   * Same window rule as the solo path (TournamentService.unregisterPlayer):
   * you may leave while it is still 'upcoming', not once it has started.
   */
  unregisterFromTournament(team_id: number, tournament_id: number, requesterId: number) {
    const team = this.teamOrThrow(team_id);
    this.captainOnly(team, requesterId);

    const t = tournaments.find((x) => x.tournament_id === tournament_id);
    if (!t) throw new NotFoundException(`Tournament ${tournament_id} not found`);
    if (t.status !== 'upcoming') {
      throw new BadRequestException('Cannot withdraw from a tournament that has already started.');
    }
    if (!this.repo.isRegistered(team_id, tournament_id)) {
      throw new BadRequestException('This team is not registered for that tournament.');
    }

    this.repo.unregister(team_id, tournament_id);
    t.participants = Math.max(0, (t.participants ?? 1) - 1);
    return { message: `${team.name} withdrawn from ${t.tournament_name}` };
  }
}
