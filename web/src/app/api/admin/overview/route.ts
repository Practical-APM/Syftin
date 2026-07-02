import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { getAdminOverview } from "@/lib/data/admin";
import { getHealthSnapshot } from "@/lib/security/health";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const [overview, health] = await Promise.all([
    getAdminOverview(),
    getHealthSnapshot(true),
  ]);

  return NextResponse.json({
    ...overview,
    supabase: health.supabase,
    ollama: health.ollama,
    worker: {
      ok: health.worker,
      lastSeen: health.workerLastSeen,
      workerId: health.workerId ?? overview.worker.workerId,
    },
    contributors: {
      ...overview.contributors,
      nodesOnline: health.contributorNodesOnline,
    },
    pendingFetchTasks: health.pendingFetchTasks,
    status: health.status,
  });
}
