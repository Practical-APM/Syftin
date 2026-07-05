"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDownToLine, ArrowLeft, RotateCcw, XCircle } from "lucide-react";
import { DashboardPage, SchemaPreview } from "@/components/dashboard/sidebar";
import { AlertBanner, Panel, SectionHeading } from "@/components/ui/card";
import { RealtimeStatusBanner } from "@/components/dashboard/realtime-status-banner";
import { ResultPreview } from "@/components/dashboard/result-preview";
import { VarianceFlagsPanel } from "@/components/dashboard/variance-flags-panel";
import { JobFetchProgressPanel } from "@/components/dashboard/job-fetch-progress-panel";
import { Button } from "@/components/ui/button";
import type { JobFetchProgress } from "@/lib/data/fetch-progress";
import { useJobFetchProgressRealtime } from "@/hooks/use-job-fetch-progress-realtime";
import { useJobsRealtime } from "@/hooks/use-jobs-realtime";
import { jobDownloadUrl } from "@/lib/jobs-utils";
import {
  CANCELLABLE_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  type Job,
} from "@/lib/types/jobs";
import { cn, formatDate, formatComplianceScore } from "@/lib/utils";

export function JobDetailClient({
  initialJob,
  fetchProgress,
}: {
  initialJob: Job;
  fetchProgress?: JobFetchProgress | null;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { jobs, realtimeStatus } = useJobsRealtime([initialJob], {
    focusJobId: initialJob.id,
  });
  const job = jobs[0] ?? initialJob;
  const liveFetchProgress = useJobFetchProgressRealtime(
    job.id,
    fetchProgress,
  );
  const canCancel = CANCELLABLE_STATUSES.includes(job.status);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    const res = await fetch(`/api/jobs/${job.id}/retry`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setRetrying(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    setRetryError(
      (data as { error?: string }).error ?? "Could not retry this job.",
    );
  }

  async function handleCancel() {
    if (!canCancel) return;
    setCancelling(true);
    setCancelError(null);
    const res = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setCancelling(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    setCancelError(
      (data as { error?: string }).error ?? "Could not cancel this job.",
    );
  }

  return (
    <DashboardPage>
      <RealtimeStatusBanner status={realtimeStatus} />
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-2 text-sm text-graphite-500 transition-colors hover:text-graphite-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Panel>
            <SectionHeading className="mb-4 block">Job summary</SectionHeading>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">Status</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      STATUS_COLORS[job.status],
                    )}
                  >
                    {STATUS_LABELS[job.status]}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">Website</dt>
                <dd className="font-medium text-graphite-900">{job.domain}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">Field match score</dt>
                <dd className="font-medium text-graphite-900">
                  {formatComplianceScore(job.compliance_score)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">Records delivered</dt>
                <dd className="text-graphite-900">
                  {job.record_count?.toLocaleString() ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">Submitted</dt>
                <dd className="text-graphite-900">
                  {formatDate(job.created_at)}
                </dd>
              </div>
              {job.completed_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-graphite-500">Finished</dt>
                  <dd className="text-graphite-900">
                    {formatDate(job.completed_at)}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          {liveFetchProgress && liveFetchProgress.total > 0 && (
            <JobFetchProgressPanel progress={liveFetchProgress} />
          )}

          {job.status === "failed" && (
            <AlertBanner variant="error">
              <p className="font-medium">Job could not complete</p>
              {job.error_message && (
                <p className="mt-1 text-red-600">{job.error_message}</p>
              )}
              {retryError && (
                <p className="mt-2 text-red-600">{retryError}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={retrying}
                onClick={handleRetry}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {retrying ? "Retrying…" : "Retry job"}
              </Button>
            </AlertBanner>
          )}

          {job.status === "cancelled" && (
            <AlertBanner variant="neutral">
              <p className="font-medium text-graphite-900">Job cancelled</p>
              <p className="mt-1">
                This run was stopped before delivery. No file was produced.
              </p>
            </AlertBanner>
          )}

          {canCancel && (
            <Panel padding="md">
              <p className="text-graphite-600">
                Stop this run if you submitted the wrong URL or schema.
              </p>
              {cancelError && (
                <p className="mt-2 text-red-600">{cancelError}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 border-graphite-200 text-graphite-700"
                disabled={cancelling}
                onClick={handleCancel}
              >
                <XCircle className="h-3.5 w-3.5" />
                {cancelling ? "Cancelling…" : "Cancel job"}
              </Button>
              {(job.status === "processing" || job.status === "validating") && (
                <p className="mt-2 text-xs text-graphite-500">
                  If collection already started, the worker may finish briefly
                  before the cancel takes effect.
                </p>
              )}
            </Panel>
          )}

          {job.status === "completed" ? (
            <div className="flex flex-wrap gap-2">
              {(["json", "csv", "ndjson"] as const).map((format) => (
                <a
                  key={format}
                  href={jobDownloadUrl(job, format)}
                  className="inline-flex items-center gap-2 rounded-lg bg-honey-500 px-4 py-2.5 text-sm font-medium uppercase text-graphite-950 shadow-sm shadow-honey-500/15 transition-colors hover:bg-honey-400"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  {format}
                </a>
              ))}
              <a
                href={`/api/jobs/${job.id}/delivery-manifest`}
                className="inline-flex items-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium text-graphite-700 transition-colors hover:border-honey-500/40 hover:text-honey-600"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Delivery manifest
              </a>
              <a
                href={`/api/jobs/${job.id}/audit-bundle`}
                className="inline-flex items-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium text-graphite-700 transition-colors hover:border-honey-500/40 hover:text-honey-600"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Audit bundle
              </a>
            </div>
          ) : (
            <p className="text-sm text-graphite-500">
              {job.status === "failed"
                ? "No file was produced for this job."
                : job.status === "cancelled"
                  ? "Cancelled jobs do not produce a download."
                  : "Your file will appear here when the job finishes."}
            </p>
          )}

          {job.variance_flags && job.variance_flags.length > 0 && (
            <VarianceFlagsPanel flags={job.variance_flags} />
          )}

          <ResultPreview
            jobId={job.id}
            enabled={job.status === "completed"}
          />
        </div>

        <SchemaPreview schema={job.example_schema} />
      </div>
    </DashboardPage>
  );
}
