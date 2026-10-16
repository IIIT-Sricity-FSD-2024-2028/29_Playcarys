// ============================================================
//  Payment gateway — the one place money leaves the platform.
//
//  There is no real payment provider connected yet, so PayoutService talks to
//  this small interface and today the implementation is a SIMULATION: no money
//  moves anywhere. When a real API is chosen (Razorpay Payouts, Cashfree,
//  Stripe Connect, a bank API ...) write one class that extends PaymentGateway
//  and switch the provider in economy.module.ts — nothing else changes:
//  the withdraw endpoint, the "processing" screen, failure handling and the
//  payout history already work against this interface.
// ============================================================

export interface TransferRequest {
  payout_id: number;
  publisher_id: number;
  amount_paise: number;
  method: 'upi' | 'bank';
  /**
   * The real destination: a UPI id, or "account_number|IFSC".
   * Passed to the provider only; PayoutService stores a masked copy.
   */
  destination: string;
}

export interface TransferResult {
  ok: boolean;
  /** The provider's own reference, shown to the studio and kept for support. */
  reference?: string;
  /** Why it was declined, in words a studio can act on. */
  reason?: string;
}

export abstract class PaymentGateway {
  /** Send the money. Resolves when the provider has accepted or declined it. */
  abstract transfer(req: TransferRequest): Promise<TransferResult>;
}

/**
 * Stand-in for a real provider.
 *
 *  - waits a few seconds, like a real bank round trip, so the "processing"
 *    screen is exercised (PAYMENT_SIM_DELAY_MS overrides the 3.5 s default);
 *  - succeeds by default;
 *  - declines any destination containing "fail" (for example `fail@upi`),
 *    so the failure path can be tried on purpose.
 */
export class SimulatedPaymentGateway extends PaymentGateway {
  async transfer(req: TransferRequest): Promise<TransferResult> {
    const delay = Number(process.env.PAYMENT_SIM_DELAY_MS ?? 3500);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (/fail/i.test(req.destination)) {
      return {
        ok: false,
        reason: 'The bank declined the transfer (simulated). Check the payout details and try again.',
      };
    }
    return { ok: true, reference: `SIM-${Date.now().toString(36).toUpperCase()}-${req.payout_id}` };
  }
}
