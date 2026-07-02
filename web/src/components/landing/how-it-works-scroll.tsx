"use client";

import { FadeIn } from "@/components/ui/fade-in";
import { PIPELINE_STAGES } from "@/lib/demo/pipeline-demos";

export function HowItWorksScroll() {
  return (
    <section id="how-it-works" className="marketing-section bg-graphite-950">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight text-ivory-50 sm:text-4xl">
            From request to ready.
          </h2>
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
                <div className="mt-4 h-0.5 rounded-full bg-honey-500/30" />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
