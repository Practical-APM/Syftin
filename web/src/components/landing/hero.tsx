"use client";

import { AccessRequestForm } from "@/components/landing/access-request-form";
import { FadeIn } from "@/components/ui/fade-in";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { HeroBackground } from "@/components/landing/hero-background";
import { PulseDot } from "@/components/landing/micro-interactions";

const chips = ["Pricing", "Registries", "Job listings"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
      <HeroBackground />
      <div className="marketing-container relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <FadeIn>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ivory-200 bg-ivory-50/80 px-3 py-1 text-xs text-graphite-500 backdrop-blur-sm">
              <PulseDot />
              Early access open
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight text-graphite-900 sm:text-5xl lg:text-[3.4rem]">
              Structured data from
              <br />
              <span className="text-honey-600">public websites.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-5 max-w-md text-lg text-graphite-500">
              Define the fields you need. Syftin collects from approved public
              sites, screens for privacy, and delivers JSON — or pushes to your
              webhook, bucket, or SFTP.
            </p>
          </FadeIn>
          <FadeIn delay={0.14}>
            <div className="mt-7 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-ivory-200 bg-ivory-50 px-3 py-1 text-xs font-medium text-graphite-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.18}>
            <div className="mt-8 space-y-4">
              <AccessRequestForm source="landing" variant="hero" />
              <a
                href="#demo"
                className="inline-block text-sm font-medium text-graphite-500 transition-colors hover:text-graphite-900"
              >
                Or try the interactive preview →
              </a>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.08} direction="left" className="relative lg:pl-2">
          <DashboardPreview />
        </FadeIn>
      </div>
    </section>
  );
}
