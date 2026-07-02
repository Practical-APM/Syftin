import { DashboardEmptyDownloads } from "@/components/dashboard/dashboard-empty-downloads";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { getJobs } from "@/lib/data/jobs";
import { jobDownloadUrl } from "@/lib/jobs-utils";
import { formatDate } from "@/lib/utils";
import { ArrowDownToLine } from "lucide-react";

export default async function ExportsPage() {
  const jobs = await getJobs();
  const exports = jobs.filter((j) => j.status === "completed");

  return (
    <>
      <DashboardHeader
        title="Downloads"
        description="Completed job exports."
      />
      <DashboardPage>
        {exports.length === 0 ? (
          <DashboardEmptyDownloads />
        ) : (
          <div className="space-y-3">
            {exports.map((job) => (
              <Panel
                key={job.id}
                padding="md"
                className="flex flex-wrap items-center justify-between gap-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-graphite-900">{job.name}</p>
                  <p className="mt-0.5 text-xs text-graphite-500">
                    {job.record_count?.toLocaleString() ?? "—"} records ·{" "}
                    {formatDate(job.completed_at ?? job.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["json", "csv", "ndjson"] as const).map((format) => (
                    <a
                      key={format}
                      href={jobDownloadUrl(job, format)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ivory-200 bg-ivory-50 px-3 py-2 text-xs font-medium uppercase text-graphite-900 transition-colors hover:border-honey-500/40 hover:bg-honey-500/5"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      {format}
                    </a>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </DashboardPage>
    </>
  );
}
