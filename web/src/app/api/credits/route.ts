import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  addDemoCredits,
  getCreditBalance,
  listCreditTransactions,
} from "@/lib/data/credits";
import { getOrgVerified } from "@/lib/data/email-verification";
import { isPhase2Enabled } from "@/lib/env";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!isPhase2Enabled()) {
    return NextResponse.json({ error: "Phase 2 not enabled." }, { status: 404 });
  }

  const [balance, transactions, emailVerified] = await Promise.all([
    getCreditBalance(auth.org),
    listCreditTransactions(auth.org),
    getOrgVerified(auth.org.orgId),
  ]);

  return NextResponse.json({
    balance,
    transactions,
    razorpayEnabled: isRazorpayConfigured(),
    emailVerified,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!isPhase2Enabled()) {
    return NextResponse.json({ error: "Phase 2 not enabled." }, { status: 404 });
  }

  if (isRazorpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Demo top-up is disabled when Razorpay is configured. Use Pay with Razorpay.",
      },
      { status: 403 },
    );
  }

  const emailVerified = await getOrgVerified(auth.org.orgId);
  if (!emailVerified) {
    return NextResponse.json(
      {
        error:
          "Verify your email before claiming trial credits (anti-sybil protection).",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const amountCents = Number((body as { amountCents?: number }).amountCents ?? 50_000);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }

  const balance = await addDemoCredits(auth.org, amountCents);
  return NextResponse.json({ balance });
}
