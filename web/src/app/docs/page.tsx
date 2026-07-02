import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import {
  WORKFLOW_STEPS,
} from "@/lib/docs/content";

export const metadata = {
  title: "Help & guides | Syftin",
};

export default function DocsIndexPage() {
  return (
    <div className="min-h-dvh bg-ivory-50">
      <header className="border-b border-ivory-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <SyftinLogo />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-graphite-500 hover:text-graphite-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-2 text-honey-600">
          <BookOpen className="h-5 w-5" />
          <p className="text-xs font-medium uppercase tracking-wider">
            Buyer guides
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-graphite-900">
          How to use Syftin
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-graphite-500">
          Quick reference for Persona A pilot customers — creating jobs,
          understanding outputs, and fixing common issues.
        </p>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-graphite-900">
            Collection workflow
          </h2>
          <ol className="mt-4 space-y-4">
            {WORKFLOW_STEPS.map((item) => (
              <li
                key={item.step}
                className="flex gap-4 rounded-xl border border-ivory-200 bg-white p-4 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10 font-mono text-sm text-honey-600">
                  {item.step}
                </span>
                <div>
                  <p className="font-medium text-graphite-900">{item.title}</p>
                  <p className="mt-1 text-sm text-graphite-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/docs/schemas"
            className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-graphite-900">Schema examples</p>
            <p className="mt-1 text-sm text-graphite-500">
              Sample JSON fields for each approved domain.
            </p>
          </Link>
          <Link
            href="/docs/errors"
            className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-graphite-900">
              Troubleshooting
            </p>
            <p className="mt-1 text-sm text-graphite-500">
              Why jobs fail or score below target.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
