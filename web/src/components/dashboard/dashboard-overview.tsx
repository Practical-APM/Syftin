"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JobTable, StatCard } from "@/components/dashboard/job-table";
import { DashboardOnboarding } from "@/components/dashboard/dashboard-onboarding";
import { RealtimeStatusBanner } from "@/components/dashboard/realtime-status-banner";
import { DashboardPage } from "@/components/dashboard/sidebar";
import { SectionHeading } from "@/components/ui/card";
import { useJobsRealtime } from "@/hooks/use-jobs-realtime";
import { computeDashboardStats } from "@/lib/stats";
import type { Job } from "@/lib/types/jobs";

const RECENT_JOBS_LIMIT = 5;

type DashboardOverviewProps = {
  initialJobs: Job[];
};

export function DashboardOverview({ initialJobs }: DashboardOverviewProps) {
  const { jobs, realtimeStatus } = useJobsRealtime(initialJobs);
  const stats = computeDashboardStats(jobs);
  const hasJobs = jobs.length > 0;
  const hasCompleted = jobs.some((j) => j.status === "completed");

  if (!hasJobs) {
    return (
      <DashboardPage>
        <RealtimeStatusBanner status={realtimeStatus} />
        <DashboardOnboarding />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <RealtimeStatusBanner status={realtimeStatus} />
      {hasCompleted && (
        <div className="app-stat-grid">
          <StatCard
            label="Average field match"
            value={`${stats.avgCompliance.toFixed(1)}%`}
            hint="Across completed downloads"
          />
          <StatCard
            label="Jobs in progress"
            value={String(stats.activeJobs)}
          />
          <StatCard
            label="Total records delivered"
            value={stats.totalRecords.toLocaleString()}
          />
          <StatCard
            label="Privacy screening"
            value="Applied"
            hint="Personal identifiers removed from outputs"
          />
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <SectionHeading className="block">Recent jobs</SectionHeading>
          {jobs.length > RECENT_JOBS_LIMIT && (
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-1 text-xs font-medium text-honey-600 hover:text-honey-500"
            >
              View all {jobs.length} jobs
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <JobTable
          jobs={jobs}
          limit={RECENT_JOBS_LIMIT}
          showDownloadAction={false}
        />
      </div>
    </DashboardPage>
  );
}
