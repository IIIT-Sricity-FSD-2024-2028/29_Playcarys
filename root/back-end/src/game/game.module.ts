import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { BundleService } from './bundle.service';
import { ScanService } from './scan.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameRepository, BundleService, ScanService],
  exports: [GameService, GameRepository, BundleService, ScanService],
})
export class GameModule {}
