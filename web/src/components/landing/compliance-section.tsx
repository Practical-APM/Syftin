import Link from "next/link";
import { FileCheck, Globe, Scale, Filter } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

const items = [
  { icon: Scale, label: "You control the data", href: undefined },
  { icon: FileCheck, label: "DPA available", href: "/dpa" as const },
  { icon: Globe, label: "Public pages only", href: undefined },
  { icon: Filter, label: "Content screened", href: undefined },
];

export function ComplianceSection() {
  return (
    <section id="compliance" className="marketing-section border-y border-graphite-800 bg-graphite-900">
      <div className="marketing-container">
        <FadeIn>
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-between">
            <div>
              <h2 className="marketing-title text-2xl sm:text-3xl">
                Trust built in
              </h2>
              <p className="marketing-lead mt-2 max-w-md">
                Approved public sites only. Written terms, DPA available, and
                PII screened before every delivery. Syftin is your data
                processor — your team stays in control.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="text-sm font-medium text-honey-400 hover:text-honey-300"
                >
                  Privacy policy →
                </Link>
                <Link
                  href="/dpa"
                  className="text-sm font-medium text-graphite-400 hover:text-graphite-300"
                >
                  Data Processing Agreement →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => {
                const inner = (
                  <>
                    <item.icon
                      className="h-5 w-5 text-honey-400"
                      strokeWidth={1.5}
                    />
                    <span className="text-xs font-medium text-graphite-300">
                      {item.label}
                    </span>
                  </>
                );
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-graphite-700/60 bg-graphite-800/40 px-4 py-5 text-center transition-colors hover:border-honey-500/30 hover:bg-graphite-800/60"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-2 rounded-xl border border-graphite-700/60 bg-graphite-800/40 px-4 py-5 text-center"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
