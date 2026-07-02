import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getJobs } from "@/lib/data/jobs";

export default async function DashboardPageRoute() {
  const jobs = await getJobs();
  const hasJobs = jobs.length > 0;

  return (
    <>
      <DashboardHeader
        title={hasJobs ? "Overview" : "Welcome"}
        description={
          hasJobs
            ? "Summary of your collection activity."
            : "Create your first collection job to start receiving structured JSON."
        }
        action={
          hasJobs ? (
            <Link
              href="/dashboard/jobs/new"
              className="inline-flex items-center gap-2 rounded-lg bg-honey-500 px-4 py-2 text-sm font-medium text-graphite-950 shadow-sm shadow-honey-500/15 transition-colors hover:bg-honey-400"
            >
              <Plus className="h-4 w-4" />
              New job
            </Link>
          ) : undefined
        }
      />
      <DashboardOverview initialJobs={jobs} />
    </>
  );
}
