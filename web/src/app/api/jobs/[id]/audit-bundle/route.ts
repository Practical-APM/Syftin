import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { buildJobAuditBundle } from "@/lib/data/audit-bundle";
import { getJob } from "@/lib/data/jobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const bundle = await buildJobAuditBundle(job, auth.org.orgId);
  return NextResponse.json(bundle);
}
