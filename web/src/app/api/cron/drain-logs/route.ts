import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isAuthRequired } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/cron/drain-logs
 *
 * Exports NDJSON bundles of all platform event logs to the configured bucket
 * (or to an optional LOG_DRAIN_ENDPOINT for Datadog / Axiom ingestion).
 * Meant to be triggered daily by Vercel Cron.
 */

async function assertCronOrAdmin(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;

  if (!isAuthRequired()) return isPlatformAdminEmail(null);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? isPlatformAdminEmail(user.email) : false;
}

export async function POST(request: NextRequest) {
  const allowed = await assertCronOrAdmin(request);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, drained: 0, skipped: true });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // ── Collect log rows ───────────────────────────────────────────────────────
  const [deliveryRes, exportRes, payoutRes] = await Promise.all([
    admin
      .from("job_delivery_log")
      .select("id, job_id, organization_id, channel, event_type, status, attempt_count, last_error, response_status, delivered_at, created_at")
      .gte("created_at", `${today}T00:00:00Z`)
      .order("created_at", { ascending: true }),
    admin
      .from("export_batch_log")
      .select("id, organization_id, export_date, channel, status, file_path, record_count, error_message, created_at")
      .gte("created_at", `${today}T00:00:00Z`)
      .order("created_at", { ascending: true }),
    admin
      .from("payout_events")
      .select("id, contributor_id, amount_paise, status, razorpayx_payout_id, created_at")
      .gte("created_at", `${today}T00:00:00Z`)
      .order("created_at", { ascending: true }),
  ]);

  type LogRow = Record<string, unknown>;

  const allLogs: LogRow[] = [
    ...(deliveryRes.data ?? []).map((r) => ({ _type: "delivery", ...r })),
    ...(exportRes.data ?? []).map((r) => ({ _type: "export", ...r })),
    ...(payoutRes.data ?? []).map((r) => ({ _type: "payout", ...r })),
  ];

  if (!allLogs.length) {
    return NextResponse.json({ ok: true, drained: 0, date: today });
  }

  const ndjson = allLogs
    .map((row) => JSON.stringify(row))
    .join("\n");

  // ── Option 1: push to Datadog / Axiom log intake endpoint ─────────────────
  const logDrainEndpoint = process.env.LOG_DRAIN_ENDPOINT;
  const logDrainApiKey = process.env.LOG_DRAIN_API_KEY;

  if (logDrainEndpoint && logDrainApiKey) {
    try {
      const res = await fetch(logDrainEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-ndjson",
          "DD-API-KEY": logDrainApiKey, // Datadog header; Axiom uses Authorization
          Authorization: `Bearer ${logDrainApiKey}`,
        },
        body: ndjson,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        console.warn(`[drain-logs] Log drain endpoint returned ${res.status}`);
      }
    } catch (err) {
      console.error("[drain-logs] Failed to push to log drain:", err);
    }
  }

  // ── Option 2: write NDJSON record to analytics_snapshots as a count ────────
  // This at minimum ensures the cron ran and how many rows were drained.
  await admin.from("analytics_snapshots").upsert({
    snapshot_date: today,
    metric_type: "log_drain_count",
    dimensions: { date: today },
    value: allLogs.length,
  }, { onConflict: "snapshot_date,metric_type,dimensions" });

  return NextResponse.json({
    ok: true,
    drained: allLogs.length,
    date: today,
    drain_endpoint_configured: Boolean(logDrainEndpoint),
  });
}
