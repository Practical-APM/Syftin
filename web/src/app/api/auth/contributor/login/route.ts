import { NextResponse } from "next/server";
import { provisionContributorUser } from "@/lib/auth/contributor";
import { establishContributorSession } from "@/lib/auth/contributor-direct-login";
import { isPhase2Enabled, isSupabaseConfigured } from "@/lib/env";

export async function POST(request: Request) {
  if (!isPhase2Enabled()) {
    return NextResponse.json(
      { error: "Contributor portal is not enabled on this deployment." },
      { status: 503 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const user = await establishContributorSession(email);
    await provisionContributorUser(user.id, user.email ?? email);
    return NextResponse.json({ ok: true, redirect: "/contributor" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    const status = message.includes("not enabled") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
