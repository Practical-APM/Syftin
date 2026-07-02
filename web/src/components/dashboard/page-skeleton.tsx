import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-ivory-200/80 dark:bg-graphite-800/80", className)}
      aria-hidden
    />
  );
}

export function DashboardHeaderSkeleton({
  withAction = false,
}: {
  withAction?: boolean;
}) {
  return (
    <div className="shrink-0 border-b border-ivory-200 dark:border-graphite-800 bg-ivory-50/95 dark:bg-graphite-950/95">
      <div
        className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-6 py-6 lg:px-8 lg:py-7"
        style={{ maxWidth: "var(--app-content-max)" }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {withAction && <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />}
      </div>
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 p-6 shadow-sm">
            <Skeleton className="h-3 w-24" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="rounded-xl border border-ivory-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function JobsTableSkeleton() {
  return (
    <div className="space-y-3 px-6 py-6 lg:px-8 lg:py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 lg:px-8 lg:py-8">
      <div className="app-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
