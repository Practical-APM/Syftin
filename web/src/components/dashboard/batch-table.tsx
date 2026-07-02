import Link from "next/link";
import { ArrowDownToLine, ExternalLink } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { BATCH_STATUS_LABELS, type BatchSummary } from "@/lib/types/jobs";

// Ensure we have colors mapped for batches (reusing jobs if necessary, but defined in types)
const COLORS: Record<string, string> = {
  pending: "bg-graphite-500/15 text-graphite-500",
  queued: "bg-blue-500/15 text-blue-600",
  processing: "bg-honey-500/15 text-honey-600",
  validating: "bg-purple-500/15 text-purple-600",
  completed: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-red-500/15 text-red-600",
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
    <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ivory-200 bg-ivory-50/80">
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Batch
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Shards (Total / Done / Fail)
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Created
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500" />
          </tr>
        </thead>
        <tbody>
          {visibleBatches.map((batch) => (
            <tr
              key={batch.id}
              className="border-b border-ivory-100 last:border-0 transition-colors hover:bg-ivory-50/60"
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/batches/${batch.id}`}
                  className="font-medium text-graphite-900 hover:text-honey-600"
                >
                  {batch.name}
                </Link>
              </td>
              <td className="px-5 py-3.5 text-graphite-500">
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
              <td className="px-5 py-3.5 text-graphite-500">
                {formatDate(batch.created_at)}
              </td>
              <td className="px-5 py-3.5">
                <Link
                  href={`/dashboard/batches/${batch.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-graphite-500 hover:text-graphite-900"
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
