import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getBatches } from "@/lib/data/batches";
import { isPhase3Enabled } from "@/lib/env";

export async function GET(request: Request) {
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
    const batches = await getBatches({
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    return NextResponse.json({
      api_version: "v2",
      organization: { id: auth.orgId, name: auth.orgName },
      batches,
    });
  });
}
