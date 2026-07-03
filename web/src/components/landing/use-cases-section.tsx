"use client";

import { Briefcase, Building2, ShoppingCart } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { HoverLift } from "@/components/landing/micro-interactions";

const useCases = [
  {
    icon: ShoppingCart,
    title: "Retail & delivery pricing",
    domain: "blinkit.com · zeptonow.com",
    bar: "bg-honey-400",
    iconClass: "text-honey-400",
    mock: ["Amul Milk — ₹56", "Bread — ₹45", "Eggs — ₹72"],
  },
  {
    icon: Building2,
    title: "Company registries",
    domain: "mca.gov.in",
    bar: "bg-honey-500",
    iconClass: "text-honey-500",
    mock: ["CIN lookup", "Filing date", "Return type"],
  },
  {
    icon: Briefcase,
    title: "Job market signals",
    domain: "naukri.com",
    bar: "bg-honey-600",
    iconClass: "text-honey-600 dark:text-honey-400",
    mock: ["React roles ↑", "Bangalore hiring", "Salary bands"],
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="marketing-section">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="marketing-title text-3xl sm:text-4xl">
            Built for real research workflows
          </h2>
          <p className="marketing-lead">
            Pilot customers use Syftin across retail pricing, corporate
            registries, and hiring intelligence — all from approved public
            sources.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {useCases.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06}>
              <HoverLift className="h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-900/80">
                  <div className={`h-1.5 ${item.bar}`} />
                  <div className="flex flex-1 flex-col p-6">
                    <item.icon
                      className={`h-5 w-5 ${item.iconClass}`}
                      strokeWidth={1.5}
                    />
                    <h3 className="mt-4 text-lg font-semibold text-graphite-900 dark:text-ivory-50">
                      {item.title}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-graphite-400">
                      {item.domain}
                    </p>
                    <ul className="mt-5 space-y-2 border-t border-ivory-200 dark:border-graphite-700 pt-5">
                      {item.mock.map((line) => (
                        <li
                          key={line}
                          className="flex items-center gap-2 text-sm text-graphite-500 dark:text-graphite-300"
                        >
                          <span className={`h-1 w-1 rounded-full ${item.bar}`} />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </HoverLift>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
