import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { fulfillRazorpayPayment } from "@/lib/data/payments";
import {
  isRazorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/payments/razorpay";
import { isPhase2Enabled } from "@/lib/env";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!isPhase2Enabled() || !isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payments not available." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const razorpayOrderId = (body as { razorpay_order_id?: string })
    .razorpay_order_id;
  const razorpayPaymentId = (body as { razorpay_payment_id?: string })
    .razorpay_payment_id;
  const razorpaySignature = (body as { razorpay_signature?: string })
    .razorpay_signature;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { error: "Missing payment verification fields." },
      { status: 400 },
    );
  }

  const valid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  const result = await fulfillRazorpayPayment({
    org: auth.org,
    razorpayOrderId,
    razorpayPaymentId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    balance: result.balance,
    alreadyFulfilled: result.alreadyFulfilled ?? false,
  });
}
