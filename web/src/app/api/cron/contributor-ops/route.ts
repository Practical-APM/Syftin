import { NextResponse } from "next/server";
import { processPendingJobDeliveries } from "@/lib/data/delivery";
import { sweepStaleContributorNodes } from "@/lib/data/contributors";
import { reclaimStaleFetchClaims } from "@/lib/data/fetch-tasks";
import { processPendingPayoutsAuto } from "@/lib/data/payouts";
import {
  isAutoDisbursePayoutsEnabled,
  isPhase2Enabled,
  isSupabaseConfigured,
} from "@/lib/env";
import { buildContributorOfflineAlerts, sendOpsAlerts } from "@/lib/security/alerts";
import { authorizeCron } from "@/lib/security/cron-auth";

async function runContributorOps() {
  if (!isPhase2Enabled() || !isSupabaseConfigured()) {
    return {
      skipped: true as const,
      nodesOffline: 0,
      tasksReclaimed: 0,
      payouts: { attempted: 0, succeeded: 0, errors: [] as string[] },
    };
  }

  const sweep = await sweepStaleContributorNodes();
  const offlineAlerts = buildContributorOfflineAlerts(sweep.nodes);
  const notify = await sendOpsAlerts(offlineAlerts);

  const tasksReclaimed = await reclaimStaleFetchClaims();
  const payouts = isAutoDisbursePayoutsEnabled()
    ? await processPendingPayoutsAuto()
    : { attempted: 0, succeeded: 0, errors: [] as string[] };

  return {
    skipped: false as const,
    nodesOffline: sweep.offlineCount,
    tasksReclaimed,
    payouts,
    offlineAlerts: {
      triggered: offlineAlerts.map((a) => a.key),
      sent: notify.sent,
      skippedCooldown: notify.skipped,
      loggedWithoutWebhook: notify.logged,
    },
  };
}

async function runPlatformOps() {
  const contributor = await runContributorOps();
  const deliveries = await processPendingJobDeliveries(25);

  return {
    ok: true,
    contributor,
    deliveries,
  };
}

/** Vercel Cron invokes GET; manual ops may use POST. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runPlatformOps());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runPlatformOps());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    );
  }
}
