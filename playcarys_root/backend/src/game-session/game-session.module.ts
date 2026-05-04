import { Module } from '@nestjs/common';
import { GameSessionController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { GameSessionRepository } from './game-session.repository';
import { GameGateway } from './game.gateway';

@Module({
  controllers: [GameSessionController],
  providers: [GameSessionService, GameSessionRepository, GameGateway],
  exports: [GameSessionService, GameSessionRepository, GameGateway],
})
export class GameSessionModule {}
