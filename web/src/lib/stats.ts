import type { Job } from "@/lib/types/jobs";

export function computeDashboardStats(jobs: Job[]) {
  const completed = jobs.filter((j) => j.status === "completed");
  const avgCompliance =
    completed.length > 0
      ? completed.reduce((s, j) => s + (j.compliance_score ?? 0), 0) /
        completed.length
      : 0;

  return {
    avgCompliance,
    activeJobs: jobs.filter((j) =>
      ["pending", "queued", "processing", "validating"].includes(j.status),
    ).length,
    totalRecords: completed.reduce((s, j) => s + (j.record_count ?? 0), 0),
  };
}
