import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { DOMAIN_GUIDES } from "@/lib/docs/content";

export const metadata = {
  title: "Schema examples | Syftin",
};

export default function DocsSchemasPage() {
  return (
    <div className="min-h-dvh bg-ivory-50">
      <header className="border-b border-ivory-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <SyftinLogo />
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-graphite-500 hover:text-graphite-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All guides
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-graphite-900">
          Schema examples by domain
        </h1>
        <p className="mt-3 text-sm text-graphite-500">
          Paste one example row as JSON when creating a job. Syftin uses these
          field names to shape and score your download.
        </p>

        <div className="mt-10 space-y-6">
          {DOMAIN_GUIDES.map((guide) => (
            <article
              key={guide.domain}
              className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm"
            >
              <div className="border-b border-ivory-200 px-5 py-4">
                <p className="font-mono text-sm font-medium text-graphite-900">
                  {guide.domain}
                </p>
                <p className="mt-0.5 text-xs text-graphite-500">
                  {guide.vertical} · {guide.fetchNote}
                </p>
              </div>
              <pre className="overflow-x-auto bg-graphite-950 p-5 font-mono text-xs leading-relaxed text-emerald-400/90">
                {guide.schemaJson}
              </pre>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
