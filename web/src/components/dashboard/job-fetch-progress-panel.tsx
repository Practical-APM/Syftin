"use client";

import { Panel } from "@/components/ui/card";
import type { JobFetchProgress } from "@/lib/data/fetch-progress";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  completed: "bg-honey-400",
  pending: "bg-graphite-500",
  claimed: "bg-blue-400",
  failed: "bg-red-400",
  expired: "bg-amber-500",
};

export function JobFetchProgressPanel({
  progress,
}: {
  progress: JobFetchProgress;
}) {
  const inFlight = progress.pending + progress.claimed;
  const pct =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
  const waitingForCapacity = inFlight > 0 && progress.completed === 0;

  return (
    <Panel>
      <h3 className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
        Contributor page fetches
      </h3>
      <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-400">
        {progress.completed} of {progress.total} pages fetched
        {inFlight > 0 && ` · ${inFlight} in progress`}
        {progress.failed > 0 && ` · ${progress.failed} failed`}
        {progress.expired > 0 && ` · ${progress.expired} timed out`}
      </p>
      {waitingForCapacity && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Waiting for contributor capacity — the hub will self-serve if no node
          picks up pages within about 10 minutes.
        </p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-graphite-800">
        <div
          className="h-full rounded-full bg-honey-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progress.tasks.length > 1 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs">
          {progress.tasks.map((task) => (
            <li
              key={`${task.pageIndex}-${task.targetUrl}`}
              className="flex items-center gap-2 text-graphite-400"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  STATUS_DOT[task.status] ?? "bg-graphite-600",
                )}
              />
              <span className="font-mono text-[10px] text-graphite-500">
                p{task.pageIndex + 1}
              </span>
              <span className="truncate">{task.targetUrl}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
