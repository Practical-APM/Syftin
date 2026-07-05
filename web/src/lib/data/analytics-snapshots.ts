import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

/**
 * Aggregates yesterday's platform metrics into analytics_snapshots.
 * Called by the daily analytics cron.
 */
export async function captureDailyAnalyticsSnapshots(): Promise<{
  date: string;
  metricsWritten: number;
}> {
  if (!isSupabaseConfigured()) {
    return { date: todayDate(), metricsWritten: 0 };
  }

  const admin = createAdminClient();
  const snapshotDate = todayDate();
  const dayStart = `${snapshotDate}T00:00:00Z`;
  const dayEnd = `${snapshotDate}T23:59:59.999Z`;

  let metricsWritten = 0;

  async function upsert(
    metricType: string,
    value: number,
    dimensions: Record<string, string> = {},
  ) {
    const { error } = await admin.from("analytics_snapshots").upsert(
      {
        snapshot_date: snapshotDate,
        metric_type: metricType,
        dimensions,
        value,
      },
      { onConflict: "snapshot_date,metric_type,dimensions" },
    );
    if (!error) metricsWritten++;
  }

  // Online contributor nodes (latest heartbeat today)
  const { count: nodeCount } = await admin
    .from("contributor_nodes")
    .select("id", { count: "exact", head: true })
    .eq("status", "online");

  await upsert("node_count", nodeCount ?? 0);

  // Fetch latency + failure rate per domain
  const { data: tasks } = await admin
    .from("fetch_tasks")
    .select("domain, created_at, completed_at, status")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .in("status", ["completed", "failed"]);

  const latencyByDomain: Record<string, number[]> = {};
  const statsByDomain: Record<string, { total: number; failed: number }> = {};

  for (const t of tasks ?? []) {
    const domain = t.domain as string;
    if (!domain) continue;
    if (!latencyByDomain[domain]) latencyByDomain[domain] = [];
    if (!statsByDomain[domain]) statsByDomain[domain] = { total: 0, failed: 0 };
    statsByDomain[domain].total++;
    if (t.status === "failed") statsByDomain[domain].failed++;
    if (t.status === "completed" && t.created_at && t.completed_at) {
      const ms =
        new Date(t.completed_at as string).getTime() -
        new Date(t.created_at as string).getTime();
      if (ms > 0) latencyByDomain[domain].push(ms);
    }
  }

  for (const [domain, times] of Object.entries(latencyByDomain)) {
    const sorted = [...times].sort((a, b) => a - b);
    await upsert("fetch_latency_p50", percentile(sorted, 50), { domain });
    await upsert("fetch_latency_p95", percentile(sorted, 95), { domain });
  }

  for (const [domain, { total, failed }] of Object.entries(statsByDomain)) {
    const rate = total > 0 ? Math.round((failed / total) * 100) : 0;
    await upsert("domain_failure_rate", rate, { domain });
  }

  // Credit burn by org
  const { data: txns } = await admin
    .from("credit_transactions")
    .select("organization_id, amount_cents")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .eq("kind", "job_charge");

  const burnByOrg: Record<string, number> = {};
  for (const tx of txns ?? []) {
    const orgId = tx.organization_id as string;
    if (!orgId) continue;
    burnByOrg[orgId] =
      (burnByOrg[orgId] ?? 0) + Math.abs(Number(tx.amount_cents ?? 0));
  }

  for (const [orgId, paise] of Object.entries(burnByOrg)) {
    await upsert("credit_burn", paise, { org_id: orgId });
  }

  // Batch shard throughput
  const { data: shards } = await admin
    .from("jobs")
    .select("status")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .not("parent_batch_id", "is", null);

  const completed = (shards ?? []).filter((s) => s.status === "completed").length;
  await upsert("batch_throughput", completed);

  // Job completion latency — proxy for the Phase 3 "time-to-first-data" goal.
  const { data: doneJobs } = await admin
    .from("jobs")
    .select("created_at, completed_at, status")
    .gte("completed_at", dayStart)
    .lte("completed_at", dayEnd)
    .eq("status", "completed");

  const jobLatencies: number[] = [];
  for (const j of doneJobs ?? []) {
    if (j.created_at && j.completed_at) {
      const ms =
        new Date(j.completed_at as string).getTime() -
        new Date(j.created_at as string).getTime();
      if (ms > 0) jobLatencies.push(ms);
    }
  }
  if (jobLatencies.length) {
    const sorted = [...jobLatencies].sort((a, b) => a - b);
    await upsert("job_latency_p50", percentile(sorted, 50));
    await upsert("job_latency_p95", percentile(sorted, 95));
  }

  const { data: pageResults } = await admin
    .from("job_page_results")
    .select("job_id, created_at, jobs!inner(created_at)")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  const ttfr: number[] = [];
  for (const row of pageResults ?? []) {
    const jobCreated = (row.jobs as { created_at?: string } | null)?.created_at;
    if (jobCreated && row.created_at) {
      const ms =
        new Date(row.created_at as string).getTime() -
        new Date(jobCreated).getTime();
      if (ms > 0) ttfr.push(ms);
    }
  }
  if (ttfr.length) {
    const sorted = [...ttfr].sort((a, b) => a - b);
    await upsert("time_to_first_record_p50", percentile(sorted, 50));
    await upsert("time_to_first_record_p95", percentile(sorted, 95));
  }

  // Revenue-share health (Phase 3 targets: contributor share ≥65% of buyer
  // charge; ledger reconciliation within ±₹0.01, i.e. delta ~0 paise).
  const { data: ledger } = await admin
    .from("platform_ledger")
    .select("buyer_charge_paise, contributor_payout_paise, platform_net_paise")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  let buyerTotal = 0;
  let payoutTotal = 0;
  let netTotal = 0;
  for (const row of ledger ?? []) {
    buyerTotal += Number(row.buyer_charge_paise ?? 0);
    payoutTotal += Number(row.contributor_payout_paise ?? 0);
    netTotal += Number(row.platform_net_paise ?? 0);
  }
  if (buyerTotal > 0) {
    await upsert(
      "contributor_share_pct",
      Math.round((payoutTotal / buyerTotal) * 100),
    );
  }
  if ((ledger ?? []).length > 0) {
    await upsert("ledger_reconciliation_delta_paise", netTotal - (buyerTotal - payoutTotal));
  }

  return { date: snapshotDate, metricsWritten };
}
