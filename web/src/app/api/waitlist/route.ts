import { NextResponse } from "next/server";
import { addWaitlistLead } from "@/lib/data/waitlist";
import { isSupabaseClientConfigured } from "@/lib/env";
import { getClientIpFromRequest } from "@/lib/security/client-ip";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const limit = await checkRateLimit(rateLimitKey("waitlist", ip), RATE_LIMITS.waitlist);
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  if (isSupabaseClientConfigured()) {
    return NextResponse.json(
      {
        error:
          "Use magic-link sign-in. Waitlist is only for demo mode without Supabase.",
      },
      { status: 400 },
    );
  }

  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  const source = body.source?.trim() || "login";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const lead = await addWaitlistLead(email, source);
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 400 },
    );
  }
}
