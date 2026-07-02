"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, TrendingUp, Globe, Cpu, CreditCard, Layers } from "lucide-react";
import Link from "next/link";

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

function Sparkline({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
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
    <div className="h-2 w-full rounded-full bg-neutral-800/60">
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{title}</p>
          <p className="mt-0.5 text-[11px] text-neutral-600">{subtitle}</p>
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-sm text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-white">Platform Analytics</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Node health, extraction latency, failure rates, credit burn, and batch throughput.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-10">
          <div className="flex rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            {(["7d", "30d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40" />
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
              accent="#6366f1"
            >
              <div className="space-y-2">
                <div className="h-24">
                  <Sparkline data={data.node_count_timeline.map((d) => d.value)} color="#6366f1" />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                  {data.node_count_timeline
                    .filter((_, i) => i % Math.ceil(data.node_count_timeline.length / 5) === 0)
                    .map((d) => (
                      <span key={d.date}>{d.date.slice(5)}</span>
                    ))}
                </div>
                <p className="text-lg font-light text-white">
                  {data.node_count_timeline.at(-1)?.value ?? 0}{" "}
                  <span className="text-sm text-neutral-500">nodes today</span>
                </p>
              </div>
            </StatCard>

            {/* 2. Batch Throughput */}
            <StatCard
              title="Batch Throughput"
              subtitle="Shards created / completed / failed per day"
              icon={Layers}
              accent="#10b981"
            >
              <div className="space-y-2">
                <div className="h-24 relative">
                  {/* Stacked sparklines */}
                  <Sparkline data={data.batch_throughput.map((d) => d.created)} color="#6b7280" />
                  <div className="absolute inset-0">
                    <Sparkline data={data.batch_throughput.map((d) => d.completed)} color="#10b981" />
                  </div>
                  <div className="absolute inset-0">
                    <Sparkline data={data.batch_throughput.map((d) => d.failed)} color="#ef4444" />
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-neutral-500 mt-1">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-neutral-500" />Created</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Completed</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />Failed</span>
                </div>
                <p className="text-lg font-light text-white">
                  {data.batch_throughput.reduce((s, d) => s + d.completed, 0)}{" "}
                  <span className="text-sm text-neutral-500">shards completed</span>
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
              accent="#f59e0b"
            >
              <div className="space-y-3">
                {data.domain_latency.slice(0, 6).map((d) => (
                  <div key={d.domain}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-mono text-neutral-300 truncate max-w-[120px]">{d.domain}</span>
                      <span className="text-neutral-500 shrink-0 ml-2">
                        {formatMs(d.p50)} / <span className="text-amber-400">{formatMs(d.p95)}</span>
                      </span>
                    </div>
                    <HBar value={d.p95} max={maxLatency} color="#f59e0b" />
                  </div>
                ))}
                {!data.domain_latency.length && (
                  <p className="text-xs text-neutral-600 text-center py-4">No latency data yet</p>
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
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-mono text-neutral-300 truncate max-w-[120px]">{d.domain}</span>
                      <span className={`shrink-0 ml-2 font-medium ${d.failure_rate > 10 ? "text-red-400" : d.failure_rate > 5 ? "text-amber-400" : "text-emerald-400"}`}>
                        {d.failure_rate}%
                      </span>
                    </div>
                    <HBar value={d.failure_rate} max={Math.max(maxFailRate, 20)} color={d.failure_rate > 10 ? "#ef4444" : d.failure_rate > 5 ? "#f59e0b" : "#10b981"} />
                  </div>
                ))}
                {!data.domain_failure_rates.length && (
                  <p className="text-xs text-neutral-600 text-center py-4">No failure data yet</p>
                )}
              </div>
            </StatCard>

            {/* 5. Credit Burn by Org */}
            <StatCard
              title="Credit Burn"
              subtitle="Buyer spend by organization"
              icon={CreditCard}
              accent="#8b5cf6"
            >
              <div className="space-y-3">
                {data.credit_burn_by_org.slice(0, 6).map((o) => (
                  <div key={o.org_id}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-neutral-300 truncate max-w-[120px]">{o.org_name}</span>
                      <span className="shrink-0 ml-2 text-violet-400">₹{o.spend_rupees}</span>
                    </div>
                    <HBar value={o.spend_paise} max={maxBurn} color="#8b5cf6" />
                  </div>
                ))}
                {!data.credit_burn_by_org.length && (
                  <p className="text-xs text-neutral-600 text-center py-4">No credit transactions yet</p>
                )}
              </div>
            </StatCard>
          </div>

          {/* Batch details table */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-300">Daily Batch Summary</h2>
              <span className="text-xs text-neutral-600">Last {range}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-neutral-500 uppercase tracking-wider border-b border-neutral-800/60">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Created</th>
                    <th className="px-5 py-3 text-right text-emerald-500">Completed</th>
                    <th className="px-5 py-3 text-right text-red-500">Failed</th>
                    <th className="px-5 py-3 text-right text-neutral-500">Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {data.batch_throughput
                    .slice()
                    .reverse()
                    .map((row) => {
                      const pct = row.created > 0
                        ? Math.round((row.completed / row.created) * 100)
                        : null;
                      return (
                        <tr key={row.date} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="px-5 py-3 font-mono text-neutral-400">{row.date}</td>
                          <td className="px-5 py-3 text-right text-neutral-300">{row.created}</td>
                          <td className="px-5 py-3 text-right text-emerald-400">{row.completed}</td>
                          <td className="px-5 py-3 text-right text-red-400">{row.failed}</td>
                          <td className="px-5 py-3 text-right">
                            {pct !== null ? (
                              <span className={pct >= 90 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-red-400"}>
                                {pct}%
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
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
    </div>
  );
}
