import { NextResponse } from "next/server";
import { fulfillRazorpayPaymentByOrderId } from "@/lib/data/payments";
import {
  isRazorpayConfigured,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payment = payload.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId || !paymentId || payment.status !== "captured") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await fulfillRazorpayPaymentByOrderId({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
