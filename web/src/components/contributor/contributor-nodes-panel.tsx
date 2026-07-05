"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Cpu, Loader2, Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { AlertBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineError } from "@/components/ui/error-fallback";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatCapabilities, nodeTypeLabel, TIER_DETAILS } from "@/lib/contributor/tier";
import { tierLabel } from "@/lib/contributor/utils";
import type { ContributorNode } from "@/lib/data/contributors";

export function ContributorNodesPanel() {
  const [nodes, setNodes] = useState<ContributorNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/contributor/nodes");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load devices.");
      setLoading(false);
      return;
    }
    setNodes(data.nodes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setNewToken(null);
    const res = await fetch("/api/contributor/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineLabel: label || "My laptop" }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not register device.");
      return;
    }
    setNewToken(data.token as string);
    setLabel("");
    load();
  }

  return (
    <>
      <DashboardHeader
        title="My devices"
        description="Each laptop or desktop runs the Syftin node app with its own token."
      />
      <DashboardPage>
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-center gap-3"
        >
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="MacBook Air"
            className="min-w-[200px] flex-1"
          />
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Register device
              </>
            )}
          </Button>
        </form>

        {error && !loading && (
          <AlertBanner variant="error">
            <p>{error}</p>
          </AlertBanner>
        )}

        {newToken && (
          <AlertBanner variant="success">
            <p className="font-medium">
              Copy this token now — it won&apos;t be shown again
            </p>
            <code className="mt-3 block break-all rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 font-mono text-xs text-graphite-200">
              {newToken}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newToken)}
                className="inline-flex items-center gap-1 text-xs font-medium text-honey-400 hover:text-honey-300"
              >
                <Copy className="h-3 w-3" />
                Copy token
              </button>
              <a
                href={`/contributor/download?token=${encodeURIComponent(newToken)}`}
                className="inline-flex items-center gap-1 rounded-md bg-honey-500 px-2.5 py-1 text-xs font-medium text-graphite-950 hover:bg-honey-400"
              >
                Download installer →
              </a>
            </div>
          </AlertBanner>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : nodes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-graphite-700 bg-graphite-900/40 px-6 py-10 text-center text-sm text-graphite-400">
            No devices registered yet. Add one above, then download the installer.
          </p>
        ) : (
          <>
            {nodes.some(
              (n) =>
                n.ip_cooldown_until &&
                new Date(n.ip_cooldown_until).getTime() > Date.now(),
            ) && (
              <AlertBanner variant="warning">
                <p className="font-medium text-amber-200">
                  Fetching paused on your network
                </p>
                <p className="mt-1 text-sm text-graphite-300">
                  A target site rate-limited your public IP after block-like errors.
                  New tasks are paused for about an hour so normal browsing recovers.
                  Pause the node under Network if Amazon or other sites still break.
                </p>
              </AlertBanner>
            )}
          <div className="app-data-table overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Device</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Profile</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Tasks</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id} className="border-t border-graphite-800">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium text-ivory-50">
                        <Cpu className="h-4 w-4 text-graphite-500" />
                        {node.machine_label}
                      </div>
                      {node.hostname && (
                        <p className="mt-0.5 text-xs text-graphite-500">{node.hostname}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-400">
                      <p className="font-medium text-graphite-200">
                        {TIER_DETAILS[
                          (node.detected_tier ??
                            node.compute_tier) as keyof typeof TIER_DETAILS
                        ]?.label ?? tierLabel(node.compute_tier)}
                      </p>
                      <p className="mt-0.5 text-graphite-500">
                        {nodeTypeLabel(node.node_type)}
                        {node.fetch_mode ? ` · ${node.fetch_mode}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-graphite-500">
                        {formatCapabilities(node.capabilities)}
                        {node.connection_metered && (
                          <span className="ml-1 text-amber-400">· metered connection</span>
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          node.status === "online"
                            ? "text-xs font-medium text-honey-400"
                            : node.status === "paused"
                              ? "text-xs font-medium text-amber-400"
                              : "text-xs font-medium text-graphite-500"
                        }
                      >
                        {node.status}
                      </span>
                      {node.ip_cooldown_until &&
                        new Date(node.ip_cooldown_until).getTime() > Date.now() && (
                          <p className="mt-1 text-[10px] text-amber-400">
                            IP cooldown until{" "}
                            {formatDate(node.ip_cooldown_until)}
                          </p>
                        )}
                    </td>
                    <td className="px-5 py-4 text-graphite-300">{node.tasks_completed}</td>
                    <td className="px-5 py-4 text-xs text-graphite-500">
                      {node.last_seen_at ? formatDate(node.last_seen_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </DashboardPage>
    </>
  );
}
