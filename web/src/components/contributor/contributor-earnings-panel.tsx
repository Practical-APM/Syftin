"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/ui/card";
import { InlineError } from "@/components/ui/error-fallback";
import { economicsSummary } from "@/lib/contributor/economics";
import { formatPaise } from "@/lib/contributor/utils";
import { PAYOUT_THRESHOLD_PAISE } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import type { ContributorEarning } from "@/lib/data/contributors";
import type { SessionContributor } from "@/lib/auth/contributor";

const economics = economicsSummary();

function rewardTierLabel(row: ContributorEarning): string | null {
  if (!row.reward_tier) return null;
  const tier = row.reward_tier.charAt(0).toUpperCase() + row.reward_tier.slice(1);
  if (row.edge_inference) return `${tier} · GPU parse`;
  return tier;
}

export function ContributorEarningsPanel({
  contributor,
}: {
  contributor: SessionContributor;
}) {
  const [earnings, setEarnings] = useState<ContributorEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/contributor/earnings");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load earnings.");
      setLoading(false);
      return;
    }
    setEarnings(data.earnings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <DashboardHeader
        title="Earnings"
        description={`${economics.contributorSharePercent}% of each ₹${(economics.jobPricePaise / 100).toFixed(0)} buyer job · Scout ${formatPaise(economics.scoutRewardPaise)} · Ranger ${formatPaise(economics.rangerRewardPaise)} · Titan/GPU up to ${formatPaise(economics.maxContributorPayoutPaise)} · UPI payout at ${formatPaise(PAYOUT_THRESHOLD_PAISE)}`}
      />
      <DashboardPage>
        <StatCard
          label="Current balance"
          value={formatPaise(contributor.balancePaise)}
          hint={
            contributor.upiVpa
              ? `UPI: ${contributor.upiVpa}`
              : "Add UPI in Setup to receive payouts"
          }
          accent="honey"
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading earnings…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : earnings.length === 0 ? (
          <p className="text-sm text-graphite-400">
            No earnings yet. Keep your node app running to claim fetch tasks.
          </p>
        ) : (
          <div className="app-data-table overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Amount</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">Task</th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-400">When</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((row) => (
                  <tr key={row.id} className="border-t border-graphite-800">
                    <td className="px-5 py-4 font-medium text-honey-400">
                      +{formatPaise(row.amount_paise)}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-400">
                      {rewardTierLabel(row) ?? "Fetch task"}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-400">
                      {formatDate(row.created_at)}
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
