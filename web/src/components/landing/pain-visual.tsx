"use client";

import { FileSpreadsheet, Layers, ShieldAlert } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { HoverLift } from "@/components/landing/micro-interactions";

const pains = [
  {
    icon: FileSpreadsheet,
    title: "Messy pages",
    subtitle: "HTML is not a spreadsheet",
    gradient: "from-graphite-800 to-graphite-900",
  },
  {
    icon: Layers,
    title: "Different every site",
    subtitle: "Same fields, different layouts",
    gradient: "from-graphite-800 to-graphite-950",
  },
  {
    icon: ShieldAlert,
    title: "Privacy risk",
    subtitle: "PII hides in raw exports",
    gradient: "from-graphite-900 to-graphite-950",
  },
];

export function PainVisual() {
  return (
    <section id="why-syftin" className="marketing-section bg-graphite-900">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="marketing-title text-center text-3xl sm:text-4xl">
            Web data should arrive{" "}
            <span className="text-honey-400">clean</span>, not copied by hand.
          </h2>
        </FadeIn>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {pains.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06}>
              <HoverLift>
                <div
                  className={`rounded-2xl bg-linear-to-br ${item.gradient} border border-graphite-700/50 p-8`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-honey-500/15">
                    <item.icon className="h-5 w-5 text-honey-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-ivory-50">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-graphite-400">
                    {item.subtitle}
                  </p>
                </div>
              </HoverLift>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
