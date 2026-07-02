export const CREDIT_PACKS = [
  { id: "pack_500", label: "₹500", amountCents: 50_000, jobsApprox: 100 },
  { id: "pack_2000", label: "₹2,000", amountCents: 200_000, jobsApprox: 400 },
  { id: "pack_5000", label: "₹5,000", amountCents: 500_000, jobsApprox: 1000 },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export function getCreditPack(packId: string) {
  return CREDIT_PACKS.find((p) => p.id === packId) ?? null;
}

export function isRazorpayConfiguredClient(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}
