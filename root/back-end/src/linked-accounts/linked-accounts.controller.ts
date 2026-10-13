import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LinkedAccountsService } from './linked-accounts.service';
import { LinkGameAccountDto } from './linked-accounts.dto';

@Controller('linked-accounts')
export class LinkedAccountsController {
  constructor(private readonly svc: LinkedAccountsService) {}

  // GET /linked-accounts/platforms — the known-platform list + launch URLs
  @Get('platforms')
  platforms() {
    return this.svc.platforms();
  }

  // GET /linked-accounts/player/:playerId
  @Get('player/:playerId')
  forPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.svc.forPlayer(playerId);
  }

  @Post()
  link(@Body() dto: LinkGameAccountDto) {
    return this.svc.link(dto);
  }

  @Delete(':id')
  unlink(
    @Param('id', ParseIntPipe) id: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.svc.unlink(id, requesterId);
  }
}
