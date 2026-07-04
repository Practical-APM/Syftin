import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { refundUnderDeliveredJob } from "@/lib/data/credits";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id: jobId } = await params;
  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("jobs")
    .select("id, organization_id, status, record_count, example_schema, variance_flags")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { error: "Only completed jobs can receive under-delivery refunds." },
      { status: 400 },
    );
  }

  const flags = (job.variance_flags as string[] | null) ?? [];
  if (!flags.includes("under_delivered")) {
    return NextResponse.json(
      { error: "Job is not flagged as under_delivered." },
      { status: 400 },
    );
  }

  const result = await refundUnderDeliveredJob(job.organization_id, jobId, {
    recordCount: job.record_count,
    exampleSchema: job.example_schema as Record<string, unknown> | null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, refundedPaise: result.refundedPaise });
}
