import { Module } from '@nestjs/common';
import { TournamentPlayController } from './tournament-play.controller';
import { TournamentPlayService } from './tournament-play.service';

/**
 * Playing a tournament, as opposed to listing one.
 *
 * TournamentModule owns creation, editing and registration. This owns what
 * happens after it starts: leaderboards, brackets, match tokens and results —
 * the parts that moved off the client so they cannot be forged by editing a
 * local copy and syncing it.
 */
@Module({
  controllers: [TournamentPlayController],
  providers: [TournamentPlayService],
  exports: [TournamentPlayService],
})
export class TournamentPlayModule {}
