"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorFallback({
  title = "Something went wrong",
  message = "An unexpected error occurred. Try again or return to a safe page.",
  reset,
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: {
  title?: string;
  message?: string;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-ivory-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-graphite-900">{title}</h2>
        <p className="mt-2 text-sm text-graphite-500">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {reset && (
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          )}
          <Link href={homeHref}>
            <Button>{homeLabel}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-medium text-red-800 underline-offset-2 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
