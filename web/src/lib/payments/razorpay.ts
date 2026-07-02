import { createHmac, timingSafeEqual } from "crypto";
import { getCreditPack } from "@/lib/payments/razorpay-config";
import { getRazorpayAuthHeader } from "@/lib/payments/razorpay-auth";

export { CREDIT_PACKS, getCreditPack } from "@/lib/payments/razorpay-config";
export type { CreditPackId } from "@/lib/payments/razorpay-config";

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  );
}

export function getRazorpayKeyId(): string {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) throw new Error("Razorpay is not configured.");
  return key;
}

export type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

export async function createRazorpayOrder(input: {
  amountCents: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getRazorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { description?: string } }).error?.description ??
      "Could not create Razorpay order.";
    throw new Error(message);
  }

  return data as RazorpayOrderResponse;
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(input.signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
