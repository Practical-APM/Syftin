"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, Globe, Cpu, CreditCard, Layers } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "7d" | "30d";

type AnalyticsData = {
  range: string;
  node_count_timeline: { date: string; value: number }[];
  domain_latency: { domain: string; p50: number; p95: number; count: number }[];
  domain_failure_rates: { domain: string; failure_rate: number; total: number; failed: number }[];
  credit_burn_by_org: { org_id: string; org_name: string; spend_paise: number; spend_rupees: string }[];
  batch_throughput: { date: string; created: number; completed: number; failed: number }[];
};

// ─── Chart helpers ────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#d4a053" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 40;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#sg-${color.replace("#", "")})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-graphite-800/60">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
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
    <div className="rounded-xl border border-graphite-700 bg-graphite-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-graphite-400">{title}</p>
          <p className="mt-0.5 text-[11px] text-graphite-500">{subtitle}</p>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}22` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
        description="Node health, extraction latency, failure rates, credit burn, and batch throughput."
        action={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-graphite-700 bg-graphite-900">
              {(["7d", "30d"] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r
                      ? "bg-honey-500 text-graphite-950"
                      : "text-graphite-400 hover:text-ivory-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-1.5 text-xs text-graphite-400 transition-colors hover:text-ivory-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />
      <DashboardPage className="max-w-7xl space-y-8">

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-graphite-700 bg-graphite-900/40" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Row 1: Node timeline + Batch throughput */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* 1. Node Health Timeline */}
            <StatCard
              title="Node Health"
              subtitle="Online contributor nodes per day"
              icon={Cpu}
              accent="#d4a053"
            >
              <div className="space-y-2">
                <div className="h-24">
                  <Sparkline data={data.node_count_timeline.map((d) => d.value)} color="#d4a053" />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-graphite-500">
                  {data.node_count_timeline
                    .filter((_, i) => i % Math.ceil(data.node_count_timeline.length / 5) === 0)
                    .map((d) => (
                      <span key={d.date}>{d.date.slice(5)}</span>
                    ))}
                </div>
                <p className="text-lg font-light text-ivory-50">
                  {data.node_count_timeline.at(-1)?.value ?? 0}{" "}
                  <span className="text-sm text-graphite-400">nodes today</span>
                </p>
              </div>
            </StatCard>

            {/* 2. Batch Throughput */}
            <StatCard
              title="Batch Throughput"
              subtitle="Shards created / completed / failed per day"
              icon={Layers}
              accent="#d4a053"
            >
              <div className="space-y-2">
                <div className="relative h-24">
                  <Sparkline data={data.batch_throughput.map((d) => d.created)} color="#6b6b70" />
                  <div className="absolute inset-0">
                    <Sparkline data={data.batch_throughput.map((d) => d.completed)} color="#d4a053" />
                  </div>
                  <div className="absolute inset-0">
                    <Sparkline data={data.batch_throughput.map((d) => d.failed)} color="#ef4444" />
                  </div>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-graphite-400">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-graphite-500" />Created</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-honey-500" />Completed</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />Failed</span>
                </div>
                <p className="text-lg font-light text-ivory-50">
                  {data.batch_throughput.reduce((s, d) => s + d.completed, 0)}{" "}
                  <span className="text-sm text-graphite-400">shards completed</span>
                </p>
              </div>
            </StatCard>
          </div>

          {/* Row 2: Domain latency + Failure rates + Credit burn */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* 3. Extraction Latency */}
            <StatCard
              title="Extraction Latency"
              subtitle="P50 / P95 per domain"
              icon={TrendingUp}
              accent="#e8b86a"
            >
              <div className="space-y-3">
                {data.domain_latency.slice(0, 6).map((d) => (
                  <div key={d.domain}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="max-w-[120px] truncate font-mono text-graphite-300">{d.domain}</span>
                      <span className="ml-2 shrink-0 text-graphite-400">
                        {formatMs(d.p50)} / <span className="text-honey-400">{formatMs(d.p95)}</span>
                      </span>
                    </div>
                    <HBar value={d.p95} max={maxLatency} color="#e8b86a" />
                  </div>
                ))}
                {!data.domain_latency.length && (
                  <p className="py-4 text-center text-xs text-graphite-500">No latency data yet</p>
                )}
              </div>
            </StatCard>

            {/* 4. Domain Failure Rates */}
            <StatCard
              title="Domain Failure Rates"
              subtitle="Failed tasks ÷ total tasks"
              icon={Globe}
              accent="#ef4444"
            >
              <div className="space-y-3">
                {data.domain_failure_rates.slice(0, 6).map((d) => (
                  <div key={d.domain}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="max-w-[120px] truncate font-mono text-graphite-300">{d.domain}</span>
                      <span className={`ml-2 shrink-0 font-medium ${d.failure_rate > 10 ? "text-red-400" : d.failure_rate > 5 ? "text-honey-400" : "text-graphite-300"}`}>
                        {d.failure_rate}%
                      </span>
                    </div>
                    <HBar value={d.failure_rate} max={Math.max(maxFailRate, 20)} color={d.failure_rate > 10 ? "#ef4444" : d.failure_rate > 5 ? "#e8b86a" : "#85858a"} />
                  </div>
                ))}
                {!data.domain_failure_rates.length && (
                  <p className="py-4 text-center text-xs text-graphite-500">No failure data yet</p>
                )}
              </div>
            </StatCard>

            {/* 5. Credit Burn by Org */}
            <StatCard
              title="Credit Burn"
              subtitle="Buyer spend by organization"
              icon={CreditCard}
              accent="#d4a053"
            >
              <div className="space-y-3">
                {data.credit_burn_by_org.slice(0, 6).map((o) => (
                  <div key={o.org_id}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="max-w-[120px] truncate text-graphite-300">{o.org_name}</span>
                      <span className="ml-2 shrink-0 text-honey-400">₹{o.spend_rupees}</span>
                    </div>
                    <HBar value={o.spend_paise} max={maxBurn} color="#d4a053" />
                  </div>
                ))}
                {!data.credit_burn_by_org.length && (
                  <p className="py-4 text-center text-xs text-graphite-500">No credit transactions yet</p>
                )}
              </div>
            </StatCard>
          </div>

          {/* Batch details table */}
          <div className="app-data-table">
            <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-3">
              <h2 className="text-sm font-normal text-graphite-300">Daily Batch Summary</h2>
              <span className="text-xs text-graphite-500">Last {range}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="px-5 py-3 font-medium uppercase tracking-wider text-graphite-400">Date</th>
                    <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-graphite-400">Created</th>
                    <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-honey-400">Completed</th>
                    <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-red-400">Failed</th>
                    <th className="px-5 py-3 text-right font-medium uppercase tracking-wider text-graphite-400">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.batch_throughput
                    .slice()
                    .reverse()
                    .map((row) => {
                      const pct = row.created > 0
                        ? Math.round((row.completed / row.created) * 100)
                        : null;
                      return (
                        <tr key={row.date}>
                          <td className="px-5 py-3 font-mono text-graphite-400">{row.date}</td>
                          <td className="px-5 py-3 text-right text-graphite-300">{row.created}</td>
                          <td className="px-5 py-3 text-right text-honey-400">{row.completed}</td>
                          <td className="px-5 py-3 text-right text-red-400">{row.failed}</td>
                          <td className="px-5 py-3 text-right">
                            {pct !== null ? (
                              <span className={pct >= 90 ? "text-honey-400" : pct >= 70 ? "text-honey-500" : "text-red-400"}>
                                {pct}%
                              </span>
                            ) : (
                              <span className="text-graphite-500">—</span>
                            )}
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
