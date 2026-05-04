"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const roles_guard_1 = require("./roles/roles.guard");
const core_2 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const fs = require("fs");
const path = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'role'],
    });
    app.useGlobalGuards(new roles_guard_1.RolesGuard(app.get(core_2.Reflector)));
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('PlayCarys OMGMP API')
        .setDescription('The Online Multiplayer Game Management Platform Backend API')
        .setVersion('1.0')
        .addApiKey({ type: 'apiKey', name: 'role', in: 'header' }, 'role')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    try {
        const docsDir = path.join(__dirname, '..', 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));
        console.log(`Swagger JSON dumped to: ${path.join(docsDir, 'swagger.json')}`);
    }
    catch (err) {
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
//# sourceMappingURL=main.js.map