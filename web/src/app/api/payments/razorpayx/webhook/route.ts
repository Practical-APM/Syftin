import { NextResponse } from "next/server";
import { handleRazorpayXPayoutWebhook } from "@/lib/data/payouts";
import {
  isRazorpayXConfigured,
  verifyRazorpayXWebhookSignature,
} from "@/lib/payments/razorpayx";

type WebhookPayload = {
  event?: string;
  payload?: {
    payout?: {
      entity?: {
        id?: string;
        reference_id?: string | null;
        status?: string;
        status_details?: { description?: string };
      };
    };
  };
};

export async function POST(request: Request) {
  if (!isRazorpayXConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayXWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const event = payload.event;
  const entity = payload.payload?.payout?.entity;

  if (!event?.startsWith("payout.") || !entity?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await handleRazorpayXPayoutWebhook({
    event,
    payoutId: entity.id,
    referenceId: entity.reference_id,
    failureReason: entity.status_details?.description ?? entity.status,
  });

  return NextResponse.json({ ok: true });
}
