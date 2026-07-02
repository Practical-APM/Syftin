import { NextResponse } from "next/server";
import {
  registerContributorNode,
} from "@/lib/data/contributors";
import type { NodeResourceTelemetry } from "@/lib/contributor/resource-settings";
import { isSupabaseConfigured } from "@/lib/env";
import { requireNodeAuth } from "@/lib/security/node-auth";

export type NodeCapabilitiesPayload = {
  os?: string;
  arch?: string;
  ram_gb?: number;
  cpu_cores?: number;
  playwright_ready?: boolean;
  has_gpu?: boolean;
  gpu_vram_gb?: number;
  gpu_inference_ready?: boolean;
  recommended_tier?: string;
  node_type?: string;
  fetch_mode?: string;
  connection_metered?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireNodeAuth(request, "nodeAuth");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const hostname =
    (body as { hostname?: string }).hostname?.trim() ||
    request.headers.get("x-node-hostname")?.trim() ||
    undefined;
  const capabilities = (body as { capabilities?: NodeCapabilitiesPayload })
    .capabilities;
  const connectionMetered = (body as { connection_metered?: boolean })
    .connection_metered;
  const resourceTelemetry = (
    body as { resource_telemetry?: NodeResourceTelemetry }
  ).resource_telemetry;

  try {
    // Resolve public IP for geo-routing: prefer X-Forwarded-For (Vercel/CF) then x-real-ip
    const xForwardedFor = request.headers.get("x-forwarded-for");
    const xRealIp = request.headers.get("x-real-ip");
    const publicIp =
      (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null) ??
      xRealIp ??
      undefined;

    const profile = await registerContributorNode(
      auth.nodeId,
      auth.contributorId,
      {
        hostname,
        capabilities: capabilities ?? {},
        connectionMetered,
        resourceTelemetry,
        publicIp,
      },
    );
    return NextResponse.json({
      ok: true,
      profile,
      resource_settings: profile.resourceSettings,
      demo: !isSupabaseConfigured(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed." },
      { status: 500 },
    );
  }
}
