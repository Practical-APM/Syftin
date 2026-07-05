import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { buildJobAuditBundle } from "@/lib/data/audit-bundle";
import { getJob } from "@/lib/data/jobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(_request);
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

    const bundle = await buildJobAuditBundle(job, auth.orgId);
    return NextResponse.json({
      api_version: "v2",
      ...bundle,
    });
  });
}
