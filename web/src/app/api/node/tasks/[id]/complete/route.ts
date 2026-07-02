import { NextResponse } from "next/server";
import { completeFetchTask, failFetchTask } from "@/lib/data/fetch-tasks";
import { isSupabaseConfigured } from "@/lib/env";
import {
  MAX_NODE_HTML_BYTES,
  rejectOversizedBody,
  requireNodeAuth,
} from "@/lib/security/node-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }

  const oversized = rejectOversizedBody(request);
  if (oversized) return oversized;

  const auth = await requireNodeAuth(request, "nodeComplete");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const html = (body as { html?: string }).html;
  const failed = (body as { failed?: boolean }).failed;
  const errorMessage = (body as { error?: string }).error;
  const parsedOutput = (body as { parsed_output?: unknown[] }).parsed_output;
  const edgeInference = Boolean((body as { edge_inference?: boolean }).edge_inference);
  const inferenceModel = (body as { inference_model?: string }).inference_model;

  if (failed) {
    await failFetchTask(id, auth.nodeId, errorMessage ?? "Fetch failed");
    return NextResponse.json({ ok: true });
  }

  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "html payload required." }, { status: 400 });
  }

  if (Buffer.byteLength(html, "utf8") > MAX_NODE_HTML_BYTES) {
    return NextResponse.json({ error: "HTML payload too large." }, { status: 413 });
  }

  const result = await completeFetchTask(id, auth.nodeId, html, {
    parsedOutput: Array.isArray(parsedOutput) ? parsedOutput : undefined,
    edgeInference: edgeInference && Array.isArray(parsedOutput) && parsedOutput.length > 0,
    inferenceModel: inferenceModel ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
