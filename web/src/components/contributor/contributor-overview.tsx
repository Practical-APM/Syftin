"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, IndianRupee, Loader2, Wifi } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { ContributorOnboarding } from "@/components/contributor/contributor-onboarding";
import { formatPaise } from "@/lib/contributor/utils";
import { PAYOUT_THRESHOLD_PAISE } from "@/lib/env";
import type { SessionContributor } from "@/lib/auth/contributor";

type OverviewData = {
  contributor: SessionContributor;
  nodesOnline: number;
  nodesTotal: number;
  recentEarningsPaise: number;
  hasOnlineNode: boolean;
};

function StatusLink({
  href,
  label,
  value,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg border border-ivory-200 bg-ivory-50/50 px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-emerald-600" />
        <div>
          <p className="text-xs font-medium text-graphite-500">{label}</p>
          <p className="text-sm font-semibold text-graphite-900">{value}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-graphite-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </Link>
  );
}

export function ContributorOverviewClient({
  initial,
}: {
  initial: OverviewData;
}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/contributor/overview")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load overview.");
        return res.json();
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const { contributor } = data;
  const payoutProgress = Math.min(
    100,
    (contributor.balancePaise / PAYOUT_THRESHOLD_PAISE) * 100,
  );

  const networkLabel =
    contributor.meteredPause || contributor.networkMode === "paused"
      ? "Paused"
      : contributor.networkMode === "metered"
        ? "Metered"
        : "Wi‑Fi";

  return (
    <>
      <DashboardHeader title="Overview" />
      <DashboardPage>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-graphite-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </div>
        )}
        {error && <InlineError message={error} onRetry={load} />}

        <ContributorOnboarding
          hasUpi={Boolean(contributor.upiVpa)}
          hasDevice={data.nodesTotal > 0}
          hasOnlineNode={data.hasOnlineNode}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatusLink
            href="/contributor/earnings"
            icon={IndianRupee}
            label="Balance"
            value={formatPaise(contributor.balancePaise)}
          />
          <StatusLink
            href="/contributor/nodes"
            icon={Cpu}
            label="Devices online"
            value={`${data.nodesOnline} / ${data.nodesTotal}`}
          />
          <StatusLink
            href="/contributor/resources"
            icon={Wifi}
            label="Network"
            value={networkLabel}
          />
        </div>

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-graphite-900">
                Payout progress
              </p>
              <p className="mt-1 text-xs text-graphite-500">
                {formatPaise(contributor.balancePaise)} of{" "}
                {formatPaise(PAYOUT_THRESHOLD_PAISE)}
              </p>
            </div>
            <span className="text-sm font-semibold text-emerald-700">
              {Math.round(payoutProgress)}%
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ivory-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${payoutProgress}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-graphite-500">
            +{formatPaise(data.recentEarningsPaise)} in the last 24h ·{" "}
            <Link
              href="/contributor/earnings"
              className="font-medium text-emerald-700 hover:text-emerald-600"
            >
              View earnings
            </Link>
          </p>
        </Panel>
      </DashboardPage>
    </>
  );
}
