/** Payment gateway surcharge logic (revenue_pipeline.md §3) */

export type PaymentMethod = "upi" | "card" | "netbanking";

/** 2% Razorpay fee + 18% GST = 2.36% */
export const CARD_NETBANKING_SURCHARGE_BPS = 236;

export function paymentSurchargeBps(method: PaymentMethod): number {
  if (method === "upi") return 0;
  return CARD_NETBANKING_SURCHARGE_BPS;
}

/** Charge amount in paise including surcharge; credits settle at nominal pack value. */
export function orderTotalPaise(
  nominalCreditPaise: number,
  method: PaymentMethod,
): { chargePaise: number; surchargePaise: number; creditPaise: number } {
  const surchargeBps = paymentSurchargeBps(method);
  const surchargePaise = Math.round((nominalCreditPaise * surchargeBps) / 10_000);
  return {
    chargePaise: nominalCreditPaise + surchargePaise,
    surchargePaise,
    creditPaise: nominalCreditPaise,
  };
}
