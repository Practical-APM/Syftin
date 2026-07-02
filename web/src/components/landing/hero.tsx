"use client";

import { AccessRequestForm } from "@/components/landing/access-request-form";
import { FadeIn } from "@/components/ui/fade-in";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { HeroBackground } from "@/components/landing/hero-background";
import { PulseDot } from "@/components/landing/micro-interactions";

const chips = ["Research", "LLM Fine-tuning", "AI Model Training"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      <HeroBackground />
      <div className="marketing-container relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.58fr)] lg:gap-14">
        <div>
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ivory-200 dark:border-graphite-700 bg-ivory-50/80 dark:bg-graphite-900/80 px-3.5 py-1.5 text-xs font-light text-graphite-500 dark:text-graphite-300 backdrop-blur-sm">
              <PulseDot />
              Early access open
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="marketing-hero-title text-4xl sm:text-5xl lg:text-[3.6rem]">
              High-quality niche data
              <br />
              <span className="text-honey-600 dark:text-honey-400">for research & AI.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="marketing-lead mt-6 max-w-lg text-base sm:text-lg">
              Turn public websites into structured JSON datasets for research,
              LLM fine-tuning, and AI model training — privacy-screened,
              quality-assured, and delivered right to your stack.
            </p>
          </FadeIn>
          <FadeIn delay={0.14}>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-900/50 px-3.5 py-1.5 text-xs font-normal text-graphite-600 dark:text-graphite-200"
                >
                  {chip}
                </span>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.18}>
            <div className="mt-9 space-y-4">
              <AccessRequestForm source="landing" variant="hero" />
              <a
                href="#demo"
                className="inline-block text-sm font-normal text-graphite-500 dark:text-graphite-300 transition-colors hover:text-graphite-900 dark:hover:text-ivory-50"
              >
                Or try the interactive preview →
              </a>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.08} direction="left" className="relative lg:pl-0">
          <DashboardPreview />
        </FadeIn>
      </div>
    </section>
  );
}
