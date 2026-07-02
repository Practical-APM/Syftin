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
            <p className="font-medium text-emerald-900">
              Copy this token now — it won&apos;t be shown again
            </p>
            <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-graphite-800">
              {newToken}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newToken)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"
              >
                <Copy className="h-3 w-3" />
                Copy token
              </button>
              <a
                href={`/contributor/download?token=${encodeURIComponent(newToken)}`}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Next: Install →
              </a>
            </div>
          </AlertBanner>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : nodes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
            No devices registered yet. Add one above, then run the node app.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory-50/80">
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Device
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Profile
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Tasks
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Last seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr
                    key={node.id}
                    className="border-b border-ivory-100 last:border-0"
                  >
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4 text-xs text-graphite-600">
                      <p className="font-medium text-graphite-800">
                        {TIER_DETAILS[
                          (node.detected_tier ??
                            node.compute_tier) as keyof typeof TIER_DETAILS
                        ]?.label ?? tierLabel(node.compute_tier)}
                      </p>
                      <p className="mt-0.5 text-graphite-500">
                        {nodeTypeLabel(node.node_type)}
                        {node.fetch_mode ? ` · ${node.fetch_mode}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-graphite-400">
                        {formatCapabilities(node.capabilities)}
                        {node.connection_metered && (
                          <span className="ml-1 text-amber-600">
                            · metered connection
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          node.status === "online"
                            ? "text-xs font-medium text-emerald-600"
                            : node.status === "paused"
                              ? "text-xs font-medium text-amber-600"
                              : "text-xs font-medium text-graphite-500"
                        }
                      >
                        {node.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-graphite-700">
                      {node.tasks_completed}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-500">
                      {node.last_seen_at
                        ? formatDate(node.last_seen_at)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPage>
    </>
  );
}
