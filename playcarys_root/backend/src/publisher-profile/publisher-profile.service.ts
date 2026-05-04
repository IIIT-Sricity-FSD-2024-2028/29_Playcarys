import { Injectable, NotFoundException } from '@nestjs/common';
import { PublisherProfileRepository } from './publisher-profile.repository';
import { games } from '../data/store';

@Injectable()
export class PublisherProfileService {
  constructor(private readonly repo: PublisherProfileRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findOne(userId: number) {
    const profile = this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(`Publisher profile for user ${userId} not found`);

    // Enrich with live game stats computed from games[]
    const myGames = games.filter((g) => g.game_publisher === userId);
    return {
      ...profile,
      total_games: myGames.length,
      approved_games: myGames.filter((g) => g.game_approval_status === 'approved').length,
      active_games: myGames.filter(
        (g) => g.game_approval_status === 'approved' && g.game_status === 'enabled',
      ).length,
    };
  }

  // Used internally by game module after approval/publish
  recalculate(userId: number) {
    const myGames = games.filter((g) => g.game_publisher === userId);
    this.repo.update(userId, {
      total_games: myGames.length,
      approved_games: myGames.filter((g) => g.game_approval_status === 'approved').length,
      active_games: myGames.filter(
        (g) => g.game_approval_status === 'approved' && g.game_status === 'enabled',
      ).length,
    });
  }
}
