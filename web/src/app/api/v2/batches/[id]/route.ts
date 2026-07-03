import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getBatch } from "@/lib/data/batches";
import { getPublicSiteUrl, isPhase3Enabled } from "@/lib/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  if (!isPhase3Enabled()) {
    return NextResponse.json({ error: "Batch API requires Phase 3." }, { status: 404 });
  }

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "read");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    const { id } = await params;
    const data = await getBatch(id, {
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const downloadUrl =
      data.batch.status === "completed"
        ? `${getPublicSiteUrl()}/api/v2/batches/${id}/result`
        : null;

    return NextResponse.json({
      api_version: "v2",
      batch: data.batch,
      jobs: data.jobs,
      download_url: downloadUrl,
    });
  });
}
