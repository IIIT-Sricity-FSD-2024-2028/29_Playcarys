import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';

@Module({
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService, TournamentRepository],
})
export class TournamentModule {}
