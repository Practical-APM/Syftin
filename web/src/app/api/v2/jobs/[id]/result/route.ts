import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getOrgDeliveryConfig } from "@/lib/data/delivery";
import { getJobResult } from "@/lib/data/jobs";
import {
  parseResultFormatParam,
  serializeJobResult,
} from "@/lib/export/serialize-result";

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
    const org = {
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api" as const,
    };

    const result = await getJobResult(id, org);
    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const config = await getOrgDeliveryConfig(auth.orgId);
    const { searchParams } = new URL(request.url);
    const format = parseResultFormatParam(searchParams, config.defaultExportFormat);
    const { body, contentType, filename } = serializeJobResult(result, id, format);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Syftin-Api-Version": "v2",
      },
    });
  });
}
