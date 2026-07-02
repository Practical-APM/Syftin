import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/auth/api-key";
import { getOrgDeliveryConfig } from "@/lib/data/delivery";
import { getJobResult } from "@/lib/data/jobs";
import {
  parseResultFormatParam,
  serializeJobResult,
} from "@/lib/export/serialize-result";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const org = {
    orgId: auth.orgId,
    orgName: auth.orgName,
    dpaSignedAt: null,
    role: "api",
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
    },
  });
}
