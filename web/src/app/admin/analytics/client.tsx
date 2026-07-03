"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, Globe, Cpu, CreditCard, Layers } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";

type Range = "7d" | "30d";

type AnalyticsData = {
  range: string;
  node_count_timeline: { date: string; value: number }[];
  domain_latency: { domain: string; p50: number; p95: number; count: number }[];
  domain_failure_rates: { domain: string; failure_rate: number; total: number; failed: number }[];
  credit_burn_by_org: { org_id: string; org_name: string; spend_paise: number; spend_rupees: string }[];
  batch_throughput: { date: string; created: number; completed: number; failed: number }[];
  platform_health: {
    job_latency_timeline: { date: string; p50: number; p95: number }[];
    contributor_share_pct: number;
    ledger_reconciliation_delta_paise: number;
  };
};

function Sparkline({ data, color = "#d4a053" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full min-w-0" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full min-w-0 rounded-full bg-graphite-800">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-graphite-700 bg-graphite-900/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-graphite-400">{title}</p>
          <p className="truncate text-[10px] text-graphite-500">{subtitle}</p>
        </div>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${accent}22` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>
      </div>
      {children}
    </div>
  );
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function AnalyticsClient() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?range=${range}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d as AnalyticsData))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const maxBurn = Math.max(...(data?.credit_burn_by_org.map((o) => o.spend_paise) ?? [1]));
  const maxFailRate = Math.max(...(data?.domain_failure_rates.map((d) => d.failure_rate) ?? [1]));
  const maxLatency = Math.max(...(data?.domain_latency.map((d) => d.p95) ?? [1]));

  return (
    <>
      <DashboardHeader
        backHref="/admin"
        backLabel="Back to Admin"
        title="Platform Analytics"
        description="Node health, latency, failure rates, credit burn, and throughput."
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-graphite-700 bg-graphite-900">
              {(["7d", "30d"] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r ? "bg-honey-500 text-graphite-950" : "text-graphite-300 hover:text-ivory-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 hover:text-ivory-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />
      <DashboardPage className="min-w-0 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-graphite-700 bg-graphite-900/40" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MetricCard title="Node health" subtitle="Online nodes per day" icon={Cpu} accent="#d4a053">
                <Sparkline data={data.node_count_timeline.map((d) => d.value)} />
                <p className="mt-2 text-lg font-light text-ivory-50">
                  {data.node_count_timeline.at(-1)?.value ?? 0}
                  <span className="ml-1.5 text-sm text-graphite-400">today</span>
                </p>
              </MetricCard>

              <MetricCard title="Job completion time" subtitle="P50 latency (submit → done)" icon={TrendingUp} accent="#22c55e">
                <Sparkline
                  data={data.platform_health.job_latency_timeline.map((d) => d.p50)}
                  color="#22c55e"
                />
                <p className="mt-2 text-lg font-light text-ivory-50">
                  {formatMs(data.platform_health.job_latency_timeline.at(-1)?.p50 ?? 0)}
                  <span className="ml-1.5 text-sm text-graphite-400">p50 today</span>
                </p>
              </MetricCard>

              <MetricCard title="Batch throughput" subtitle="Created / completed / failed" icon={Layers} accent="#d4a053">
                <div className="relative">
                  <Sparkline data={data.batch_throughput.map((d) => d.completed)} />
                </div>
                <p className="mt-2 text-lg font-light text-ivory-50">
                  {data.batch_throughput.reduce((s, d) => s + d.completed, 0)}
                  <span className="ml-1.5 text-sm text-graphite-400">shards completed</span>
                </p>
              </MetricCard>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard title="Latency" subtitle="P50 / P95 by domain" icon={TrendingUp} accent="#e8b86a">
                <div className="space-y-2.5">
                  {data.domain_latency.slice(0, 5).map((d) => (
                    <div key={d.domain} className="min-w-0">
                      <div className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate font-mono text-graphite-300">{d.domain}</span>
                        <span className="shrink-0 text-graphite-400">{formatMs(d.p95)}</span>
                      </div>
                      <HBar value={d.p95} max={maxLatency} color="#e8b86a" />
                    </div>
                  ))}
                  {!data.domain_latency.length && (
                    <p className="py-2 text-center text-xs text-graphite-500">No data yet</p>
                  )}
                </div>
              </MetricCard>

              <MetricCard title="Failure rates" subtitle="Failed ÷ total tasks" icon={Globe} accent="#ef4444">
                <div className="space-y-2.5">
                  {data.domain_failure_rates.slice(0, 5).map((d) => (
                    <div key={d.domain} className="min-w-0">
                      <div className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate font-mono text-graphite-300">{d.domain}</span>
                        <span className={`shrink-0 ${d.failure_rate > 10 ? "text-red-400" : "text-graphite-300"}`}>
                          {d.failure_rate}%
                        </span>
                      </div>
                      <HBar value={d.failure_rate} max={Math.max(maxFailRate, 20)} color={d.failure_rate > 10 ? "#ef4444" : "#85858a"} />
                    </div>
                  ))}
                  {!data.domain_failure_rates.length && (
                    <p className="py-2 text-center text-xs text-graphite-500">No data yet</p>
                  )}
                </div>
              </MetricCard>

              <MetricCard title="Credit burn" subtitle="Spend by organization" icon={CreditCard} accent="#d4a053">
                <div className="space-y-2.5">
                  {data.credit_burn_by_org.slice(0, 5).map((o) => (
                    <div key={o.org_id} className="min-w-0">
                      <div className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate text-graphite-300">{o.org_name}</span>
                        <span className="shrink-0 text-honey-400">₹{o.spend_rupees}</span>
                      </div>
                      <HBar value={o.spend_paise} max={maxBurn} color="#d4a053" />
                    </div>
                  ))}
                  {!data.credit_burn_by_org.length && (
                    <p className="py-2 text-center text-xs text-graphite-500">No data yet</p>
                  )}
                </div>
              </MetricCard>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MetricCard
                title="Contributor share"
                subtitle="Payout ÷ buyer charge (target ≥65%)"
                icon={CreditCard}
                accent="#22c55e"
              >
                <p className="text-2xl font-light text-ivory-50">
                  {data.platform_health.contributor_share_pct}%
                </p>
                <p className="mt-1 text-xs text-graphite-500">
                  Latest daily snapshot from platform ledger
                </p>
              </MetricCard>
              <MetricCard
                title="Ledger reconciliation"
                subtitle="Platform net vs buyer − payout (target ±₹0)"
                icon={TrendingUp}
                accent="#d4a053"
              >
                <p className="text-2xl font-light text-ivory-50">
                  ₹{(data.platform_health.ledger_reconciliation_delta_paise / 100).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-graphite-500">
                  Delta paise — should stay near zero
                </p>
              </MetricCard>
            </div>

            <div className="app-data-table min-w-0">
              <div className="flex items-center justify-between border-b border-graphite-700 px-4 py-2.5">
                <h2 className="text-xs font-medium uppercase tracking-wider text-graphite-400">Daily batches</h2>
                <span className="text-[10px] text-graphite-500">{range}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 font-medium text-graphite-400">Date</th>
                      <th className="px-4 py-2 text-right font-medium text-graphite-400">Created</th>
                      <th className="px-4 py-2 text-right font-medium text-honey-400">Done</th>
                      <th className="px-4 py-2 text-right font-medium text-red-400">Failed</th>
                      <th className="px-4 py-2 text-right font-medium text-graphite-400">Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batch_throughput
                      .slice()
                      .reverse()
                      .slice(0, 7)
                      .map((row) => {
                        const pct = row.created > 0 ? Math.round((row.completed / row.created) * 100) : null;
                        return (
                          <tr key={row.date}>
                            <td className="px-4 py-2 font-mono text-graphite-400">{row.date.slice(5)}</td>
                            <td className="px-4 py-2 text-right text-graphite-300">{row.created}</td>
                            <td className="px-4 py-2 text-right text-honey-400">{row.completed}</td>
                            <td className="px-4 py-2 text-right text-red-400">{row.failed}</td>
                            <td className="px-4 py-2 text-right text-graphite-300">
                              {pct !== null ? `${pct}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </DashboardPage>
    </>
  );
}
