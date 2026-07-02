"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Dashboard error"
      message={error.message || "We couldn't load this dashboard page."}
      reset={reset}
      homeHref="/dashboard"
      homeLabel="Back to overview"
    />
  );
}
