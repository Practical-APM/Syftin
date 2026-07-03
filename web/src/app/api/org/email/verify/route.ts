import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { verifyEmailOtp } from "@/lib/data/email-verification";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const email = (body as { email?: string }).email;
  const otp = (body as { otp?: string }).otp;

  if (!email || !otp) {
    return NextResponse.json(
      { error: "email and otp required." },
      { status: 400 },
    );
  }

  const result = await verifyEmailOtp(auth.org.orgId, email, otp);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, emailVerified: true });
}
