"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Download, DollarSign, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-sm text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-light tracking-tight">Platform Revenue</h1>
          <p className="text-neutral-400 mt-2">
            Ledger aggregation of buyer charges and contributor payouts.
          </p>
        </div>
        <a 
          href="/api/admin/settlement" 
          download
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 border border-neutral-800 bg-transparent hover:bg-neutral-800 h-9 px-4 py-2"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Settlement CSV
        </a>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-neutral-900 rounded-xl border border-neutral-800"></div>
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Buyer Charges"
              value={formatPaise(data.totals.buyer_charge_paise)}
              icon={<DollarSign className="w-5 h-5 text-indigo-400" />}
            />
            <StatCard
              title="Contributor Payouts"
              value={formatPaise(data.totals.contributor_payout_paise)}
              icon={<Users className="w-5 h-5 text-emerald-400" />}
            />
            <StatCard
              title="Platform Net"
              value={formatPaise(data.totals.platform_net_paise)}
              icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            />
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-900/80 text-neutral-400 text-xs uppercase font-medium border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Buyer Charges</th>
                  <th className="px-6 py-4 text-right">Contributor Payouts</th>
                  <th className="px-6 py-4 text-right">Platform Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {data.timeseries.map((day) => (
                  <tr key={day.date} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-neutral-300 font-mono">{day.date}</td>
                    <td className="px-6 py-4 text-right text-indigo-400">{formatPaise(day.charge)}</td>
                    <td className="px-6 py-4 text-right text-emerald-400">{formatPaise(day.payout)}</td>
                    <td className="px-6 py-4 text-right text-amber-400 font-medium">{formatPaise(day.net)}</td>
                  </tr>
                ))}
                {data.timeseries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No revenue data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-neutral-400">{title}</p>
          <p className="text-3xl font-light tracking-tight mt-2 text-white">{value}</p>
        </div>
        <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
          {icon}
        </div>
      </div>
    </div>
  );
}
