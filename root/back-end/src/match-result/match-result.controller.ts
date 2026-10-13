import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MatchResultService } from './match-result.service';

@Controller('match-results')
export class MatchResultController {
  constructor(private readonly matchResultService: MatchResultService) {}

  // GET /match-results/session/:sessionId
  @Get('session/:sessionId')
  findBySession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.matchResultService.findBySession(sessionId);
  }

  // GET /match-results/player/:playerId
  @Get('player/:playerId')
  findByPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.matchResultService.findByPlayer(playerId);
  }

  // GET /match-results/top-scorers?limit=10
  @Get('top-scorers')
  getTopScorers(@Query('limit') limit?: string) {
    return this.matchResultService.getTopScorers(limit ? parseInt(limit, 10) : 10);
  }
}
