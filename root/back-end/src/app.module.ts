import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { UsersController } from './users/users.controller';
import { PlayerProfileModule } from './player-profile/player-profile.module';
import { PublisherProfileModule } from './publisher-profile/publisher-profile.module';
import { GameModule } from './game/game.module';
import { AchievementModule } from './achievement/achievement.module';
import { TournamentModule } from './tournament/tournament.module';
import { GameSessionModule } from './game-session/game-session.module';
import { MatchResultModule } from './match-result/match-result.module';
import { ReportModule } from './report/report.module';
import { ModeratorActionModule } from './moderator-action/moderator-action.module';
import { ModeratorActionController } from './moderator-action/moderator-action.controller';
import { NotificationModule } from './notification/notification.module';
import { SocialModule } from './social/social.module';
import { GameSaveModule } from './game-save/game-save.module';
import { TournamentPlayModule } from './tournament-play/tournament-play.module';
import { TeamsModule } from './teams/teams.module';
import { GroupsModule } from './groups/groups.module';
import { LinkedAccountsModule } from './linked-accounts/linked-accounts.module';
import { EconomyModule } from './economy/economy.module';
import { LoggingModule } from './logging/logging.module';
import { RequestLoggerMiddleware } from './logging/request-logger.middleware';
import { SecurityHeadersMiddleware } from './logging/security-headers.middleware';
import { RateLimitMiddleware } from './logging/rate-limit.middleware';
import { AuditMiddleware } from './logging/audit.middleware';
import { CorrelationIdMiddleware } from './logging/correlation-id.middleware';
import { UserRateLimitMiddleware } from './logging/user-rate-limit.middleware';
import { CompressionMiddleware } from './logging/compression.middleware';
import { IdempotencyMiddleware } from './logging/idempotency.middleware';

@Module({
  imports: [
    LoggingModule,
    AuthModule,
    RolesModule,
    UsersModule,
    PlayerProfileModule,
    PublisherProfileModule,
    GameModule,
    AchievementModule,
    TournamentModule,
    GameSessionModule,
    MatchResultModule,
    ReportModule,
    ModeratorActionModule,
    NotificationModule,
    SocialModule,
    GameSaveModule,
    TournamentPlayModule,
    TeamsModule,
    GroupsModule,
    LinkedAccountsModule,
    // Carys + INR: the shop, subscriptions, tournament entry fees and the
    // publisher payout pipeline. Six of its tables were already on disk with
    // no code reading them; this is what finally owns them.
    EconomyModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // ── Global (every route) ────────────────────────────────
    // Order matters: CorrelationId runs FIRST so every later middleware
    // and filter can read req.requestId. SecurityHeaders runs second so
    // a rejected-downstream request still carries them. RequestLogger
    // runs third so its duration measurement covers everything after it.
    // Compression runs last in the global chain: it wraps res.send, so
    // it must be in place before any handler produces a response.
    // '{*splat}' (not bare '*', not '*path'): this app runs on Express 5
    // (path-to-regexp v8), which dropped the old bare-wildcard syntax and
    // requires a named, braced wildcard segment.
    consumer
      .apply(
        CorrelationIdMiddleware,
        SecurityHeadersMiddleware,
        RequestLoggerMiddleware,
        CompressionMiddleware,
      )
      .forRoutes('{*splat}');

    // ── Scoped: anonymous IP rate limiting ──────────────────────
    // ONLY the brute-forceable/spammable routes — login, register, the two
    // password-reset steps, and the bundle upload. Everywhere else (game
    // browsing, the frontend's poll/heartbeat traffic) is deliberately left
    // alone; see rate-limit.middleware.ts for why.
    consumer.apply(RateLimitMiddleware).forRoutes(
      { path: 'auth/login', method: RequestMethod.POST },
      { path: 'auth/register', method: RequestMethod.POST },
      { path: 'auth/forgot-password', method: RequestMethod.POST },
      { path: 'auth/reset-password', method: RequestMethod.POST },
      { path: 'games/:id/bundle', method: RequestMethod.POST },
    );

    // ── Scoped: per-user rate limiting ──────────────────────────
    // Authenticated write-heavy routes where a single account can cause
    // disproportionate load or spam the database regardless of which IP
    // it is connecting from. Keys on user_id from the signed JWT.
    consumer.apply(UserRateLimitMiddleware).forRoutes(
      { path: 'reports', method: RequestMethod.POST },
      { path: 'tournaments/:id/register', method: RequestMethod.POST },
      { path: 'notifications', method: RequestMethod.POST },
      { path: 'moderator-actions/act-on-report', method: RequestMethod.POST },
      { path: 'moderator-actions/handle-violation', method: RequestMethod.POST },
    );

    // ── Scoped: audit logging — the "router-level middleware" proof ────
    // Staff-sensitive routes only: all of /users, all of /moderator-actions,
    // the two game-review decisions (approve/state), and tournament
    // administration (create/edit/delete — NOT the player-facing register/
    // unregister routes, which aren't administration).
    consumer.apply(AuditMiddleware).forRoutes(
      UsersController,
      ModeratorActionController,
      { path: 'games/:id/approve', method: RequestMethod.PATCH },
      { path: 'games/:id/state', method: RequestMethod.PATCH },
      { path: 'tournaments', method: RequestMethod.POST },
      { path: 'tournaments/:id', method: RequestMethod.PATCH },
      { path: 'tournaments/:id', method: RequestMethod.DELETE },
    );

    // ── Scoped: idempotency ───────────────────────────────────────
    // Mutation-sensitive POSTs where a duplicate submission (network retry,
    // double-click, browser back) would create two records or two DB writes.
    // Callers opt in by sending an  Idempotency-Key: <uuid>  header.
    consumer.apply(IdempotencyMiddleware).forRoutes(
      { path: 'tournaments/:id/register', method: RequestMethod.POST },
      { path: 'moderator-actions/act-on-report', method: RequestMethod.POST },
      { path: 'moderator-actions/handle-violation', method: RequestMethod.POST },
      { path: 'games/:id/bundle', method: RequestMethod.POST },
    );
  }
}
