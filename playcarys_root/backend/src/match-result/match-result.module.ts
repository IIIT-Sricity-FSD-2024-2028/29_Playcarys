import { Module } from '@nestjs/common';
import { MatchResultController } from './match-result.controller';
import { MatchResultService } from './match-result.service';
import { MatchResultRepository } from './match-result.repository';

@Module({
  controllers: [MatchResultController],
  providers: [MatchResultService, MatchResultRepository],
  exports: [MatchResultService, MatchResultRepository],
})
export class MatchResultModule {}
