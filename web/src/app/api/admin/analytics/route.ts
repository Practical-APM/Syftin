import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isAuthRequired } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Range = "7d" | "30d";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function assertAdmin(): Promise<boolean> {
  if (!isAuthRequired()) {
    return isPlatformAdminEmail(null);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? isPlatformAdminEmail(user.email) : false;
}

export async function GET(request: NextRequest) {
  const isAdmin = await assertAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = request.nextUrl.searchParams.get("range") ?? "7d";
  const range: Range = raw === "30d" ? "30d" : "7d";
  const days = range === "30d" ? 30 : 7;
  const since = daysAgo(days);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(mockAnalytics(days));
  }

  const admin = createAdminClient();

  // ── 1. Node count over time (daily online heartbeats) ──────────────────────
  const { data: nodeHeartbeats } = await admin
    .from("worker_heartbeats")
    .select("created_at")
    .gte("created_at", `${since}T00:00:00Z`)
    .order("created_at", { ascending: true });

  const nodeCountByDay = aggregateByDay(
    nodeHeartbeats ?? [],
    "created_at",
    () => 1,
    "count",
    days,
  );

  // ── 2. Fetch task latency (ms) per domain ──────────────────────────────────
  const { data: tasks } = await admin
    .from("fetch_tasks")
    .select("domain, created_at, completed_at, status")
    .gte("created_at", `${since}T00:00:00Z`)
    .in("status", ["completed", "failed"]);

  const latencyByDomain: Record<string, number[]> = {};
  const failsByDomain: Record<string, { total: number; failed: number }> = {};

  for (const t of tasks ?? []) {
    if (!t.domain) continue;
    if (!latencyByDomain[t.domain]) latencyByDomain[t.domain] = [];
    if (!failsByDomain[t.domain]) failsByDomain[t.domain] = { total: 0, failed: 0 };

    failsByDomain[t.domain].total++;
    if (t.status === "failed") {
      failsByDomain[t.domain].failed++;
    }

    if (t.status === "completed" && t.created_at && t.completed_at) {
      const ms = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime();
      if (ms > 0) latencyByDomain[t.domain].push(ms);
    }
  }

  const domainLatency = Object.entries(latencyByDomain).map(([domain, times]) => {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      domain,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      count: sorted.length,
    };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  const domainFailureRates = Object.entries(failsByDomain).map(([domain, { total, failed }]) => ({
    domain,
    failure_rate: total > 0 ? Math.round((failed / total) * 100) : 0,
    total,
    failed,
  })).sort((a, b) => b.failure_rate - a.failure_rate).slice(0, 10);

  // ── 3. Credit burn by org (last N days) ───────────────────────────────────
  const { data: creditTxns } = await admin
    .from("credit_transactions")
    .select("organization_id, amount_cents, created_at")
    .gte("created_at", `${since}T00:00:00Z`)
    .eq("kind", "job_charge");

  const burnByOrg: Record<string, number> = {};
  for (const tx of creditTxns ?? []) {
    if (!tx.organization_id) continue;
    burnByOrg[tx.organization_id] = (burnByOrg[tx.organization_id] ?? 0) + Math.abs(tx.amount_cents ?? 0);
  }

  // Fetch org names for readability
  const orgIds = Object.keys(burnByOrg);
  let orgNames: Record<string, string> = {};
  if (orgIds.length) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    orgNames = Object.fromEntries((orgs ?? []).map(o => [o.id, o.name as string]));
  }

  const creditBurnByOrg = Object.entries(burnByOrg)
    .map(([orgId, paise]) => ({
      org_id: orgId,
      org_name: orgNames[orgId] ?? orgId.slice(0, 8),
      spend_paise: paise,
      spend_rupees: (paise / 100).toFixed(2),
    }))
    .sort((a, b) => b.spend_paise - a.spend_paise)
    .slice(0, 10);

  // ── 4. Batch throughput (shards created/completed/failed per day) ──────────
  const { data: shards } = await admin
    .from("jobs")
    .select("status, created_at, parent_batch_id")
    .gte("created_at", `${since}T00:00:00Z`)
    .not("parent_batch_id", "is", null);

  const throughputByDay: Record<string, { created: number; completed: number; failed: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = daysAgo(days - 1 - i);
    throughputByDay[d] = { created: 0, completed: 0, failed: 0 };
  }
  for (const s of shards ?? []) {
    const day = (s.created_at as string).slice(0, 10);
    if (!throughputByDay[day]) throughputByDay[day] = { created: 0, completed: 0, failed: 0 };
    throughputByDay[day].created++;
    if (s.status === "completed") throughputByDay[day].completed++;
    if (s.status === "failed") throughputByDay[day].failed++;
  }
  const batchThroughput = Object.entries(throughputByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // ── 5. Platform health snapshots (cron-written daily metrics) ───────────
  const { data: snapshots } = await admin
    .from("analytics_snapshots")
    .select("snapshot_date, metric_type, value")
    .gte("snapshot_date", since)
    .in("metric_type", [
      "job_latency_p50",
      "job_latency_p95",
      "contributor_share_pct",
      "ledger_reconciliation_delta_paise",
    ])
    .order("snapshot_date", { ascending: true });

  const jobLatencyTimeline: { date: string; p50: number; p95: number }[] = [];
  const latencyByDate: Record<string, { p50?: number; p95?: number }> = {};
  let latestContributorShare = 0;
  let latestLedgerDelta = 0;

  for (const row of snapshots ?? []) {
    const date = row.snapshot_date as string;
    const type = row.metric_type as string;
    const value = Number(row.value ?? 0);
    if (type === "job_latency_p50" || type === "job_latency_p95") {
      if (!latencyByDate[date]) latencyByDate[date] = {};
      if (type === "job_latency_p50") latencyByDate[date].p50 = value;
      else latencyByDate[date].p95 = value;
    } else if (type === "contributor_share_pct") {
      latestContributorShare = value;
    } else if (type === "ledger_reconciliation_delta_paise") {
      latestLedgerDelta = value;
    }
  }
  for (const [date, v] of Object.entries(latencyByDate).sort(([a], [b]) => a.localeCompare(b))) {
    jobLatencyTimeline.push({
      date,
      p50: v.p50 ?? 0,
      p95: v.p95 ?? 0,
    });
  }

  return NextResponse.json({
    range,
    node_count_timeline: nodeCountByDay,
    domain_latency: domainLatency,
    domain_failure_rates: domainFailureRates,
    credit_burn_by_org: creditBurnByOrg,
    batch_throughput: batchThroughput,
    platform_health: {
      job_latency_timeline: jobLatencyTimeline,
      contributor_share_pct: latestContributorShare,
      ledger_reconciliation_delta_paise: latestLedgerDelta,
    },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

function aggregateByDay<T extends Record<string, unknown>>(
  rows: T[],
  dateKey: keyof T,
  valueExtractor: (row: T) => number,
  agg: "count" | "sum",
  days: number,
): { date: string; value: number }[] {
  const byDay: Record<string, number[]> = {};
  for (let i = 0; i < days; i++) {
    byDay[daysAgo(days - 1 - i)] = [];
  }
  for (const row of rows) {
    const date = String(row[dateKey]).slice(0, 10);
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(valueExtractor(row));
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      value: agg === "count" ? vals.length : vals.reduce((s, v) => s + v, 0),
    }));
}

function mockAnalytics(days: number) {
  const nodeTimeline = Array.from({ length: days }, (_, i) => ({
    date: daysAgo(days - 1 - i),
    value: Math.floor(3 + Math.random() * 8),
  }));
  const batchThroughput = Array.from({ length: days }, (_, i) => ({
    date: daysAgo(days - 1 - i),
    created: Math.floor(Math.random() * 20),
    completed: Math.floor(Math.random() * 16),
    failed: Math.floor(Math.random() * 4),
  }));
  return {
    range: `${days}d`,
    node_count_timeline: nodeTimeline,
    domain_latency: [
      { domain: "blinkit.com", p50: 1200, p95: 3500, count: 42 },
      { domain: "amazon.in", p50: 2100, p95: 8200, count: 31 },
      { domain: "linkedin.com", p50: 3800, p95: 11000, count: 18 },
    ],
    domain_failure_rates: [
      { domain: "linkedin.com", failure_rate: 12, total: 18, failed: 2 },
      { domain: "amazon.in", failure_rate: 6, total: 31, failed: 2 },
      { domain: "blinkit.com", failure_rate: 2, total: 42, failed: 1 },
    ],
    credit_burn_by_org: [
      { org_id: "demo", org_name: "Acme Corp", spend_paise: 85000, spend_rupees: "850.00" },
      { org_id: "demo2", org_name: "Beta Inc", spend_paise: 42000, spend_rupees: "420.00" },
    ],
    batch_throughput: batchThroughput,
    platform_health: {
      job_latency_timeline: Array.from({ length: days }, (_, i) => ({
        date: daysAgo(days - 1 - i),
        p50: 45_000 + Math.floor(Math.random() * 20_000),
        p95: 120_000 + Math.floor(Math.random() * 40_000),
      })),
      contributor_share_pct: 68,
      ledger_reconciliation_delta_paise: 0,
    },
  };
}
