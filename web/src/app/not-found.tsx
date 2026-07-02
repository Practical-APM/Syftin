import Link from "next/link";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory-50">
      <header className="border-b border-ivory-200 px-6 py-4">
        <SyftinLogo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-mono text-sm text-honey-600">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-graphite-900">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm text-graphite-500">
          This page doesn&apos;t exist or may have moved during early access.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-graphite-500 hover:text-graphite-900"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
