import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundFailedShards } from "@/lib/data/credits";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional cron authorization
  const authHeader = request.headers.get("authorization");
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  // Find all completed batches with failed shards that haven't been refunded
  const { data: batches, error } = await admin
    .from("job_batches")
    .select("id, organization_id, failed_shards")
    .eq("status", "completed")
    .eq("refund_processed", false)
    .gt("failed_shards", 0)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processedCount = 0;
  for (const batch of (batches || [])) {
    const result = await refundFailedShards(batch.organization_id, batch.id, batch.failed_shards);
    if (result.ok) {
      await admin.from("job_batches").update({ refund_processed: true }).eq("id", batch.id);
      processedCount++;
    }
  }

  return NextResponse.json({
    processed_count: processedCount,
    ok: true,
  });
}
