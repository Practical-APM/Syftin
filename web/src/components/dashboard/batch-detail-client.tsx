"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownToLine, Trash2 } from "lucide-react";
import { BATCH_STATUS_LABELS, type JobBatch, type Job } from "@/lib/types/jobs";
import { DashboardHeader, DashboardPage, SchemaPreview } from "@/components/dashboard/sidebar";
import { JobTable } from "@/components/dashboard/job-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Real-time hooks could be added here similar to use-job-realtime, but we'll stick to basic display for now
export function BatchDetailClient({
  initialBatch,
  initialJobs,
}: {
  initialBatch: JobBatch;
  initialJobs: Job[];
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const COLORS: Record<string, string> = {
    pending: "bg-graphite-500/15 text-graphite-500",
    queued: "bg-blue-500/15 text-blue-600",
    processing: "bg-honey-500/15 text-honey-600",
    validating: "bg-purple-500/15 text-purple-600",
    completed: "bg-emerald-500/15 text-emerald-600",
    failed: "bg-red-500/15 text-red-600",
    cancelled: "bg-graphite-500/10 text-graphite-400",
  };

  async function handleCancel() {
    if (!confirm("Cancel this batch and all active shards?")) return;
    setCancelling(true);
    await fetch(`/api/batches/${initialBatch.id}/cancel`, { method: "POST" });
    setCancelling(false);
    router.refresh();
  }

  const isCancellable = ["pending", "queued", "processing", "validating"].includes(initialBatch.status);
  const isComplete = initialBatch.status === "completed";

  return (
    <>
      <DashboardHeader
        title={initialBatch.name}
        action={
          <div className="flex items-center gap-3">
            {isCancellable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                <Trash2 className="h-4 w-4" />
                Cancel batch
              </Button>
            )}
            {isComplete && (
              <a
                href={`/api/batches/${initialBatch.id}/result`}
                download
                className="inline-flex items-center gap-2 rounded-full bg-honey-500 px-5 py-2.5 text-sm font-medium text-graphite-950 shadow-sm shadow-honey-500/20 transition-all hover:bg-honey-400"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Download merged JSON
              </a>
            )}
          </div>
        }
      />

      <DashboardPage>
        <Link
          href="/dashboard/batches"
          className="mb-6 inline-flex items-center gap-2 text-sm text-graphite-500 transition-colors hover:text-graphite-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batches
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-graphite-900">Child Shards</h2>
            <JobTable jobs={initialJobs} showDownloadAction={false} />
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-medium text-graphite-900">
                Batch details
              </h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-graphite-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        COLORS[initialBatch.status],
                      )}
                    >
                      {BATCH_STATUS_LABELS[initialBatch.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-graphite-500">Progress</dt>
                  <dd className="mt-1 font-medium text-graphite-900">
                    {initialBatch.completed_shards} / {initialBatch.total_shards} completed
                  </dd>
                  {initialBatch.failed_shards > 0 && (
                    <dd className="mt-1 text-xs text-red-600">
                      {initialBatch.failed_shards} failed
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-graphite-500">Pricing Model</dt>
                  <dd className="mt-1 font-mono text-xs text-graphite-700">
                    {initialBatch.batch_pricing}
                  </dd>
                </div>
              </dl>
            </div>
            
            <SchemaPreview schema={initialBatch.example_schema} />
          </div>
        </div>
      </DashboardPage>
    </>
  );
}
