import { readFile } from "fs/promises";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export type BenchmarkReport = {
  generated_at: string;
  target_compliance: number;
  average_score: number;
  passed_count: number;
  total_count: number;
  results: Array<{
    domain: string;
    name: string;
    url: string;
    passed: boolean;
    compliance_score: number;
    record_count: number;
    fetch_method?: string;
    text_chars?: number;
    error?: string;
    variance_flags?: string[];
  }>;
};

async function loadFilesystemReport(): Promise<BenchmarkReport | null> {
  const reportPath = path.join(
    process.cwd(),
    "..",
    "worker",
    "benchmarks",
    "results",
    "latest.json",
  );
  try {
    const raw = await readFile(reportPath, "utf-8");
    return JSON.parse(raw) as BenchmarkReport;
  } catch {
    return null;
  }
}

export async function getLatestBenchmarkReport(): Promise<{
  report: BenchmarkReport | null;
  source: "supabase" | "filesystem" | null;
}> {
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("benchmark_reports")
      .select("report, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.report) {
      const report = data.report as BenchmarkReport;
      if (!report.generated_at && data.created_at) {
        report.generated_at = data.created_at;
      }
      return { report, source: "supabase" };
    }
  }

  const filesystem = await loadFilesystemReport();
  if (filesystem) {
    return { report: filesystem, source: "filesystem" };
  }

  return { report: null, source: null };
}

export async function saveBenchmarkReport(
  report: BenchmarkReport,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { error } = await admin.from("benchmark_reports").insert({
    generated_at: report.generated_at,
    target_compliance: report.target_compliance,
    average_score: report.average_score,
    passed_count: report.passed_count,
    total_count: report.total_count,
    report,
  });

  if (error) throw new Error(error.message);
}
