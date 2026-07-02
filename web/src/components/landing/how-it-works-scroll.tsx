"use client";

import { FadeIn } from "@/components/ui/fade-in";
import { PIPELINE_STAGES } from "@/lib/demo/pipeline-demos";

const stepHints = [
  "Job name, URL, and example fields — same as Create a job",
  "Domain checked against Syftin's approved site list",
  "Input screened for prohibited content before collection",
  "Public HTML retrieved via HTTP or Playwright when needed",
  "Local LLM maps page content to your field schema",
  "Emails and phone numbers removed from every row",
  "Field match score computed against your example schema",
  "Download or auto-push — webhook, API, S3/GCS bucket, or SFTP drop",
];

export function HowItWorksScroll() {
  return (
    <section id="how-it-works" className="marketing-section bg-graphite-950">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight text-ivory-50 sm:text-4xl">
            From fields to file
          </h2>
          <p className="mt-3 max-w-xl text-sm text-graphite-400">
            Eight stages — the same pipeline the Go worker runs on every job.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <FadeIn key={stage.id} delay={i * 0.04}>
              <div className="rounded-2xl border border-graphite-800 bg-graphite-900/60 p-6 transition-colors hover:border-honey-500/40">
                <span className="font-mono text-sm text-honey-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-ivory-50">
                  {stage.label}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-graphite-400">
                  {stepHints[i] ?? stage.detail}
                </p>
                <div className="mt-4 h-0.5 rounded-full bg-honey-500/30" />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
