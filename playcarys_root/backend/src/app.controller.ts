import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import * as storeUtils from './data/store';

@ApiTags('root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Health Check' })
  getHello() {
    return {
      message: 'Welcome to the PlayCarys OMGMP API',
      status: 'success',
      version: 'v1'
    };
  }

  /**
   * GET /api/v1/db-export
   * Returns the full in-memory data store. Used by the frontend on boot to
   * replace the static mock data in db.js with live server-side state.
   */
  @Get('db-export')
  @ApiOperation({ summary: 'Export full in-memory DB (used by frontend on boot)' })
  exportDb() {
    return {
      roles: storeUtils.roles,
      users: storeUtils.users,
      player_profiles: storeUtils.player_profiles,
      publisher_profiles: storeUtils.publisher_profiles,
      games: storeUtils.games,
      tournaments: storeUtils.tournaments,
      sessions: storeUtils.sessions,
      match_results: storeUtils.match_results,
      reports: storeUtils.reports,
      moderator_actions: storeUtils.moderator_actions,
      player_tournament: storeUtils.player_tournament,
      player_session: storeUtils.player_session,
      bans: storeUtils.bans,
      notifications: storeUtils.notifications
    };
  }

  /**
   * POST /api/v1/db-import
   * Receives the full DB state from the frontend (after mutations) and
   * writes it back into the running in-memory arrays. This keeps the
   * NestJS store in sync with every DB.save() call from the frontend.
   */
  @Post('db-import')
  @ApiOperation({ summary: 'Import/sync full DB state from frontend (write-back)' })
  @ApiHeader({ name: 'role', description: 'Caller role for RBAC (any authenticated role accepted)', required: false })
  importDb(@Body() body: Record<string, any>) {
    const tables: (keyof typeof storeUtils)[] = [
      'roles', 'users', 'player_profiles', 'publisher_profiles',
      'games', 'tournaments', 'sessions', 'match_results',
      'reports', 'moderator_actions', 'player_tournament', 'player_session',
      'bans', 'notifications',
    ];
    for (const table of tables) {
      if (body[table] && Array.isArray(body[table])) {
        const arr = storeUtils[table] as any[];
        arr.length = 0;
        arr.push(...body[table]);
      }
    }
    return { status: 'ok', synced: tables.filter(t => Array.isArray(body[t])) };
  }
}
