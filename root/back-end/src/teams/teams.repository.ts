import { Injectable } from '@nestjs/common';
import { teams, Team, team_tournament, TeamTournament } from '../data/store';

@Injectable()
export class TeamsRepository {
  findAll(): Team[] {
    return [...teams];
  }

  findById(team_id: number): Team | undefined {
    return teams.find((t) => t.team_id === team_id);
  }

  findForPlayer(player_id: number): Team[] {
    return teams.filter((t) => t.member_ids.includes(player_id));
  }

  create(team: Team): Team {
    teams.push(team);
    return team;
  }

  update(team_id: number, partial: Partial<Team>): Team | undefined {
    const idx = teams.findIndex((t) => t.team_id === team_id);
    if (idx === -1) return undefined;
    Object.assign(teams[idx], partial);
    return teams[idx];
  }

  remove(team_id: number): boolean {
    const idx = teams.findIndex((t) => t.team_id === team_id);
    if (idx === -1) return false;
    teams.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return teams.length === 0 ? 1 : Math.max(...teams.map((t) => t.team_id)) + 1;
  }

  // ── Tournament entry (team_tournament junction) ─────────────

  isRegistered(team_id: number, tournament_id: number): boolean {
    return team_tournament.some(
      (r) => r.team_id === team_id && r.tournament_id === tournament_id,
    );
  }

  getEntrants(tournament_id: number): TeamTournament[] {
    return team_tournament.filter((r) => r.tournament_id === tournament_id);
  }

  register(team_id: number, tournament_id: number): TeamTournament {
    const existing = team_tournament.find(
      (r) => r.team_id === team_id && r.tournament_id === tournament_id,
    );
    if (existing) return existing;
    const entry = { team_id, tournament_id };
    team_tournament.push(entry);
    return entry;
  }

  unregister(team_id: number, tournament_id: number): boolean {
    let removed = false;
    for (let i = team_tournament.length - 1; i >= 0; i--) {
      if (
        team_tournament[i].team_id === team_id &&
        team_tournament[i].tournament_id === tournament_id
      ) {
        team_tournament.splice(i, 1);
        removed = true;
      }
    }
    return removed;
  }
}
