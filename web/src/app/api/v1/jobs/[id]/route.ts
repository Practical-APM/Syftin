import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/auth/api-key";
import { getJob } from "@/lib/data/jobs";
import { buildDownloadUrls } from "@/lib/data/delivery";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const job = await getJob(id, {
    orgId: auth.orgId,
    orgName: auth.orgName,
    dpaSignedAt: null,
    role: "api",
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    job,
    download_urls: job.status === "completed" ? buildDownloadUrls(job.id) : null,
  });
}
