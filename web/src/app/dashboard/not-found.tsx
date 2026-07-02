import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <>
      <DashboardHeader
        title="Page not found"
        description="This dashboard page does not exist or may have been removed."
      />
      <DashboardPage>
        <div className="rounded-xl border border-ivory-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-graphite-500">
            Check the URL or return to your overview.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button>Go to overview</Button>
            </Link>
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-1.5 text-sm text-graphite-500 hover:text-graphite-900"
            >
              <ArrowLeft className="h-4 w-4" />
              View jobs
            </Link>
          </div>
        </div>
      </DashboardPage>
    </>
  );
}
