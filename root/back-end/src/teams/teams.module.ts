import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamsRepository } from './teams.repository';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
