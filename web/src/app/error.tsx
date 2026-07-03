"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory-50 dark:bg-graphite-950">
      <header className="border-b border-ivory-200 dark:border-graphite-800 px-6 py-4">
        <SyftinLogo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="mt-6 font-mono text-sm text-honey-600 dark:text-honey-400">
          500
        </p>
        <h1 className="app-page-title text-2xl leading-tight">
          Something went wrong
        </h1>
        <p className="app-page-lead max-w-md">
          {error.message || "An unexpected error occurred. Try again, or head back home while we look into it."}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-graphite-400">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
