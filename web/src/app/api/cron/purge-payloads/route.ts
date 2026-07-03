import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, isAuthRequired } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/cron/purge-payloads
 *
 * Nulls out raw `html_payload` on fetch_tasks whose page was fetched more than
 * PAYLOAD_RETENTION_DAYS ago (default 7). Metadata (byte size, output hash,
 * consensus status) is preserved for accounting and dispute audit; only the
 * bulky raw markup is dropped. Runs daily via Vercel Cron.
 *
 * revenue_pipeline §9 — Infra & Resource Protection: raw payloads are transient
 * and must not accumulate indefinitely in the primary store.
 */

const PAYLOAD_RETENTION_DAYS = Number(
  process.env.PAYLOAD_RETENTION_DAYS ?? "7",
);
const PURGE_BATCH_SIZE = 500;

async function assertCronOrAdmin(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;

  if (!isAuthRequired()) return isPlatformAdminEmail(null);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? isPlatformAdminEmail(user.email) : false;
}

export async function POST(request: NextRequest) {
  const allowed = await assertCronOrAdmin(request);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, purged: 0, skipped: true });
  }

  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() - PAYLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: candidates, error: selectError } = await admin
    .from("fetch_tasks")
    .select("id")
    .lt("completed_at", cutoff)
    .not("html_payload", "is", null)
    .is("payload_purged_at", null)
    .limit(PURGE_BATCH_SIZE);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const ids = (candidates ?? []).map((r) => r.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, purged: 0, cutoff });
  }

  const { error: updateError } = await admin
    .from("fetch_tasks")
    .update({ html_payload: null, payload_purged_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    purged: ids.length,
    cutoff,
    retention_days: PAYLOAD_RETENTION_DAYS,
    more: ids.length === PURGE_BATCH_SIZE,
  });
}
