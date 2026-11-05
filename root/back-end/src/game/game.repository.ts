import { Injectable } from '@nestjs/common';
import { games, deleted_games, Game } from '../data/store';

@Injectable()
export class GameRepository {
  findAll(): Game[] {
    return [...games];
  }

  findById(game_id: number): Game | undefined {
    return games.find((g) => g.game_id === game_id);
  }

  findByPublisher(publisher_id: number): Game[] {
    return games.filter((g) => Number(g.game_publisher ?? (g as any).publisherId) === Number(publisher_id));
  }

  findByStatus(game_approval_status: string): Game[] {
    const s = String(game_approval_status).toLowerCase();
    return games.filter((g) =>
      String(g.game_approval_status || (g as any).status || '').toLowerCase() === s,
    );
  }

  findActive(): Game[] {
    return games.filter(
      (g) => g.game_approval_status === 'approved' && g.game_status === 'enabled',
    );
  }

  nameExists(game_name: string, excludeId?: number): boolean {
    return games.some(
      (g) => g.game_name.toLowerCase() === game_name.toLowerCase() && g.game_id !== excludeId,
    );
  }

  create(game: Game): Game {
    games.push(game);
    return game;
  }

  update(game_id: number, partial: Partial<Game>): Game | undefined {
    const idx = games.findIndex((g) => g.game_id === game_id);
    if (idx === -1) return undefined;
    Object.assign(games[idx], partial);
    return games[idx];
  }

  remove(game_id: number): boolean {
    const idx = games.findIndex((g) => g.game_id === game_id);
    if (idx === -1) return false;
    games.splice(idx, 1);
    return true;
  }

  nextId(): number {
    const fromGames = games.map((g) => Number(g.game_id) || 0);
    const fromDeleted = (deleted_games || []).map((d) =>
      Number(d && typeof d === 'object' ? d.game_id ?? d.id : d) || 0,
    );
    const all = [...fromGames, ...fromDeleted];
    return all.length === 0 ? 1 : Math.max(...all) + 1;
  }
}
