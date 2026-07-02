import Link from "next/link";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory-50 dark:bg-graphite-950">
      <header className="border-b border-ivory-200 dark:border-graphite-800 px-6 py-4">
        <SyftinLogo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-mono text-sm text-honey-600 dark:text-honey-400">404</p>
        <h1 className="app-page-title text-2xl leading-tight">
          Page not found
        </h1>
        <p className="app-page-lead">
          This page doesn&apos;t exist or may have moved during early access.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-graphite-500 dark:text-graphite-300 hover:text-graphite-900 dark:hover:text-ivory-50"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
