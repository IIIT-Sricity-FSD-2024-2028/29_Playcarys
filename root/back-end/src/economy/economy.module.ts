import { Module } from '@nestjs/common';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';
import { PayoutService } from './payout.service';
import { PaymentGateway, SimulatedPaymentGateway } from './payment.gateway';

@Module({
  controllers: [EconomyController],
  providers: [
    EconomyService,
    PayoutService,
    // To use a real provider, replace SimulatedPaymentGateway with a class
    // that extends PaymentGateway (see payment.gateway.ts). Nothing else changes.
    { provide: PaymentGateway, useClass: SimulatedPaymentGateway },
  ],
  // Exported so the tournament module can charge entry fees through the same
  // transaction path rather than writing its own.
  exports: [EconomyService, PayoutService],
})
export class EconomyModule {}
