"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/fade-in";
import { HoverLift } from "@/components/landing/micro-interactions";
import {
  PipelineFlowchart,
  PipelineStageDetail,
} from "@/components/landing/pipeline-flowchart";
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
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="marketing-section bg-graphite-950">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight text-ivory-50 sm:text-4xl">
            From fields to file
          </h2>
          <p className="mt-3 max-w-xl text-sm text-graphite-400">
            Eight stages — the same pipeline the Go worker runs on every job.
            Select a step to explore.
          </p>
        </FadeIn>

        <FadeIn delay={0.06} className="mt-10 rounded-2xl border border-graphite-800 bg-graphite-900/60 p-5 sm:p-6">
          <PipelineFlowchart activeStage={activeStep} />
          <div className="mt-4 min-h-10">
            <PipelineStageDetail activeStage={activeStep} />
          </div>
        </FadeIn>

        <div
          className="mt-8 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
          data-lenis-prevent
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <FadeIn key={stage.id} delay={i * 0.04} className="shrink-0">
              <HoverLift>
                <button
                  type="button"
                  onClick={() => setActiveStep(i)}
                  className={`w-[260px] snap-center rounded-2xl border p-6 text-left transition-colors sm:w-[280px] ${
                    activeStep === i
                      ? "border-honey-500/40 bg-graphite-900"
                      : "border-graphite-700/60 bg-graphite-900/40 hover:border-graphite-600"
                  }`}
                >
                  <span className="font-mono text-sm text-honey-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-ivory-50">
                    {stage.label}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-graphite-400">
                    {stepHints[i] ?? stage.detail}
                  </p>
                  {activeStep === i && (
                    <motion.div
                      layoutId="how-it-works-active"
                      className="mt-4 h-0.5 rounded-full bg-honey-500"
                    />
                  )}
                </button>
              </HoverLift>
            </FadeIn>
          ))}
        </div>
        <p className="mt-4 text-xs text-graphite-500">← Swipe or tap a step</p>
      </div>
    </section>
  );
}
