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
  distributedFetch?: {
    inFlight: number;
    completed: number;
    failed: number;
    expired: number;
    jobsAwaitingCapacity: number;
  };
  governance?: {
    totalDomains: number;
    domainsPendingReview: number;
    domainsReviewOverdue: number;
  };
  truthArbiter?: {
    pending: number;
  };
  infra?: {
    payloadStorageConfigured: boolean;
    emailApiConfigured: boolean;
    billingLockedOrgs: number;
    recentLedgerDeltas: number;
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

            {data.distributedFetch && (
              <Panel>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-graphite-900">
                    Distributed fetch
                  </h2>
                  <Link href="/admin/analytics" className="text-xs text-honey-600">
                    Analytics →
                  </Link>
                </div>
                {data.distributedFetch.jobsAwaitingCapacity > 0 && (
                  <AlertBanner variant="warning" className="mt-3">
                    <p className="text-xs text-graphite-700">
                      {data.distributedFetch.jobsAwaitingCapacity} job(s) waiting for
                      contributor capacity. The hub self-serves after the fetch
                      timeout if no node claims the pages.
                    </p>
                  </AlertBanner>
                )}
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCell label="Pages in flight" value={data.distributedFetch.inFlight} />
                  <StatCell label="Pages completed" value={data.distributedFetch.completed} />
                  <StatCell
                    label="Pages failed"
                    value={data.distributedFetch.failed}
                    tone={data.distributedFetch.failed > 0 ? "danger" : "default"}
                  />
                  <StatCell
                    label="Pages expired"
                    value={data.distributedFetch.expired}
                    tone={data.distributedFetch.expired > 0 ? "warning" : "default"}
                  />
                </dl>
              </Panel>
            )}

            {data.infra && (
              <Panel>
                <h2 className="text-sm font-semibold text-graphite-900">
                  Phase 4 infrastructure
                </h2>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-graphite-600">
                  <ServicePill
                    ok={data.infra.payloadStorageConfigured}
                    label="Payload S3 offload"
                  />
                  <ServicePill
                    ok={data.infra.emailApiConfigured}
                    label="Email OTP provider"
                  />
                </div>
                {(data.infra.billingLockedOrgs > 0 ||
                  data.infra.recentLedgerDeltas > 0) && (
                  <AlertBanner variant="warning" className="mt-3">
                    <p className="text-xs text-graphite-700">
                      {data.infra.billingLockedOrgs > 0 &&
                        `${data.infra.billingLockedOrgs} workspace(s) locked for billing reconciliation. `}
                      {data.infra.recentLedgerDeltas > 0 &&
                        `${data.infra.recentLedgerDeltas} ledger delta event(s) in the last 7 days.`}
                      {" "}
                      <Link href="/admin/organizations" className="text-honey-600">
                        Review workspaces →
                      </Link>
                    </p>
                  </AlertBanner>
                )}
              </Panel>
            )}

            {data.truthArbiter && data.truthArbiter.pending > 0 && (
              <AlertBanner variant="warning">
                <p className="font-medium">
                  {data.truthArbiter.pending} truth arbiter task
                  {data.truthArbiter.pending === 1 ? "" : "s"} awaiting review
                </p>
                <p className="mt-1 text-sm">
                  Hub vs edge semantic mismatches on consensus domains.{" "}
                  <Link href="/admin/truth" className="text-honey-600">
                    Open queue →
                  </Link>
                </p>
              </AlertBanner>
            )}

            {data.governance && data.governance.totalDomains > 0 && (
              <Panel>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-graphite-900">
                    Legal governance
                  </h2>
                  <Link href="/admin/domains" className="text-xs text-honey-600">
                    Manage domains →
                  </Link>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StatCell label="Approved domains" value={data.governance.totalDomains} />
                  <StatCell
                    label="Pending legal sign-off"
                    value={data.governance.domainsPendingReview}
                    tone={data.governance.domainsPendingReview > 0 ? "warning" : "default"}
                  />
                  <StatCell
                    label="Review overdue"
                    value={data.governance.domainsReviewOverdue}
                    tone={data.governance.domainsReviewOverdue > 0 ? "danger" : "default"}
                  />
                </dl>
              </Panel>
            )}
          </>
        )}
      </DashboardPage>
    </>
  );
}

function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-graphite-900";
  return (
    <div className="rounded-lg bg-ivory-50 px-4 py-3">
      <p className="text-xs text-graphite-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueColor}`}>{value}</p>
    </div>
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

