"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { JobTable } from "@/components/dashboard/job-table";
import { BatchTable } from "@/components/dashboard/batch-table";
import { RealtimeStatusBanner } from "@/components/dashboard/realtime-status-banner";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useJobsRealtime } from "@/hooks/use-jobs-realtime";
import { isPhase3EnabledClient } from "@/lib/env";
import type { BatchSummary, Job } from "@/lib/types/jobs";
import { cn } from "@/lib/utils";

function EmptyState({ tab }: { tab: "jobs" | "batches" }) {
  return (
    <Panel className="max-w-md text-center">
      <p className="text-sm text-graphite-300">
        {tab === "jobs" ? "No collection jobs yet." : "No batch jobs yet."}
      </p>
      <Link
        href={
          tab === "batches"
            ? "/dashboard/jobs/new?mode=batch"
            : "/dashboard/jobs/new"
        }
        className="mt-4 inline-block"
      >
        <Button size="sm">
          {tab === "jobs" ? "Create your first job" : "Create your first batch"}
        </Button>
      </Link>
    </Panel>
  );
}

export function JobsWorkspaceClient({
  initialJobs,
  initialBatches,
}: {
  initialJobs: Job[];
  initialBatches: BatchSummary[];
}) {
  const searchParams = useSearchParams();
  const batchEnabled = isPhase3EnabledClient();
  const tab =
    batchEnabled && searchParams.get("tab") === "batches" ? "batches" : "jobs";

  const { jobs, realtimeStatus } = useJobsRealtime(initialJobs);

  const newHref = useMemo(
    () =>
      tab === "batches"
        ? "/dashboard/jobs/new?mode=batch"
        : "/dashboard/jobs/new",
    [tab],
  );

  return (
    <>
      <DashboardHeader
        title="Jobs"
        description={
          tab === "jobs"
            ? "Single-URL extractions and multi-URL batches in one place."
            : undefined
        }
        action={
          <Link
            href={newHref}
            className="inline-flex items-center gap-2 rounded-lg bg-honey-500 px-4 py-2 text-sm font-medium text-graphite-950 shadow-sm shadow-honey-500/15 transition-colors hover:bg-honey-400"
          >
            <Plus className="h-4 w-4" />
            New extraction
          </Link>
        }
      />
      <DashboardPage>
        {batchEnabled && (
          <div className="mb-6 inline-flex rounded-lg border border-graphite-700 bg-graphite-900 p-1">
            <Link
              href="/dashboard/jobs"
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === "jobs"
                  ? "bg-honey-500/15 text-honey-400"
                  : "text-graphite-400 hover:text-graphite-200",
              )}
            >
              Jobs
            </Link>
            <Link
              href="/dashboard/jobs?tab=batches"
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === "batches"
                  ? "bg-honey-500/15 text-honey-400"
                  : "text-graphite-400 hover:text-graphite-200",
              )}
            >
              Batches
            </Link>
          </div>
        )}

        {tab === "jobs" ? (
          <>
            <RealtimeStatusBanner status={realtimeStatus} />
            {jobs.length === 0 ? (
              <EmptyState tab="jobs" />
            ) : (
              <JobTable jobs={jobs} />
            )}
          </>
        ) : initialBatches.length === 0 ? (
          <EmptyState tab="batches" />
        ) : (
          <BatchTable batches={initialBatches} />
        )}
      </DashboardPage>
    </>
  );
}
