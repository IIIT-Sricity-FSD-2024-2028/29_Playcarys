import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LinkedAccountsService } from './linked-accounts.service';
import { LinkGameAccountDto, VerifyProofDto } from './linked-accounts.dto';

@Controller('linked-accounts')
export class LinkedAccountsController {
  constructor(private readonly svc: LinkedAccountsService) {}

  // GET /linked-accounts/platforms — the known-platform list + launch URLs & patterns
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

  // POST /linked-accounts/:id/request-verification
  @Post(':id/request-verification')
  requestVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.svc.requestVerification(id, requesterId);
  }

  // POST /linked-accounts/:id/verify-proof
  @Post(':id/verify-proof')
  verifyProof(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyProofDto,
  ) {
    return this.svc.verifyProof(id, dto);
  }

  @Delete(':id')
  unlink(
    @Param('id', ParseIntPipe) id: number,
    @Query('requesterId', ParseIntPipe) requesterId: number,
  ) {
    return this.svc.unlink(id, requesterId);
  }
}
