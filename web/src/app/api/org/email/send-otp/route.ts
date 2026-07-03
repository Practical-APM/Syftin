import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { sendVerificationEmail } from "@/lib/data/email-verification";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(
    rateLimitKey("emailOtp", auth.org.orgId),
    { limit: 5, windowMs: 15 * 60 * 1000 },
  );
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const body = await request.json().catch(() => ({}));
  const email = (body as { email?: string }).email;
  if (!email) {
    return NextResponse.json({ error: "email required." }, { status: 400 });
  }

  const result = await sendVerificationEmail(auth.org.orgId, email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Verification code sent.",
    ...(result.devOtp ? { devOtp: result.devOtp } : {}),
  });
}
