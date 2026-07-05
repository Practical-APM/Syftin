import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { buildDownloadUrls } from "@/lib/data/delivery";
import { getJob } from "@/lib/data/jobs";
import { getPublicSiteUrl } from "@/lib/env";

function buildV2DownloadUrls(jobId: string) {
  const base = `${getPublicSiteUrl()}/api/v2/jobs/${jobId}/result`;
  return {
    json: base,
    csv: `${base}?format=csv`,
    ndjson: `${base}?format=ndjson`,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "read");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    const { id } = await params;
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
      api_version: "v2",
      job,
      download_urls:
        job.status === "completed"
          ? {
              v1: buildDownloadUrls(job.id),
              v2: buildV2DownloadUrls(job.id),
              audit: `${getPublicSiteUrl()}/api/v2/jobs/${job.id}/audit`,
            }
          : null,
    });
  });
}
