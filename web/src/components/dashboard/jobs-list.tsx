"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { JobTable } from "@/components/dashboard/job-table";
import { RealtimeStatusBanner } from "@/components/dashboard/realtime-status-banner";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useJobsRealtime } from "@/hooks/use-jobs-realtime";
import type { Job } from "@/lib/types/jobs";

function JobsEmptyState() {
  return (
    <Panel className="max-w-md text-center">
      <p className="text-sm text-graphite-600 dark:text-graphite-300">No collection jobs yet.</p>
      <Link href="/dashboard/jobs/new" className="mt-4 inline-block">
        <Button size="sm">Create your first job</Button>
      </Link>
      <p className="mt-3 text-xs text-graphite-400">
        New here?{" "}
        <Link href="/dashboard" className="text-honey-600 hover:text-honey-500">
          Start from the overview guide
        </Link>
      </p>
    </Panel>
  );
}

export function JobsListClient({ initialJobs }: { initialJobs: Job[] }) {
  const { jobs, realtimeStatus } = useJobsRealtime(initialJobs);

  return (
    <DashboardPage>
      <RealtimeStatusBanner status={realtimeStatus} />
      {jobs.length === 0 ? (
        <JobsEmptyState />
      ) : (
        <JobTable jobs={jobs} />
      )}
    </DashboardPage>
  );
}

export function JobsPageShell({ initialJobs }: { initialJobs: Job[] }) {
  const hasJobs = initialJobs.length > 0;

  return (
    <>
      <DashboardHeader
        title="Jobs"
        description={hasJobs ? undefined : "Submit a URL and field list to start collecting."}
        action={
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-honey-500 px-4 py-2 text-sm font-medium text-graphite-950 shadow-sm shadow-honey-500/15 transition-colors hover:bg-honey-400"
          >
            <Plus className="h-4 w-4" />
            New job
          </Link>
        }
      />
      <JobsListClient initialJobs={initialJobs} />
    </>
  );
}
