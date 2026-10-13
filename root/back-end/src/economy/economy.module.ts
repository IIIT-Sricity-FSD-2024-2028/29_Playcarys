import { Module } from '@nestjs/common';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';
import { PayoutService } from './payout.service';

@Module({
  controllers: [EconomyController],
  providers: [EconomyService, PayoutService],
  // Exported so the tournament module can charge entry fees through the same
  // transaction path rather than writing its own.
  exports: [EconomyService, PayoutService],
})
export class EconomyModule {}
