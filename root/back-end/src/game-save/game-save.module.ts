import { Module } from '@nestjs/common';
import { GameSaveController } from './game-save.controller';
import { GameSaveService } from './game-save.service';

/**
 * Per-game save storage, kept separate from GameModule on purpose.
 *
 * GameModule is about a game's LISTING — publishing, review, bundles, approval.
 * This is about one player's state inside one game, which has a different
 * owner (the game, not the platform), a different lifetime, and a different
 * access rule.
 */
@Module({
  controllers: [GameSaveController],
  providers: [GameSaveService],
  exports: [GameSaveService],
})
export class GameSaveModule {}
