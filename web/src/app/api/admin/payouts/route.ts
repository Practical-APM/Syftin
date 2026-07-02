import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import {
  approvePayoutManual,
  disbursePayoutViaRazorpayX,
  listPendingPayouts,
  listRecentPayouts,
  processPendingPayoutsAuto,
} from "@/lib/data/payouts";
import { isRazorpayXConfigured } from "@/lib/payments/razorpayx";
import {
  isAutoDisbursePayoutsEnabled,
  isPhase2Enabled,
  isSupabaseConfigured,
} from "@/lib/env";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  if (!isPhase2Enabled() || !isSupabaseConfigured()) {
    return NextResponse.json({
      payouts: [],
      recent: [],
      razorpayXEnabled: false,
    });
  }

  try {
    if (isAutoDisbursePayoutsEnabled()) {
      await processPendingPayoutsAuto();
    }

    const [payouts, recent] = await Promise.all([
      listPendingPayouts(),
      listRecentPayouts(),
    ]);
    return NextResponse.json({
      payouts,
      recent,
      razorpayXEnabled: isRazorpayXConfigured(),
      autoDisburse: isAutoDisbursePayoutsEnabled(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const payoutId = (body as { payoutId?: string }).payoutId;
  const mode = (body as { mode?: string }).mode;

  if (!payoutId) {
    return NextResponse.json({ error: "payoutId required." }, { status: 400 });
  }

  try {
    if (mode === "manual" || !isRazorpayXConfigured()) {
      await approvePayoutManual(
        payoutId,
        (body as { providerRef?: string }).providerRef,
      );
      return NextResponse.json({ ok: true, mode: "manual" });
    }

    const result = await disbursePayoutViaRazorpayX(payoutId);
    return NextResponse.json({ ok: true, mode: "razorpayx", ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payout failed." },
      { status: 400 },
    );
  }
}
