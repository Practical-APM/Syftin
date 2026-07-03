"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Cpu } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { HoverLift } from "@/components/landing/micro-interactions";
import { Button } from "@/components/ui/button";
import { isPhase2EnabledClient } from "@/lib/env";

const personas = [
  {
    id: "buyer",
    icon: Building2,
    audience: "Business teams",
    title: "Get structured data without building scrapers",
    description:
      "Data ops, product analysts, and founders who need clean JSON from public websites — pricing pages, company registries, job listings — with quality scores and privacy screening built in.",
    bullets: [
      "Download JSON or push via webhook, API, S3/GCS, or SFTP",
      "Only Syftin-approved public domains — no grey-area targets",
      "DPA available; you remain the data controller",
    ],
    cta: { label: "Request buyer access", href: "#get-access" },
    accent: "border-honey-500/30 bg-honey-500/5",
    iconColor: "text-honey-600",
  },
  {
    id: "contributor",
    icon: Cpu,
    audience: "Contributors",
    title: "Share idle laptop resources for approved fetches",
    description:
      "Students and homelab operators invited to run a lightweight background app. Your device fetches public HTML for jobs Syftin has already approved — nothing else.",
    bullets: [
      "One-line install; hardware tier auto-detected on startup",
      "Eco / Balanced / Titan profiles with thermal PID throttling",
      "Pause on battery, metered data, or when you use the machine",
    ],
    cta: {
      label: "Contributor sign in",
      href: "/login?next=/contributor",
    },
    accent: "border-emerald-500/25 bg-emerald-500/5",
    iconColor: "text-emerald-600",
  },
  {
    id: "curious",
    icon: Briefcase,
    audience: "Everyone else",
    title: "Public data, collected responsibly",
    description:
      "Syftin is not a general-purpose scraper or a personal research tool. We help vetted business teams collect structured datasets from whitelisted public pages — with written terms, input screening, and PII removed before download.",
    bullets: [
      "Early access pilot for India-based business customers",
      "No crypto, no proxy resale, no bypass language",
      "Questions? Read our privacy policy or email hello@syftin.io",
    ],
    cta: { label: "Read how it works", href: "#demo" },
    accent: "border-ivory-300 bg-ivory-50",
    iconColor: "text-graphite-600",
  },
] as const;

export function PersonasSection() {
  return (
    <section id="who-its-for" className="marketing-section border-y border-ivory-200 dark:border-graphite-700 bg-ivory-100/40 dark:bg-graphite-900/30">
      <div className="marketing-container">
        <FadeIn>
          <p className="marketing-eyebrow">
            Who it&apos;s for
          </p>
          <h2 className="marketing-title mt-3 text-3xl sm:text-4xl">
            Three audiences, one platform
          </h2>
          <p className="marketing-lead max-w-2xl">
            Whether you need datasets for your team, run a contributor device,
            or just want to understand what Syftin does — start here.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {personas.map((persona, i) => (
            <FadeIn key={persona.id} delay={i * 0.05}>
              <HoverLift className="h-full">
                <article
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    persona.id === "buyer"
                      ? "border-honey-500/30 bg-honey-500/5 dark:border-honey-500/25 dark:bg-honey-500/10"
                      : persona.id === "contributor"
                      ? "border-emerald-500/25 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-ivory-200 bg-ivory-50 dark:border-graphite-700 dark:bg-graphite-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-graphite-800/80 shadow-sm">
                      <persona.icon
                        className={`h-5 w-5 ${
                          persona.id === "buyer"
                            ? "text-honey-600 dark:text-honey-400"
                            : persona.id === "contributor"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-graphite-600 dark:text-graphite-300"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-xs font-normal uppercase tracking-wider text-graphite-500 dark:text-graphite-300">
                      {persona.audience}
                    </p>
                  </div>
                  <h3 className="mt-5 text-lg font-medium text-graphite-900 dark:text-ivory-50">
                    {persona.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed font-normal text-graphite-500 dark:text-graphite-300">
                    {persona.description}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {persona.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-sm font-normal text-graphite-600 dark:text-graphite-200"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-honey-500" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link href={persona.cta.href} className="mt-6">
                    <Button
                      variant={persona.id === "buyer" ? "primary" : "secondary"}
                      size="sm"
                      className="group w-full sm:w-auto"
                    >
                      {persona.cta.label}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </article>
              </HoverLift>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
