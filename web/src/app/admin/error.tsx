"use client";

import { ErrorFallback } from "@/components/ui/error-fallback";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Admin console error"
      message={error.message || "We couldn't load this admin page."}
      reset={reset}
      homeHref="/admin"
      homeLabel="Back to admin overview"
    />
  );
}
