"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, FlaskConical } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { InlineError } from "@/components/ui/error-fallback";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type UnderDeliveredJob = {
  id: string;
  name: string;
  domain: string;
  record_count: number | null;
  created_at: string;
};

export function AdminRefundsPanel() {
  const [jobs, setJobs] = useState<UnderDeliveredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/jobs/under-delivered")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load under-delivered jobs.");
        return r.json();
      })
      .then((data) => setJobs(data.jobs ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(jobId: string) {
    setRefunding(jobId);
    setError(null);
    const res = await fetch(`/api/admin/jobs/${jobId}/refund-under-delivered`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setRefunding(null);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Refund failed.");
      return;
    }
    load();
  }

  return (
    <>
      <DashboardHeader
        title="Partial delivery refunds"
        description="One-click proportional credit back for completed jobs flagged under_delivered."
      />
      <DashboardPage>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : jobs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
            No under-delivered jobs awaiting refund.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory-50/80">
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Job
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Domain
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Rows
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                    Submitted
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-ivory-100 last:border-0">
                    <td className="px-5 py-4 font-medium text-graphite-900">
                      {job.name}
                    </td>
                    <td className="px-5 py-4 text-graphite-700">{job.domain}</td>
                    <td className="px-5 py-4 text-graphite-700">
                      {job.record_count?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-graphite-500">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title={`Re-run benchmark for ${job.domain}`}
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `cd worker && bash scripts/run-benchmarks.sh`,
                            )
                          }
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          Benchmark
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={refunding === job.id}
                          onClick={() => refund(job.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {refunding === job.id ? "Refunding…" : "Partial refund"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPage>
    </>
  );
}
