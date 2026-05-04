import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RolesGuard } from './roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Allow the PlayCarys frontend to call the API during development.
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'role'], // Important: allow custom 'role' header
  });

  // Enable Global Roles Guard
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

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
  await app.listen(port);

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
