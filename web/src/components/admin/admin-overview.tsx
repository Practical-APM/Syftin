"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { AlertBanner, Panel } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { formatDate } from "@/lib/utils";

type Overview = {
  organizations: number;
  jobs: Record<string, number>;
  pendingInvites: number;
  worker: { ok: boolean; lastSeen: string | null; workerId: string | null };
  contributors: {
    total: number;
    nodesOnline: number;
    nodesTotal: number;
    pendingFetchTasks: number;
  };
  supabase: boolean;
  ollama: boolean;
  status: string;
};

export function AdminOverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load platform overview.");
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
  }, [load]);

  return (
    <>
      <DashboardHeader
        title="Platform overview"
      />
      <DashboardPage>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading platform status…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : !data ? (
          <p className="text-sm text-graphite-500">Could not load overview.</p>
        ) : (
          <>
            <AlertBanner
              variant={data.status === "ready" ? "success" : "warning"}
            >
              <p className="font-medium text-graphite-900">
                Platform status:{" "}
                <span
                  className={
                    data.status === "ready" ? "text-emerald-700" : "text-amber-700"
                  }
                >
                  {data.status === "ready" ? "Ready" : "Degraded"}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-graphite-600">
                <ServicePill ok={data.supabase} label="Supabase" />
                <ServicePill ok={data.ollama} label="Ollama" />
                <ServicePill ok={data.worker.ok} label="Worker heartbeat" />
              </div>
              {data.worker.lastSeen && (
                <p className="mt-2 text-xs text-graphite-500">
                  Last worker ping: {formatDate(data.worker.lastSeen)}
                  {data.worker.workerId ? ` · ${data.worker.workerId}` : ""}
                </p>
              )}
            </AlertBanner>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/admin/organizations" className="block">
                <Panel padding="md" className="transition-shadow hover:shadow-md">
                  <p className="text-xs font-medium text-graphite-500">Workspaces</p>
                  <p className="mt-1 text-2xl font-semibold text-graphite-900">
                    {data.organizations}
                  </p>
                  <p className="mt-2 text-xs text-honey-600">Manage →</p>
                </Panel>
              </Link>
              <Link href="/admin/invites" className="block">
                <Panel padding="md" className="transition-shadow hover:shadow-md">
                  <p className="text-xs font-medium text-graphite-500">Pending invites</p>
                  <p className="mt-1 text-2xl font-semibold text-graphite-900">
                    {data.pendingInvites}
                  </p>
                  <p className="mt-2 text-xs text-honey-600">View invites →</p>
                </Panel>
              </Link>
              <Link href="/admin/contributors" className="block">
                <Panel padding="md" className="transition-shadow hover:shadow-md">
                  <p className="text-xs font-medium text-graphite-500">Fleet status</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">
                    {data.contributors.nodesOnline}/{data.contributors.nodesTotal}
                  </p>
                  <p className="mt-2 text-xs text-honey-600">View fleet →</p>
                </Panel>
              </Link>
            </div>

            <Panel>
              <h2 className="text-sm font-semibold text-graphite-900">
                Job breakdown
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(data.jobs).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex justify-between rounded-lg bg-ivory-50 px-4 py-3 text-sm"
                  >
                    <dt className="capitalize text-graphite-500">{status}</dt>
                    <dd className="font-medium text-graphite-900">{count}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </>
        )}
      </DashboardPage>
    </>
  );
}

function ServicePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-red-500" />
      )}
      {label}
    </span>
  );
}

