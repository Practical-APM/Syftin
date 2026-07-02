"use client";

import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";
import { NodeCapacityEstimator } from "@/components/contributor/node-capacity-estimator";
import { isPhase2EnabledClient } from "@/lib/env";

export function LandingNodeCapacitySection() {
  const phase2 = isPhase2EnabledClient();
  if (!phase2) return null;

  return (
    <section
      id="node-calculator"
      className="marketing-section border-y border-ivory-200 dark:border-graphite-800 bg-ivory-100/40 dark:bg-graphite-900/30"
    >
      <div className="marketing-container">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <FadeIn>
            <p className="marketing-eyebrow">
              Contributor estimator
            </p>
            <h2 className="marketing-title mt-3 text-3xl sm:text-4xl">
              Check your laptop&apos;s earning potential
            </h2>
            <p className="marketing-lead mt-4 max-w-lg">
              No download required. Pick your OS and RAM, set daily uptime, and
              see your likely Scout / Ranger / Titan tier. Eco mode and thermal
              PID throttling keep your machine cool while you earn.
            </p>
            <Link href="/login?next=/contributor" className="mt-6 inline-block">
              <span className="inline-flex h-10 items-center justify-center rounded-lg bg-honey-500 px-4 text-sm font-medium text-graphite-950 transition-colors hover:bg-honey-400">
                Contributor sign in
              </span>
            </Link>
          </FadeIn>

          <FadeIn delay={0.08}>
            <NodeCapacityEstimator />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
