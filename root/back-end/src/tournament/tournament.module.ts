import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentRepository } from './tournament.repository';
import { EconomyModule } from '../economy/economy.module';
import { GroupsModule } from '../groups/groups.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [EconomyModule, GroupsModule, TeamsModule],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService, TournamentRepository],
})
export class TournamentModule {}
