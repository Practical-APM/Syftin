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
import {
  orderTotalPaise,
  type PaymentMethod,
} from "@/lib/payments/payment-surcharge";
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
  const methodRaw = (body as { paymentMethod?: string }).paymentMethod;
  const paymentMethod: PaymentMethod =
    methodRaw === "card" || methodRaw === "netbanking" ? methodRaw : "upi";

  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack." }, { status: 400 });
  }

  const pricing = orderTotalPaise(pack.amountCents, paymentMethod);
  const receipt = `syftin_${auth.org.orgId.slice(0, 8)}_${Date.now()}`;

  try {
    const rzOrder = await createRazorpayOrder({
      amountCents: pricing.chargePaise,
      receipt,
      notes: {
        org_id: auth.org.orgId,
        pack_id: pack.id,
        credit_paise: String(pricing.creditPaise),
        payment_method: paymentMethod,
        surcharge_paise: String(pricing.surchargePaise),
      },
    });

    await insertRazorpayOrder(auth.org.orgId, {
      razorpayOrderId: rzOrder.id,
      amountCents: pricing.creditPaise,
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
      paymentMethod,
      surchargePaise: pricing.surchargePaise,
      creditPaise: pricing.creditPaise,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order creation failed." },
      { status: 502 },
    );
  }
}
