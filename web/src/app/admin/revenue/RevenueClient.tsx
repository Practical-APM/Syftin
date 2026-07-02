"use client";

import { useState, useEffect } from "react";
import { Download, DollarSign, TrendingUp, Users } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";

type RevenueData = {
  totals: {
    buyer_charge_paise: number;
    contributor_payout_paise: number;
    platform_net_paise: number;
  };
  timeseries: {
    date: string;
    charge: number;
    payout: number;
    net: number;
  }[];
};

export function RevenueClient() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/revenue")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const formatPaise = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

  return (
    <>
      <DashboardHeader
        backHref="/admin"
        backLabel="Back to Admin"
        title="Platform Revenue"
        description="Ledger aggregation of buyer charges and contributor payouts."
        action={
          <a
            href="/api/admin/settlement"
            download
            className="inline-flex h-9 items-center justify-center rounded-lg border border-graphite-700 bg-transparent px-4 py-2 text-sm font-medium text-graphite-300 transition-colors hover:bg-graphite-800 hover:text-ivory-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Settlement CSV
          </a>
        }
      />
      <DashboardPage className="space-y-8">
        {loading ? (
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-graphite-700 bg-graphite-900"
                />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard
                title="Total Buyer Charges"
                value={formatPaise(data.totals.buyer_charge_paise)}
                icon={<DollarSign className="h-5 w-5 text-honey-400" />}
              />
              <StatCard
                title="Contributor Payouts"
                value={formatPaise(data.totals.contributor_payout_paise)}
                icon={<Users className="h-5 w-5 text-emerald-400" />}
              />
              <StatCard
                title="Platform Net"
                value={formatPaise(data.totals.platform_net_paise)}
                icon={<TrendingUp className="h-5 w-5 text-honey-400" />}
              />
            </div>

            <div className="app-data-table">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium uppercase text-graphite-400">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium uppercase text-graphite-400">
                      Buyer Charges
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium uppercase text-graphite-400">
                      Contributor Payouts
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium uppercase text-graphite-400">
                      Platform Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeseries.map((day) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 font-mono text-graphite-300">{day.date}</td>
                      <td className="px-6 py-4 text-right text-honey-400">
                        {formatPaise(day.charge)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-400">
                        {formatPaise(day.payout)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-honey-400">
                        {formatPaise(day.net)}
                      </td>
                    </tr>
                  ))}
                  {data.timeseries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-graphite-400">
                        No revenue data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </DashboardPage>
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Panel padding="lg" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-graphite-400">{title}</p>
          <p className="app-stat-value mt-2 text-3xl leading-9">{value}</p>
        </div>
        <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-3">
          {icon}
        </div>
      </div>
    </Panel>
  );
}
