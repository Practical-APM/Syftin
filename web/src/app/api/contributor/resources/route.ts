import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import {
  getContributorResourceSettings,
  listContributorNodes,
  updateContributorResourceSettings,
} from "@/lib/data/contributors";
import {
  normalizeResourceSettings,
  type ContributorResourceSettings,
} from "@/lib/contributor/resource-settings";
import { isSupabaseConfigured } from "@/lib/env";

function systemLimitsFromNodes(
  nodes: Awaited<ReturnType<typeof listContributorNodes>>,
) {
  let cpuCores = 4;
  let ramGb = 8;
  let gpuVramGb = 0;
  for (const node of nodes) {
    const caps = node.capabilities;
    if (!caps) continue;
    if (typeof caps.cpu_cores === "number" && caps.cpu_cores > cpuCores) {
      cpuCores = caps.cpu_cores;
    }
    if (typeof caps.ram_gb === "number" && caps.ram_gb > ramGb) {
      ramGb = caps.ram_gb;
    }
    if (typeof caps.gpu_vram_gb === "number" && caps.gpu_vram_gb > gpuVramGb) {
      gpuVramGb = caps.gpu_vram_gb;
    }
  }
  return { cpuCores, ramGb, gpuVramGb };
}

export async function GET() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  try {
    const nodes = await listContributorNodes(
      auth.contributor,
      isSupabaseConfigured(),
    );
    const { cpuCores, ramGb, gpuVramGb } = systemLimitsFromNodes(nodes);
    const settings = await getContributorResourceSettings(
      auth.contributor.contributorId,
    );
    return NextResponse.json({
      settings: normalizeResourceSettings(settings, ramGb, cpuCores, gpuVramGb),
      system: { cpuCores, ramGb, gpuVramGb },
      telemetry: nodes.map((n) => ({
        id: n.id,
        machine_label: n.machine_label,
        status: n.status,
        resource_telemetry: n.resource_telemetry,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const raw = (body as { settings?: ContributorResourceSettings }).settings;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Missing settings." }, { status: 400 });
  }

  try {
    const nodes = await listContributorNodes(
      auth.contributor,
      isSupabaseConfigured(),
    );
    const { cpuCores, ramGb, gpuVramGb } = systemLimitsFromNodes(nodes);
    const settings = await updateContributorResourceSettings(
      auth.contributor.contributorId,
      normalizeResourceSettings(raw, ramGb, cpuCores, gpuVramGb),
    );
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 400 },
    );
  }
}
