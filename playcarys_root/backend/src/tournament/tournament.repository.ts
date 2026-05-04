import { Injectable } from '@nestjs/common';
import {
  tournaments,
  Tournament,
  player_tournament,
  PlayerTournament,
} from '../data/store';

@Injectable()
export class TournamentRepository {
  findAll(): Tournament[] {
    return [...tournaments];
  }

  findById(tournament_id: number): Tournament | undefined {
    return tournaments.find((t) => t.tournament_id === tournament_id);
  }

  findByGame(game_id: number): Tournament[] {
    return tournaments.filter((t) => t.game_id === game_id);
  }

  findByStatus(status: string): Tournament[] {
    return tournaments.filter((t) => t.status === status);
  }

  nameExists(name: string, excludeId?: number): boolean {
    return tournaments.some(
      (t) =>
        t.tournament_name.toLowerCase() === name.toLowerCase() &&
        t.tournament_id !== excludeId,
    );
  }

  create(tournament: Tournament): Tournament {
    tournaments.push(tournament);
    return tournament;
  }

  update(tournament_id: number, partial: Partial<Tournament>): Tournament | undefined {
    const idx = tournaments.findIndex((t) => t.tournament_id === tournament_id);
    if (idx === -1) return undefined;
    Object.assign(tournaments[idx], partial);
    return tournaments[idx];
  }

  remove(tournament_id: number): boolean {
    const idx = tournaments.findIndex((t) => t.tournament_id === tournament_id);
    if (idx === -1) return false;
    tournaments.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return tournaments.length === 0
      ? 1
      : Math.max(...tournaments.map((t) => t.tournament_id)) + 1;
  }

  // Junction table ops
  getRegistrations(tournament_id: number): PlayerTournament[] {
    return player_tournament.filter((pt) => pt.tournament_id === tournament_id);
  }

  isRegistered(player_id: number, tournament_id: number): boolean {
    return player_tournament.some(
      (pt) => pt.player_id === player_id && pt.tournament_id === tournament_id,
    );
  }

  registerPlayer(player_id: number, tournament_id: number): PlayerTournament {
    const entry = { player_id, tournament_id };
    player_tournament.push(entry);
    return entry;
  }

  unregisterPlayer(player_id: number, tournament_id: number): boolean {
    const idx = player_tournament.findIndex(
      (pt) => pt.player_id === player_id && pt.tournament_id === tournament_id,
    );
    if (idx === -1) return false;
    player_tournament.splice(idx, 1);
    return true;
  }

  getPlayerTournaments(player_id: number): PlayerTournament[] {
    return player_tournament.filter((pt) => pt.player_id === player_id);
  }
}
