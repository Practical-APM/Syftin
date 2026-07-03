import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getBatch, mergeBatchResults } from "@/lib/data/batches";
import { getOrgDeliveryConfig } from "@/lib/data/delivery";
import {
  parseResultFormatParam,
  serializeJobResult,
} from "@/lib/export/serialize-result";
import { isPhase3Enabled } from "@/lib/env";

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
    const org = {
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api" as const,
    };

    const data = await getBatch(id, org);
    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (data.batch.status !== "completed") {
      return NextResponse.json(
        { error: "Batch is not completed yet." },
        { status: 409 },
      );
    }

    const rows = await mergeBatchResults(id, org);
    const config = await getOrgDeliveryConfig(auth.orgId);
    const { searchParams } = new URL(request.url);
    const format = parseResultFormatParam(searchParams, config.defaultExportFormat);
    const { body, contentType, filename } = serializeJobResult(rows, id, format);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="batch-${id.slice(0, 8)}-${format === "csv" ? "csv" : format === "ndjson" ? "ndjson" : "json"}"`,
        "X-Syftin-Api-Version": "v2",
      },
    });
  });
}
