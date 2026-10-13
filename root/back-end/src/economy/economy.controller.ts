import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { PayoutService } from './payout.service';
import { Roles } from '../roles/roles.decorator';
import {
  AwardMatchDto,
  ClaimStipendDto,
  ClosePayoutDto,
  EquipCosmeticDto,
  PurchaseCosmeticDto,
  SubscribeDto,
} from './economy.dto';

@ApiTags('economy')
@Controller('economy')
export class EconomyController {
  constructor(
    private readonly economy: EconomyService,
    private readonly payouts: PayoutService,
  ) {}

  // GET /economy/catalogue?viewerId=7
  @Get('catalogue')
  @ApiOperation({ summary: 'Cosmetics and plans, annotated with what the viewer owns' })
  catalogue(@Query('viewerId') viewerId?: string) {
    return this.economy.catalogue(viewerId ? parseInt(viewerId, 10) : undefined);
  }

  /**
   * GET /economy/skins?userIds=7,8,9
   *
   * Batched so a list of players costs one request, not one per row.
   */
  /**
   * GET /economy/platform — the platform's own books and staffing.
   *
   * Superuser-only. Every other money endpoint is scoped to one publisher or
   * one player; this is the only view of the business as a whole, including
   * the 30% cut that until now was computed per payout and never summed.
   */
  @Get('platform')
  @Roles('superuser')
  @ApiOperation({ summary: 'Platform-wide inflow, outflow, liability and staffing ratios' })
  platform() {
    return this.economy.platformOverview();
  }

  @Get('skins')
  @ApiOperation({ summary: 'Equipped cosmetics for a set of players' })
  skins(@Query('userIds') userIds?: string) {
    const ids = (userIds || '')
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n));
    return this.economy.skins(ids);
  }

  // GET /economy/balance/:userId
  @Get('balance/:userId')
  @ApiOperation({ summary: 'Carys balance and recent ledger entries' })
  balance(@Param('userId', ParseIntPipe) userId: number) {
    return this.economy.balance(userId);
  }

  // GET /economy/transactions/:userId
  @Get('transactions/:userId')
  @ApiOperation({ summary: 'Payment history for a user' })
  transactions(@Param('userId', ParseIntPipe) userId: number) {
    return this.economy.transactionsFor(userId);
  }

  // POST /economy/purchase
  @Post('purchase')
  @ApiOperation({ summary: 'Buy a cosmetic with Carys or (simulated) INR' })
  purchase(@Body() dto: PurchaseCosmeticDto) {
    return this.economy.purchase(dto);
  }

  // POST /economy/equip
  @Post('equip')
  @ApiOperation({ summary: 'Equip an owned cosmetic (one per category)' })
  equip(@Body() dto: EquipCosmeticDto) {
    return this.economy.equip(dto);
  }

  /** POST /economy/unequip — take an item off, leaving the slot empty. */
  @Post('unequip')
  @ApiOperation({ summary: 'Remove an equipped cosmetic' })
  unequip(@Body() dto: EquipCosmeticDto) {
    return this.economy.unequip(dto);
  }

  /**
   * POST /economy/award
   *
   * Deliberately not role-gated, for the same reason the achievement unlock
   * endpoint is not: it does not accept an amount. The caller states what
   * happened — which game, which result — and the server decides what that is
   * worth and caps it. There is nothing here for a player to inflate.
   */
  @Post('award')
  @ApiOperation({ summary: 'Credit a completed match (server decides the amount)' })
  award(@Body() dto: AwardMatchDto) {
    return this.economy.awardMatch(dto);
  }

  // POST /economy/subscribe
  @Post('subscribe')
  @ApiOperation({ summary: 'Start a subscription (simulated payment)' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.economy.subscribe(dto);
  }

  // POST /economy/claim-stipend
  @Post('claim-stipend')
  @ApiOperation({ summary: 'Claim the monthly Carys stipend for an active subscription' })
  claimStipend(@Body() dto: ClaimStipendDto) {
    return this.economy.claimStipend(dto);
  }

  // ── Publisher earnings ────────────────────────────────────

  // GET /economy/publishers/:id/earnings
  @Get('publishers/:id/earnings')
  @ApiOperation({ summary: 'Attributable revenue, 70/30 split and payout history' })
  earnings(@Param('id', ParseIntPipe) publisherId: number) {
    return this.payouts.earnings(publisherId);
  }

  /**
   * POST /economy/publishers/:id/payouts
   *
   * Staff-gated: closing a period moves money into a studio's balance, which
   * is not a publisher's own call to make about themselves.
   */
  @Post('publishers/:id/payouts')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Close a period into a payout row' })
  closePayout(
    @Param('id', ParseIntPipe) publisherId: number,
    @Body() dto: ClosePayoutDto,
  ) {
    return this.payouts.close(publisherId, dto.period, dto.min_paise);
  }

  // POST /economy/payouts/:payoutId/paid
  @Post('payouts/:payoutId/paid')
  @Roles('admin', 'superuser')
  @ApiOperation({ summary: 'Mark a payout sent (simulated)' })
  markPaid(@Param('payoutId', ParseIntPipe) payoutId: number) {
    return this.payouts.markPaid(payoutId);
  }

  // GET /economy/payouts?publisherId=5
  @Get('payouts')
  @ApiOperation({ summary: 'Payout rows, optionally for one publisher' })
  listPayouts(@Query('publisherId') publisherId?: string) {
    return this.payouts.list(publisherId ? parseInt(publisherId, 10) : undefined);
  }
}
