import { Controller, Get, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerProfileService } from './player-profile.service';
import { UpdatePlayerProfileDto } from './player-profile.dto';

@Controller('player-profiles')
export class PlayerProfileController {
  constructor(private readonly playerProfileService: PlayerProfileService) {}

  // GET /player-profiles
  @Get()
  findAll() {
    return this.playerProfileService.findAll();
  }

  // GET /player-profiles/leaderboard
  @Get('leaderboard')
  getLeaderboard() {
    return this.playerProfileService.getLeaderboard();
  }

  // GET /player-profiles/:userId
  @Get(':userId')
  findOne(@Param('userId', ParseIntPipe) userId: number) {
    return this.playerProfileService.findOne(userId);
  }

  // GET /player-profiles/:userId/match-history
  @Get(':userId/match-history')
  getMatchHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.playerProfileService.getMatchHistory(userId);
  }

  // PATCH /player-profiles/:userId
  @Patch(':userId')
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdatePlayerProfileDto,
  ) {
    return this.playerProfileService.update(userId, dto);
  }
}
