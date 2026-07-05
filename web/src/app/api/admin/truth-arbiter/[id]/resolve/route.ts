import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { resolveTruthArbiterTask } from "@/lib/data/truth-arbiter";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: { resolution?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resolution = body.resolution?.trim();
  if (!resolution) {
    return NextResponse.json(
      { error: "resolution is required" },
      { status: 400 },
    );
  }

  const result = await resolveTruthArbiterTask(id, resolution);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Could not resolve task" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
