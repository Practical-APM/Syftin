import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { JOB_REJECTION_GUIDES } from "@/lib/docs/content";

export const metadata = {
  title: "Troubleshooting | Syftin",
};

export default function DocsErrorsPage() {
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
          Troubleshooting
        </h1>
        <p className="mt-3 text-sm text-graphite-500">
          Common reasons jobs are rejected or produce lower field match scores.
        </p>

        <div className="mt-10 space-y-4">
          {JOB_REJECTION_GUIDES.map((guide) => (
            <article
              key={guide.title}
              className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-graphite-900">{guide.title}</h2>
              <p className="mt-2 text-sm text-graphite-600">
                <span className="font-medium text-graphite-700">Cause: </span>
                {guide.cause}
              </p>
              <p className="mt-2 text-sm text-graphite-600">
                <span className="font-medium text-graphite-700">What to do: </span>
                {guide.fix}
              </p>
              <Link
                href={guide.link}
                className="mt-3 inline-block text-sm font-medium text-honey-600 hover:text-honey-500"
              >
                Related →
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-graphite-500">
          Still stuck?{" "}
          <a
            href="mailto:hello@syftin.io"
            className="font-medium text-honey-600 hover:text-honey-500"
          >
            Contact support
          </a>
          .
        </p>
      </main>
    </div>
  );
}
