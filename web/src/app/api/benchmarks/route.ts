import { NextResponse } from "next/server";
import { requireApiAuth, requirePlatformAdmin } from "@/lib/auth/guard";
import {
  getLatestBenchmarkReport,
  saveBenchmarkReport,
  type BenchmarkReport,
} from "@/lib/data/benchmarks";
import { isDevDashboard } from "@/lib/env";

function assertInternalSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-internal-secret") === secret;
}

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

/** Worker uploads latest.json after run-benchmarks.sh */
export async function POST(request: Request) {
  if (!assertInternalSecret(request)) {
    const auth = await requirePlatformAdmin();
    if (!auth.ok) return auth.response;
  }

  try {
    const report = (await request.json()) as BenchmarkReport;
    if (!report?.generated_at || !Array.isArray(report.results)) {
      return NextResponse.json({ error: "Invalid benchmark report." }, { status: 400 });
    }
    await saveBenchmarkReport(report);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed." },
      { status: 500 },
    );
  }
}
