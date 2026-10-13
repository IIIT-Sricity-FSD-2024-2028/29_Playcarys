import { Injectable } from '@nestjs/common';
import {
  tournaments,
  Tournament,
  player_tournament,
  PlayerTournament,
  tournament_games,
  TournamentGame,
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

  /**
   * Drop every registration for a deleted tournament. Without this, a
   * tournament_id that gets reused (ids are just "highest + 1") silently
   * inherits registrations from whatever was deleted under that same id —
   * hit twice for real in testing this session, once with player_tournament
   * and once with the team equivalent.
   */
  removeAllRegistrations(tournament_id: number): void {
    for (let i = player_tournament.length - 1; i >= 0; i--) {
      if (player_tournament[i].tournament_id === tournament_id) player_tournament.splice(i, 1);
    }
  }

  // ── Multi-game stages (TournamentGame) ───────────────────────

  getStages(tournament_id: number): TournamentGame[] {
    return tournament_games
      .filter((g) => g.tournament_id === tournament_id)
      .sort((a, b) => a.stage_order - b.stage_order);
  }

  findStage(tournament_game_id: number): TournamentGame | undefined {
    return tournament_games.find((g) => g.tournament_game_id === tournament_game_id);
  }

  createStage(stage: TournamentGame): TournamentGame {
    tournament_games.push(stage);
    return stage;
  }

  updateStage(tournament_game_id: number, partial: Partial<TournamentGame>): TournamentGame | undefined {
    const idx = tournament_games.findIndex((g) => g.tournament_game_id === tournament_game_id);
    if (idx === -1) return undefined;
    Object.assign(tournament_games[idx], partial);
    return tournament_games[idx];
  }

  removeStage(tournament_game_id: number): boolean {
    const idx = tournament_games.findIndex((g) => g.tournament_game_id === tournament_game_id);
    if (idx === -1) return false;
    tournament_games.splice(idx, 1);
    return true;
  }

  nextStageId(): number {
    return tournament_games.length === 0
      ? 1
      : Math.max(...tournament_games.map((g) => g.tournament_game_id)) + 1;
  }
}
