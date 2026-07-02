import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  CREDIT_PACKS,
  createRazorpayOrder,
  getCreditPack,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { insertRazorpayOrder } from "@/lib/data/payments";
import { isPhase2Enabled } from "@/lib/env";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(
    rateLimitKey("paymentsOrder", auth.org.orgId),
    RATE_LIMITS.paymentsOrder,
  );
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  if (!isPhase2Enabled()) {
    return NextResponse.json({ error: "Phase 2 not enabled." }, { status: 404 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured on this environment." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const packId = (body as { packId?: string }).packId;
  const pack = packId ? getCreditPack(packId) : CREDIT_PACKS[0];

  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack." }, { status: 400 });
  }

  const receipt = `syftin_${auth.org.orgId.slice(0, 8)}_${Date.now()}`;

  try {
    const rzOrder = await createRazorpayOrder({
      amountCents: pack.amountCents,
      receipt,
      notes: {
        org_id: auth.org.orgId,
        pack_id: pack.id,
      },
    });

    await insertRazorpayOrder(auth.org.orgId, {
      razorpayOrderId: rzOrder.id,
      amountCents: pack.amountCents,
      receipt,
    });

    return NextResponse.json({
      orderId: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      keyId: getRazorpayKeyId(),
      packLabel: pack.label,
      orgName: auth.org.orgName,
      customerEmail: auth.email ?? undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order creation failed." },
      { status: 502 },
    );
  }
}
