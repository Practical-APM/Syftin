import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ivory-50">
      <header className="border-b border-ivory-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <SyftinLogo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-graphite-500 transition-colors hover:text-graphite-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-graphite-900">
          {title}
        </h1>
        <div className="prose-legal mt-8 space-y-4 text-sm leading-relaxed text-graphite-600">
          {children}
        </div>
        <nav className="mt-12 flex flex-wrap gap-4 border-t border-ivory-200 pt-8 text-sm">
          <Link href="/privacy" className="text-graphite-500 hover:text-graphite-900">
            Privacy
          </Link>
          <Link href="/terms" className="text-graphite-500 hover:text-graphite-900">
            Terms
          </Link>
          <Link href="/dpa" className="text-graphite-500 hover:text-graphite-900">
            DPA
          </Link>
        </nav>
      </main>
    </div>
  );
}
