"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, Loader2, TrendingUp, Wifi } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { ContributorOnboarding } from "@/components/contributor/contributor-onboarding";
import { formatPaise } from "@/lib/contributor/utils";
import { PAYOUT_THRESHOLD_PAISE } from "@/lib/env";
import type { SessionContributor } from "@/lib/auth/contributor";
import { cn } from "@/lib/utils";

type OverviewData = {
  contributor: SessionContributor;
  nodesOnline: number;
  nodesTotal: number;
  recentEarningsPaise: number;
  hasOnlineNode: boolean;
};

function MetricTile({
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
      className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-graphite-700 bg-graphite-900/60 px-4 py-3.5 transition-colors hover:border-honey-500/30 hover:bg-graphite-900"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-honey-500/10">
          <Icon className="h-4 w-4 text-honey-400" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-graphite-400">{label}</p>
          <p className="truncate text-sm font-medium text-ivory-50">{value}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-graphite-500 transition-transform group-hover:translate-x-0.5 group-hover:text-honey-400" />
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

  const nodeStatus =
    data.nodesTotal === 0
      ? "No devices"
      : data.hasOnlineNode
        ? `${data.nodesOnline} online`
        : "All offline";

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="Balance, devices, and payout progress at a glance."
      />
      <DashboardPage className="space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-graphite-400">
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

        <Panel className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-honey-500/5 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-graphite-400">
                Available balance
              </p>
              <p className="app-stat-value mt-1 text-4xl text-honey-400">
                {formatPaise(contributor.balancePaise)}
              </p>
              <p className="mt-2 text-sm text-graphite-300">
                +{formatPaise(data.recentEarningsPaise)} in the last 24h
              </p>
            </div>
            <Link
              href="/contributor/earnings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-700 px-3 py-2 text-xs font-medium text-graphite-300 transition-colors hover:border-honey-500/40 hover:text-honey-400"
            >
              View earnings
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="relative mt-6 border-t border-graphite-700 pt-5">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-graphite-400">
                Payout at {formatPaise(PAYOUT_THRESHOLD_PAISE)}
              </span>
              <span className="font-medium text-honey-400">{Math.round(payoutProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-graphite-800">
              <div
                className="h-full rounded-full bg-honey-500 transition-all"
                style={{ width: `${payoutProgress}%` }}
              />
            </div>
            {!contributor.upiVpa && (
              <p className="mt-3 text-xs text-graphite-400">
                Add your UPI ID in{" "}
                <Link href="/contributor/setup" className="font-medium text-honey-400 hover:text-honey-300">
                  Setup
                </Link>{" "}
                to receive payouts.
              </p>
            )}
          </div>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            href="/contributor/nodes"
            icon={Cpu}
            label="Devices"
            value={
              data.nodesTotal > 0
                ? `${data.nodesOnline} / ${data.nodesTotal} · ${nodeStatus}`
                : "Register a device"
            }
          />
          <MetricTile
            href="/contributor/resources"
            icon={Wifi}
            label="Network"
            value={networkLabel}
          />
          <MetricTile
            href="/contributor/earnings"
            icon={TrendingUp}
            label="Tier"
            value={contributor.computeTier ? contributor.computeTier.charAt(0).toUpperCase() + contributor.computeTier.slice(1) : "Auto-detect"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/contributor/download"
            className={cn(
              "rounded-xl border border-graphite-700 bg-graphite-900/40 p-4 transition-colors hover:border-honey-500/30",
            )}
          >
            <p className="text-sm font-medium text-ivory-50">Install node app</p>
            <p className="mt-1 text-xs text-graphite-400">
              One-line command for macOS, Linux, or Windows.
            </p>
          </Link>
          <Link
            href="/contributor/help"
            className="rounded-xl border border-graphite-700 bg-graphite-900/40 p-4 transition-colors hover:border-honey-500/30"
          >
            <p className="text-sm font-medium text-ivory-50">Help & troubleshooting</p>
            <p className="mt-1 text-xs text-graphite-400">
              FAQs, tier guide, and offline device fixes.
            </p>
          </Link>
        </div>
      </DashboardPage>
    </>
  );
}
