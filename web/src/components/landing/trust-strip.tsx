import { Globe, Plug, ShieldCheck, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

const items = [
  {
    icon: Sparkles,
    label: "Early access pilot",
    detail: "Invite-only for India business teams",
  },
  {
    icon: Globe,
    label: "Approved public sites",
    detail: "Whitelist enforced on every job",
  },
  {
    icon: Plug,
    label: "Flexible delivery",
    detail: "Webhook, API, S3/GCS, or SFTP",
  },
  {
    icon: ShieldCheck,
    label: "Privacy screened",
    detail: "PII removed before download",
  },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Platform highlights"
      className="border-y border-ivory-200 dark:border-graphite-800 bg-white/60 dark:bg-graphite-900/40 py-5 backdrop-blur-sm"
    >
      <div className="marketing-container py-8">
        <FadeIn>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-honey-500/10">
                  <item.icon
                    className="h-4 w-4 text-honey-600 dark:text-honey-400"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-graphite-500 dark:text-graphite-300">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
