import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, isAuthRequired } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { deletePayloadObject } from "@/lib/storage/payload-storage";

/**
 * POST /api/cron/purge-payloads
 *
 * Drops raw fetch payloads older than PAYLOAD_RETENTION_DAYS (default 7):
 * - Inline `html_payload` columns are nulled in Postgres
 * - Offloaded objects are deleted from the platform payload bucket
 *
 * Metadata (byte size, output hash, consensus status) is preserved.
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
  const purgedAt = new Date().toISOString();

  const { data: inlineCandidates, error: inlineError } = await admin
    .from("fetch_tasks")
    .select("id")
    .lt("completed_at", cutoff)
    .not("html_payload", "is", null)
    .is("payload_purged_at", null)
    .limit(PURGE_BATCH_SIZE);

  if (inlineError) {
    return NextResponse.json({ error: inlineError.message }, { status: 500 });
  }

  const { data: objectCandidates, error: objectError } = await admin
    .from("fetch_tasks")
    .select("id, payload_storage_key")
    .lt("completed_at", cutoff)
    .not("payload_storage_key", "is", null)
    .is("payload_purged_at", null)
    .limit(PURGE_BATCH_SIZE);

  if (objectError) {
    return NextResponse.json({ error: objectError.message }, { status: 500 });
  }

  const inlineIds = (inlineCandidates ?? []).map((r) => r.id as string);
  const objectRows = objectCandidates ?? [];

  if (inlineIds.length === 0 && objectRows.length === 0) {
    return NextResponse.json({ ok: true, purged: 0, cutoff });
  }

  let s3Deleted = 0;
  for (const row of objectRows) {
    const key = row.payload_storage_key as string | null;
    if (!key) continue;
    try {
      await deletePayloadObject(key);
      s3Deleted++;
    } catch (err) {
      console.error(`[purge-payloads] s3 delete ${key}:`, err);
    }
  }

  const allIds = [
    ...new Set([
      ...inlineIds,
      ...objectRows.map((r) => r.id as string),
    ]),
  ];

  const { error: updateError } = await admin
    .from("fetch_tasks")
    .update({
      html_payload: null,
      payload_storage_key: null,
      payload_encoding: null,
      payload_purged_at: purgedAt,
    })
    .in("id", allIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    purged: allIds.length,
    s3_deleted: s3Deleted,
    cutoff,
    retention_days: PAYLOAD_RETENTION_DAYS,
    more:
      inlineIds.length === PURGE_BATCH_SIZE ||
      objectRows.length === PURGE_BATCH_SIZE,
  });
}
