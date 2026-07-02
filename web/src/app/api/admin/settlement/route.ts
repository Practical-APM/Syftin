import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const admin = createAdminClient();
  
  let query = admin.from("platform_ledger").select(`
    id,
    job_id,
    organization_id,
    buyer_charge_paise,
    contributor_payout_paise,
    platform_net_paise,
    created_at,
    jobs ( status, target_url )
  `).order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  // Generate CSV
  let csv = "Ledger ID,Job ID,Organization ID,Target URL,Buyer Charge (Paise),Contributor Payout (Paise),Platform Net (Paise),Created At\n";
  for (const row of (data || [])) {
    const job = row.jobs as any;
    csv += `"${row.id}","${row.job_id}","${row.organization_id}","${job?.target_url || ''}",${row.buyer_charge_paise},${row.contributor_payout_paise},${row.platform_net_paise},"${row.created_at}"\n`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="settlement_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
