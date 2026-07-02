import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { sendTestWebhook } from "@/lib/data/delivery";

export async function POST() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const result = await sendTestWebhook(auth.org.orgId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
