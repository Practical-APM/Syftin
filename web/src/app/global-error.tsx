"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center bg-graphite-950 px-6 py-16 text-center">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight text-ivory-50">
              Syftin
            </span>
          </div>
          <p className="mt-8 font-mono text-sm text-honey-400">500</p>
          <h1 className="mt-2 text-2xl font-light tracking-tight text-ivory-50">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md text-sm text-graphite-300">
            {error.message ||
              "A critical error occurred while loading Syftin. Please try again."}
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-graphite-500">
              Ref: {error.digest}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-honey-500 px-4 text-sm font-medium text-graphite-950 transition-colors hover:bg-honey-400"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-graphite-700 px-4 text-sm font-medium text-graphite-200 transition-colors hover:border-graphite-600 hover:text-ivory-50"
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
