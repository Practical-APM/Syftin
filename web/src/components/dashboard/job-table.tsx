import Link from "next/link";
import { ArrowDownToLine, ExternalLink } from "lucide-react";
import { cn, formatDate, formatComplianceScore, hasComplianceScore } from "@/lib/utils";
import { jobDownloadUrl } from "@/lib/jobs-utils";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type Job,
} from "@/lib/types/jobs";

export function JobTable({
  jobs,
  limit,
  showDownloadAction = true,
}: {
  jobs: Job[];
  limit?: number;
  showDownloadAction?: boolean;
}) {
  const visibleJobs = limit != null ? jobs.slice(0, limit) : jobs;
  return (
    <div className="app-data-table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Job
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Domain
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Field match
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Records
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Created
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300" />
          </tr>
        </thead>
        <tbody>
          {visibleJobs.map((job) => (
            <tr
              key={job.id}
              className="last:border-0"
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="font-medium text-graphite-900 dark:text-ivory-50 hover:text-honey-600 dark:hover:text-honey-400"
                >
                  {job.name}
                </Link>
              </td>
              <td className="px-5 py-3.5 font-mono text-xs text-graphite-500 dark:text-graphite-300">
                {job.domain}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    STATUS_COLORS[job.status],
                  )}
                >
                  {STATUS_LABELS[job.status]}
                </span>
              </td>
              <td className="px-5 py-3.5 text-graphite-900 dark:text-ivory-50">
                {hasComplianceScore(job.compliance_score)
                  ? formatComplianceScore(job.compliance_score)
                  : "—"}
              </td>
              <td className="px-5 py-3.5 text-graphite-500 dark:text-graphite-300">
                {job.record_count?.toLocaleString() ?? "—"}
              </td>
              <td className="px-5 py-3.5 text-graphite-500 dark:text-graphite-300">
                {formatDate(job.created_at)}
              </td>
              <td className="px-5 py-3.5">
                {job.status === "completed" && showDownloadAction ? (
                  <a
                    href={jobDownloadUrl(job)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-honey-600 dark:text-honey-400 hover:text-honey-500"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    JSON
                  </a>
                ) : (
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-graphite-500 dark:text-graphite-300 hover:text-graphite-900 dark:hover:text-ivory-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { StatCard as SharedStatCard } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return <SharedStatCard label={label} value={value} hint={hint} />;
}
