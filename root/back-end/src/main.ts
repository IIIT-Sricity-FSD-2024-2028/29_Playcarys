import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RolesGuard } from './roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PersistenceInterceptor } from './data/persistence.interceptor';
import { installShutdownFlush, warnIfCredentialsMissing } from './data/persistence';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';
import { FileLoggerService } from './logging/file-logger.service';
import { TimeoutInterceptor } from './logging/timeout.interceptor';
import { SanitizeInterceptor } from './logging/sanitize.interceptor';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The frontend syncs the whole store to /api/v1/db-import in one POST.
  // Express defaults to a 100 KB body limit, which a publisher-uploaded game
  // cover (stored inline as a data: URL) blows past — the request then fails
  // with 413 and the change never reaches the other players.
  // `verify` keeps the RAW bytes on the request.
  //
  // A publisher signs the exact JSON they send, so verifying against a
  // re-serialised copy of the parsed object would fail whenever key order or
  // whitespace differed — which is most of the time, across languages. The
  // signature has to be checked over the bytes that were actually signed.
  app.use(
    express.json({
      limit: '25mb',
      verify: (req: any, _res, buf) => { req.rawBody = buf; },
    }),
  );
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Global validation: strip unknown fields and transform request payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Allow the PlayCarys frontend to call the API.
  //
  // Env-configurable allowlist: set CORS_ALLOWLIST to a comma-separated list
  // of exact origins (e.g. "http://localhost:8080,https://your-tunnel.loca.lt")
  // to restrict CORS to just those. Left unset, this stays wide open — the
  // launcher (run.bat) hands out a NEW localtunnel URL every run and any
  // laptop on the LAN can also open the app directly, so there is no fixed
  // origin list that wouldn't break one of those on a normal run. Set the
  // env var for a locked-down deployment; local/LAN/tunnel development keeps
  // working unchanged either way.
  const allowlist = (process.env.CORS_ALLOWLIST ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowlist.length ? allowlist : true,
    // PUT was missing from this list. Nothing noticed because until per-game
    // saves there was no PUT endpoint — the preflight for one simply failed and
    // the browser blocked the request, with the game told only "save failed".
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'role'], // Important: allow custom 'role' header
  });

  // Enable Global Roles Guard
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

  // Global error-handling middleware: every thrown exception, from every
  // controller, is caught here, answered in one consistent JSON shape, and
  // recorded to logs/error-YYYY-MM-DD.log. Pulled out of the DI container
  // (LoggingModule is @Global) so it shares the same FileLoggerService
  // instance the request/audit loggers use.
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  // Errors thrown outside a request (a timer, a socket handler) never reach
  // an ExceptionFilter — route those to the same error log instead of
  // letting them vanish into whatever's capturing stdout that run.
  const fileLogger = app.get(FileLoggerService);
  process.on('uncaughtException', (err) => {
    fileLogger.error(`[${new Date().toISOString()}] uncaughtException: ${err?.stack || err}`);
    console.error('uncaughtException:', err);
  });
  process.on('unhandledRejection', (reason) => {
    fileLogger.error(`[${new Date().toISOString()}] unhandledRejection: ${reason}`);
    console.error('unhandledRejection:', reason);
  });

  // FileLoggerService buffers in memory and flushes on a 10s timer — see
  // OnModuleDestroy in file-logger.service.ts. That hook only fires if
  // something calls app.close(); this process never does (no
  // enableShutdownHooks() call), and installShutdownFlush() below calls
  // process.exit(0) directly on SIGINT/SIGTERM without going through Nest's
  // lifecycle at all. Left alone, every buffered log line still waiting for
  // its next flush tick would be silently dropped on every clean shutdown.
  //
  // Node calls same-event listeners in REGISTRATION ORDER, and flush() is
  // synchronous (fs.appendFileSync) — so registering this before
  // installShutdownFlush() guarantees it completes before that handler's
  // own process.exit(0) runs.
  process.once('SIGINT', () => fileLogger.flush());
  process.once('SIGTERM', () => fileLogger.flush());

  // Persist after every successful write. Before this, only db-import wrote to
  // disk, so anything done through the REST API vanished on restart.
  //
  // Interceptor execution order (outermost to innermost):
  //   TimeoutInterceptor  — hard 30-second ceiling on every HTTP request
  //   SanitizeInterceptor — strips HTML tags from request body string fields
  //   PersistenceInterceptor — flushes in-memory DB to disk after mutations
  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new SanitizeInterceptor(),
    new PersistenceInterceptor(),
  );
  installShutdownFlush();

  // Loud, at boot: an account with no password can never sign in, and the way
  // that happens (a redacted db-export merged back into live_database.json) is
  // silent and unrecoverable without a backup.
  warnIfCredentialsMissing();

  // Global API prefix: all routes become /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('PlayCarys OMGMP API')
    .setDescription('The Online Multiplayer Game Management Platform Backend API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'role', in: 'header' }, 'role') // Allows setting 'role' in Swagger UI
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Dump swagger.json to back-end/docs/ (spec requirement)
  try {
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));
    console.log(`Swagger JSON dumped to: ${path.join(docsDir, 'swagger.json')}`);
  } catch (err) {
    console.error('Failed to generate swagger.json', err);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`
PlayCarys OMGMP NestJS Backend
Running on http://localhost:${port}/api/v1

POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/users
GET    /api/v1/games
GET    /api/v1/games?active=true
POST   /api/v1/games
PATCH  /api/v1/games/:id/approve
PATCH  /api/v1/games/:id/state
GET    /api/v1/sessions
POST   /api/v1/sessions/quick-play
POST   /api/v1/sessions/:id/join
PATCH  /api/v1/sessions/:id/end
GET    /api/v1/sessions/spectate/:playerId
GET    /api/v1/tournaments
POST   /api/v1/tournaments/:id/register
GET    /api/v1/player-profiles/leaderboard
GET    /api/v1/player-profiles/:userId/match-history
GET    /api/v1/reports
POST   /api/v1/reports
POST   /api/v1/moderator-actions/act-on-report
POST   /api/v1/moderator-actions/handle-violation
PATCH  /api/v1/moderator-actions/bans/:id/lift
GET    /api/v1/notifications?userId=7&roleName=player
  `);
}

bootstrap();
