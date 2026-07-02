import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // In a real app, verify admin session here.
  const admin = createAdminClient();
  
  // Aggregate revenue data from platform_ledger
  const { data, error } = await admin
    .from("platform_ledger")
    .select("buyer_charge_paise, contributor_payout_paise, platform_net_paise, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by day
  const dailyStats: Record<string, any> = {};
  let totalCharge = 0;
  let totalPayout = 0;
  let totalNet = 0;

  for (const row of (data || [])) {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { date, charge: 0, payout: 0, net: 0 };
    }
    const charge = Number(row.buyer_charge_paise || 0);
    const payout = Number(row.contributor_payout_paise || 0);
    const net = Number(row.platform_net_paise || 0);

    dailyStats[date].charge += charge;
    dailyStats[date].payout += payout;
    dailyStats[date].net += net;

    totalCharge += charge;
    totalPayout += payout;
    totalNet += net;
  }

  const timeseries = Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totals: {
      buyer_charge_paise: totalCharge,
      contributor_payout_paise: totalPayout,
      platform_net_paise: totalNet,
    },
    timeseries,
  });
}
