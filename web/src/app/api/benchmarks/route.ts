import { NextResponse } from "next/server";
import { requireApiAuth, requirePlatformAdmin } from "@/lib/auth/guard";
import { getLatestBenchmarkReport } from "@/lib/data/benchmarks";
import { isDevDashboard } from "@/lib/env";

export async function GET() {
  const auth = isDevDashboard()
    ? await requireApiAuth()
    : await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { report, source } = await getLatestBenchmarkReport();
  if (!report) {
    return NextResponse.json({
      report: null,
      source: null,
      hint: "Run: cd worker && bash scripts/run-benchmarks.sh",
    });
  }

  return NextResponse.json({ report, source });
}
