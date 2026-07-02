import { NextResponse } from "next/server";
import { runAllScheduledExports } from "@/lib/data/scheduled-exports";
import { authorizeCron } from "@/lib/security/cron-auth";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllScheduledExports();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scheduled export failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
