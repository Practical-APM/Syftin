import { NextResponse } from "next/server";
import { captureDailyAnalyticsSnapshots } from "@/lib/data/analytics-snapshots";
import { authorizeCron } from "@/lib/security/cron-auth";

/** Daily cron: aggregate platform metrics into analytics_snapshots. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await captureDailyAnalyticsSnapshots();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analytics cron failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
