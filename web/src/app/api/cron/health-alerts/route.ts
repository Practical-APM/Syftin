import { NextResponse } from "next/server";
import { sweepStaleContributorNodes } from "@/lib/data/contributors";
import {
  buildContributorOfflineAlerts,
  buildHealthAlerts,
  sendOpsAlerts,
} from "@/lib/security/alerts";
import { authorizeCron } from "@/lib/security/cron-auth";
import { getHealthSnapshot } from "@/lib/security/health";
import { isPhase2Enabled, isSupabaseConfigured } from "@/lib/env";

async function runHealthAlerts() {
  const sweep =
    isPhase2Enabled() && isSupabaseConfigured()
      ? await sweepStaleContributorNodes()
      : { offlineCount: 0, nodes: [] };

  const health = await getHealthSnapshot(true);
  const alerts = [
    ...buildHealthAlerts(health),
    ...buildContributorOfflineAlerts(sweep.nodes),
  ];
  const notify = await sendOpsAlerts(alerts);

  return {
    ok: true,
    health: {
      status: health.status,
      supabase: health.supabase,
      worker: health.worker,
      ollama: health.ollama,
      workerLastSeen: health.workerLastSeen,
      workerId: health.workerId,
      contributorNodesOnline: health.contributorNodesOnline,
      pendingFetchTasks: health.pendingFetchTasks,
    },
    nodesMarkedOffline: sweep.offlineCount,
    alerts: {
      triggered: alerts.map((a) => a.key),
      sent: notify.sent,
      skippedCooldown: notify.skipped,
      loggedWithoutWebhook: notify.logged,
    },
  };
}

/** Vercel Cron — heartbeat / platform health every 5 minutes. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runHealthAlerts());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Health cron failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runHealthAlerts());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Health cron failed" },
      { status: 500 },
    );
  }
}
