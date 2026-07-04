"use client";

import { useCallback, useEffect, useState } from "react";
import { Cpu, Loader2, Wifi, WifiOff } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel, StatCard } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { formatPaise } from "@/lib/contributor/utils";
import { formatDate } from "@/lib/utils";
import type { AdminContributorFleet } from "@/lib/data/admin-contributors";

export function AdminContributorFleetClient() {
  const [data, setData] = useState<AdminContributorFleet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/contributors")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load contributor fleet.");
        return r.json();
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <DashboardHeader
        title="Contributor fleet"
        description="Live edge nodes, hardware tiers, and payout readiness for Persona B operators."
      />
      <DashboardPage>
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading fleet…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : data ? (
          <>
            <div className="app-stat-grid">
              <StatCard label="Contributors" value={String(data.stats.contributors)} />
              <StatCard
                label="Devices online"
                value={`${data.stats.nodesOnline} / ${data.stats.nodesTotal}`}
              />
              <StatCard
                label="Pending fetches"
                value={String(data.stats.pendingFetchTasks)}
              />
              <StatCard
                label="Avg tasks / node"
                value={String(data.stats.avgTasksPerNode)}
              />
              <StatCard
                label="CGNAT risk"
                value={data.stats.cgnatRiskHigh ? "High" : "Normal"}
                valueClassName={
                  data.stats.cgnatRiskHigh ? "text-amber-600" : "text-emerald-600"
                }
              />
              <StatCard
                label="Fleet health"
                value={
                  data.stats.nodesTotal === 0
                    ? "No nodes"
                    : data.stats.nodesOnline > 0
                      ? "Active"
                      : "Offline"
                }
                valueClassName={
                  data.stats.nodesTotal === 0
                    ? undefined
                    : data.stats.nodesOnline > 0
                      ? "text-emerald-600"
                      : "text-amber-600"
                }
              />
            </div>

            {data.ipWarnings.length > 0 && (
              <Panel className="border-amber-200 bg-amber-50/80">
                <p className="text-sm font-medium text-amber-900">
                  CGNAT / shared IP concentration
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {data.ipWarnings.map((w) => (
                    <li key={w.ip}>
                      {w.nodeCount} nodes share public IP{" "}
                      <span className="font-mono">{w.ip}</span> — target sites may
                      rate-limit this address.
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {data.contributors.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ivory-200 bg-white px-6 py-12 text-center text-sm text-graphite-500">
                No contributors yet. Add invites under Contributor invites.
              </p>
            ) : (
              <div className="space-y-4">
                {data.contributors.map((contributor) => (
                  <Panel key={contributor.id} padding="none" className="overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ivory-100 bg-ivory-50/60 px-5 py-4">
                      <div>
                        <p className="font-medium text-graphite-900">
                          {contributor.display_name ?? contributor.email ?? "Contributor"}
                        </p>
                        <p className="mt-0.5 text-xs text-graphite-500">
                          {contributor.email ?? "—"} · {contributor.compute_tier}
                          {!contributor.is_active && (
                            <span className="ml-2 text-amber-600">inactive</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-graphite-600">
                        <p className="font-semibold text-graphite-900">
                          {formatPaise(contributor.balance_paise)}
                        </p>
                        <p className="mt-0.5">
                          {contributor.upi_vpa ? "UPI set" : "UPI missing"}
                          {" · "}
                          {contributor.network_mode}
                        </p>
                      </div>
                    </div>

                    {contributor.nodes.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-graphite-500">
                        No devices registered.
                      </p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-ivory-100 text-xs text-graphite-500">
                            <th className="px-5 py-3 font-medium">Device</th>
                            <th className="px-5 py-3 font-medium">Region</th>
                            <th className="px-5 py-3 font-medium">Tier</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Tasks</th>
                            <th className="px-5 py-3 font-medium">Last seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributor.nodes.map((node) => (
                            <tr
                              key={node.id}
                              className="border-b border-ivory-50 last:border-0"
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 font-medium text-graphite-900">
                                  <Cpu className="h-4 w-4 text-graphite-400" />
                                  {node.machine_label}
                                </div>
                                {node.hostname && (
                                  <p className="mt-0.5 text-xs text-graphite-500">
                                    {node.hostname}
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-3 text-xs text-graphite-700">
                                {node.region ? (
                                  <span className="flex items-center gap-1.5" title={node.region}>
                                    <span className="text-sm">
                                      {String.fromCodePoint(
                                        ...node.region
                                          .toUpperCase()
                                          .split("")
                                          .map((c) => 127397 + c.charCodeAt(0))
                                      )}
                                    </span>
                                    <span className="text-graphite-500">{node.region}</span>
                                  </span>
                                ) : (
                                  <span className="text-graphite-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-xs text-graphite-700">
                                {node.detected_tier ?? node.compute_tier}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    node.status === "online"
                                      ? "text-emerald-600"
                                      : node.status === "paused"
                                        ? "text-amber-600"
                                        : "text-graphite-500"
                                  }`}
                                >
                                  {node.status === "online" ? (
                                    <Wifi className="h-3 w-3" />
                                  ) : (
                                    <WifiOff className="h-3 w-3" />
                                  )}
                                  {node.status}
                                  {node.connection_metered && (
                                    <span className="text-amber-600">· metered</span>
                                  )}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-graphite-700">
                                {node.tasks_completed}
                              </td>
                              <td className="px-5 py-3 text-xs text-graphite-500">
                                {node.last_seen_at
                                  ? formatDate(node.last_seen_at)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Panel>
                ))}
              </div>
            )}
          </>
        ) : null}
      </DashboardPage>
    </>
  );
}
