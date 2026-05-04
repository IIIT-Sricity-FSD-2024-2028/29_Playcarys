import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { PlayerProfileModule } from './player-profile/player-profile.module';
import { PublisherProfileModule } from './publisher-profile/publisher-profile.module';
import { GameModule } from './game/game.module';
import { TournamentModule } from './tournament/tournament.module';
import { GameSessionModule } from './game-session/game-session.module';
import { MatchResultModule } from './match-result/match-result.module';
import { ReportModule } from './report/report.module';
import { ModeratorActionModule } from './moderator-action/moderator-action.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    UsersModule,
    PlayerProfileModule,
    PublisherProfileModule,
    GameModule,
    TournamentModule,
    GameSessionModule,
    MatchResultModule,
    ReportModule,
    ModeratorActionModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
