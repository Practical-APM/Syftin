import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
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
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await getJobResult(id, auth.org);

  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  const config = await getOrgDeliveryConfig(auth.org.orgId);
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
