import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { BATCH_STATUS_LABELS, type BatchSummary } from "@/lib/types/jobs";

const COLORS: Record<string, string> = {
  pending: "bg-graphite-500/15 text-graphite-500 dark:text-graphite-300",
  queued: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  processing: "bg-honey-500/15 text-honey-600 dark:text-honey-400",
  validating: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/15 text-red-600 dark:text-red-400",
  cancelled: "bg-graphite-500/10 text-graphite-400",
};

export function BatchTable({
  batches,
  limit,
}: {
  batches: BatchSummary[];
  limit?: number;
}) {
  const visibleBatches = limit != null ? batches.slice(0, limit) : batches;
  return (
    <div className="app-data-table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Batch
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Shards (Total / Done / Fail)
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300">
              Created
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500 dark:text-graphite-300" />
          </tr>
        </thead>
        <tbody>
          {visibleBatches.map((batch) => (
            <tr key={batch.id} className="last:border-0">
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/batches/${batch.id}`}
                  className="font-medium text-graphite-900 dark:text-ivory-50 hover:text-honey-600 dark:hover:text-honey-400"
                >
                  {batch.name}
                </Link>
              </td>
              <td className="px-5 py-3.5 text-graphite-500 dark:text-graphite-300">
                {batch.total_shards} / {batch.completed_shards} / {batch.failed_shards}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    COLORS[batch.status],
                  )}
                >
                  {BATCH_STATUS_LABELS[batch.status]}
                </span>
              </td>
              <td className="px-5 py-3.5 text-graphite-500 dark:text-graphite-300">
                {formatDate(batch.created_at)}
              </td>
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/batches/${batch.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-graphite-500 dark:text-graphite-300 hover:text-graphite-900 dark:hover:text-ivory-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
