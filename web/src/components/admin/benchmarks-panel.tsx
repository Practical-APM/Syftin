"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, FlaskConical } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/job-table";
import { InlineError } from "@/components/ui/error-fallback";
import { cn, formatPercent } from "@/lib/utils";

type BenchmarkReport = {
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
    error?: string;
  }>;
};

export function BenchmarksPanel() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/benchmarks")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load benchmark report.");
        return r.json();
      })
      .then((data) => {
        setReport(data.report ?? null);
        setSource(data.source ?? null);
        setHint(data.hint ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <DashboardHeader
        title="Domain benchmarks"
        description="Schema compliance scores from the five Phase 1 priority domains (target: 98%+ field match)."
      />
      <DashboardPage>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500 dark:text-graphite-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading benchmark report…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : !report ? (
          <div className="rounded-xl border border-dashed border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900/40 px-8 py-12 text-center">
            <FlaskConical className="mx-auto h-8 w-8 text-graphite-400" />
            <p className="mt-4 text-sm font-medium text-graphite-900 dark:text-ivory-50">
              No benchmark report yet
            </p>
            <p className="mt-2 text-sm text-graphite-500 dark:text-graphite-400">
              {hint ??
                "Run the benchmark suite on the worker host to measure extraction quality."}
            </p>
            <pre className="mx-auto mt-6 max-w-md rounded-lg border border-graphite-800 bg-graphite-950 px-4 py-3 text-left font-mono text-xs text-graphite-300">
              cd worker{"\n"}bash scripts/run-benchmarks.sh
            </pre>
          </div>
        ) : (
          <>
            <div className="app-stat-grid-3">
              <StatCard
                label="Average field match"
                value={formatPercent(report.average_score)}
              />
              <StatCard
                label="Domains passing"
                value={`${report.passed_count} / ${report.total_count}`}
              />
              <StatCard label="Target" value={`${report.target_compliance}%+`} />
            </div>

            <p className="text-xs text-graphite-500 dark:text-graphite-400">
              Last run: {new Date(report.generated_at).toLocaleString()}
              {source && (
                <span className="ml-2 rounded-md bg-ivory-100 dark:bg-graphite-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-graphite-500 dark:text-graphite-300">
                  {source}
                </span>
              )}
            </p>

            <div className="app-data-table overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                      Domain
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                      Score
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                      Records
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                      Fetch
                    </th>
                    <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((row) => (
                    <tr key={row.domain}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-graphite-900 dark:text-ivory-50">
                          {row.name}
                        </p>
                        <p className="text-xs text-graphite-500 dark:text-graphite-400">{row.domain}</p>
                      </td>
                      <td className="px-5 py-4 text-graphite-900 dark:text-ivory-50">
                        {row.error ? "—" : formatPercent(row.compliance_score)}
                      </td>
                      <td className="px-5 py-4 text-graphite-500 dark:text-graphite-400">
                        {row.error ? "—" : row.record_count}
                      </td>
                      <td className="px-5 py-4 text-xs text-graphite-500 dark:text-graphite-400">
                        {row.fetch_method ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        {row.error ? (
                          <span
                            className="text-xs text-red-500 dark:text-red-400"
                            title={row.error}
                          >
                            Failed
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium",
                              row.passed ? "text-honey-600 dark:text-honey-400" : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {row.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {row.passed ? "Pass" : "Below target"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashboardPage>
    </>
  );
}
