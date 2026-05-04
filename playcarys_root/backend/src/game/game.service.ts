import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GameRepository } from './game.repository';
import { CreateGameDto, UpdateGameDto, SetGameStateDto, ApproveGameDto } from './game.dto';
import { publisher_profiles, sessions, users } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-GAME-1: game_name must be unique across the platform
// R-GAME-2: A newly submitted game starts with approval_status='pending', game_status='disabled'
// R-GAME-3: Only the owning publisher can update or change the state of their game
// R-GAME-4: A game can only be enabled if it is already approved
// R-GAME-5: Approving a game auto-increments the publisher's approved_games count
// R-GAME-6: Only approved games appear in the active game list for players
// R-GAME-7: A game with active sessions cannot be deleted
// ────────────────────────────────────────────────────────────

@Injectable()
export class GameService {
  constructor(private readonly gameRepo: GameRepository) {}

  findAll(filter?: { status?: string; publisherId?: number; active?: boolean }) {
    if (filter?.active) return this.gameRepo.findActive();
    if (filter?.publisherId) return this.gameRepo.findByPublisher(filter.publisherId);
    if (filter?.status) return this.gameRepo.findByStatus(filter.status);
    return this.gameRepo.findAll();
  }

  findOne(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }

  // Workflow: Publish Game
  create(dto: CreateGameDto) {
    // Validate publisher exists and has role 5
    const publisher = users.find(
      (u) => u.user_id === dto.game_publisher && u.role_id === 5,
    );
    if (!publisher) {
      throw new BadRequestException(`User ${dto.game_publisher} is not a registered publisher`);
    }

    // R-GAME-1
    if (this.gameRepo.nameExists(dto.game_name)) {
      throw new ConflictException(`Game name "${dto.game_name}" is already taken`);
    }

    const newId = this.gameRepo.nextId();

    // R-GAME-2: new games start as pending + disabled
    const game = this.gameRepo.create({
      game_id: newId,
      game_name: dto.game_name,
      game_type: dto.game_type,
      game_status: 'disabled',
      game_approval_status: 'pending',
      game_publisher: dto.game_publisher,
      desc: dto.desc,
      players: dto.players,
      img: dto.img ?? '',
      rating: 0,
      views: 0,
      submittedDate: new Date().toISOString().split('T')[0],
      sessions: 0,
    });

    // Increment publisher total_games
    const pubProfile = publisher_profiles.find((p) => p.user_id === dto.game_publisher);
    if (pubProfile) pubProfile.total_games += 1;

    return game;
  }

  // Workflow: Update Game metadata (publisher only)
  update(id: number, dto: UpdateGameDto, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    // R-GAME-3
    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only update your own games');
    }

    // R-GAME-1
    if (dto.game_name && this.gameRepo.nameExists(dto.game_name, id)) {
      throw new ConflictException(`Game name "${dto.game_name}" is already taken`);
    }

    return this.gameRepo.update(id, dto);
  }

  // Workflow: Set Game State (publisher)
  setGameState(id: number, dto: SetGameStateDto, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    // R-GAME-3
    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only change the state of your own games');
    }

    // R-GAME-4: cannot enable a game that is not approved
    if (dto.game_status === 'enabled' && game.game_approval_status !== 'approved') {
      throw new BadRequestException('Game must be approved before it can be enabled');
    }

    const updated = this.gameRepo.update(id, { game_status: dto.game_status });

    // Recalculate publisher active_games count
    const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
    if (pubProfile) {
      const publisherGames = this.gameRepo.findByPublisher(game.game_publisher);
      pubProfile.active_games = publisherGames.filter(
        (g) => g.game_approval_status === 'approved' && g.game_status === 'enabled',
      ).length;
    }

    return updated;
  }

  // Workflow: Approve Game Listing (admin)
  approveGame(id: number, dto: ApproveGameDto) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    if (game.game_approval_status !== 'pending') {
      throw new BadRequestException('Only pending games can be approved or rejected');
    }

    const updated = this.gameRepo.update(id, {
      game_approval_status: dto.game_approval_status,
      // R-GAME-5: auto-enable on approval
      game_status: dto.game_approval_status === 'approved' ? 'enabled' : 'disabled',
    });

    // R-GAME-5: sync publisher profile counters
    if (dto.game_approval_status === 'approved') {
      const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
      if (pubProfile) {
        pubProfile.approved_games += 1;
        pubProfile.active_games += 1;
      }
    }

    return updated;
  }

  remove(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    const hasActiveSessions = sessions.some(
      (session) => session.game_id === id && session.status !== 'ended',
    );
    if (hasActiveSessions) {
      throw new BadRequestException('Games with active sessions cannot be removed');
    }

    this.gameRepo.remove(id);

    // Decrement publisher total_games
    const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
    if (pubProfile) {
      pubProfile.total_games = Math.max(0, pubProfile.total_games - 1);
      if (game.game_approval_status === 'approved') {
        pubProfile.approved_games = Math.max(0, pubProfile.approved_games - 1);
      }
      if (game.game_status === 'enabled') {
        pubProfile.active_games = Math.max(0, pubProfile.active_games - 1);
      }
    }

    return { message: `Game ${id} removed` };
  }
}
