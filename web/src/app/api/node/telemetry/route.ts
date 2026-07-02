import { NextResponse } from "next/server";
import { touchNodeTelemetry } from "@/lib/data/contributors";
import type { NodeResourceTelemetry } from "@/lib/contributor/resource-settings";
import { requireNodeAuth } from "@/lib/security/node-auth";

export async function POST(request: Request) {
  const auth = await requireNodeAuth(request, "nodeAuth");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const telemetry = (body as { resource_telemetry?: NodeResourceTelemetry })
    .resource_telemetry;
  const hostname =
    (body as { hostname?: string }).hostname?.trim() ||
    request.headers.get("x-node-hostname")?.trim() ||
    undefined;

  if (!telemetry || typeof telemetry !== "object") {
    return NextResponse.json(
      { error: "resource_telemetry is required." },
      { status: 400 },
    );
  }

  try {
    await touchNodeTelemetry(auth.nodeId, telemetry, hostname);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Telemetry failed." },
      { status: 500 },
    );
  }
}
