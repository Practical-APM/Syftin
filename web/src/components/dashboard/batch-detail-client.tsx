"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownToLine, Trash2 } from "lucide-react";
import { BATCH_STATUS_LABELS, type JobBatch, type Job } from "@/lib/types/jobs";
import { DashboardHeader, DashboardPage, SchemaPreview } from "@/components/dashboard/sidebar";
import { JobTable } from "@/components/dashboard/job-table";
import { Button } from "@/components/ui/button";
import { formatInrFromCents } from "@/lib/pricing/estimates";
import { cn } from "@/lib/utils";

type SyftinMeta = {
  max_records?: number;
  budget_cents?: number;
  effective_max_records?: number;
};

function readSyftinMeta(schema: Record<string, unknown>): SyftinMeta | null {
  const raw = schema._syftin;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as SyftinMeta;
}

export function BatchDetailClient({
  initialBatch,
  initialJobs,
}: {
  initialBatch: JobBatch;
  initialJobs: Job[];
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const syftin = readSyftinMeta(initialBatch.example_schema);

  const COLORS: Record<string, string> = {
    pending: "bg-graphite-500/15 text-graphite-300",
    queued: "bg-blue-500/15 text-blue-400",
    processing: "bg-honey-500/15 text-honey-400",
    validating: "bg-purple-500/15 text-purple-400",
    completed: "bg-honey-500/15 text-honey-400",
    failed: "bg-red-500/15 text-red-400",
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
        <Link href="/dashboard/jobs?tab=batches" className="app-back-link mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to batches
        </Link>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            <h2 className="text-lg font-medium text-ivory-50">Child shards</h2>
            <JobTable jobs={initialJobs} showDownloadAction={false} />
          </div>
          <div className="min-w-0 space-y-6">
            <div className="app-panel p-5">
              <h3 className="text-sm font-medium text-ivory-50">Batch details</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-graphite-400">Status</dt>
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
                  <dt className="text-graphite-400">Progress</dt>
                  <dd className="mt-1 font-medium text-ivory-50">
                    {initialBatch.completed_shards} / {initialBatch.total_shards} completed
                  </dd>
                  {initialBatch.failed_shards > 0 && (
                    <dd className="mt-1 text-xs text-red-400">
                      {initialBatch.failed_shards} failed
                    </dd>
                  )}
                </div>
                {syftin?.budget_cents != null && (
                  <div>
                    <dt className="text-graphite-400">Budget</dt>
                    <dd className="mt-1 font-medium text-honey-400">
                      {formatInrFromCents(syftin.budget_cents)}
                    </dd>
                  </div>
                )}
                {syftin?.max_records != null && (
                  <div>
                    <dt className="text-graphite-400">Target volume per URL</dt>
                    <dd className="mt-1 font-mono text-xs text-graphite-200">
                      {syftin.max_records.toLocaleString()} rows
                    </dd>
                    {syftin.effective_max_records != null &&
                      syftin.effective_max_records < syftin.max_records && (
                        <dd className="mt-1 text-xs text-graphite-500">
                          Expected ~{syftin.effective_max_records.toLocaleString()} rows
                          (budget-limited)
                        </dd>
                      )}
                  </div>
                )}
              </dl>
            </div>

            <SchemaPreview schema={initialBatch.example_schema} />
          </div>
        </div>
      </DashboardPage>
    </>
  );
}
