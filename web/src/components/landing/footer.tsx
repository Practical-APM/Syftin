import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { isPhase2Enabled } from "@/lib/env";

const footerLinks = {
  Product: [
    { label: "Who it's for", href: "#who-its-for" },
    { label: "Product previews", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#demo" },
    { label: "Buyer dashboard", href: "/dashboard" },
    { label: "Documentation", href: "/docs" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "DPA", href: "/dpa" },
  ],
};

export function Footer() {
  const phase2 = isPhase2Enabled();
  const productLinks = phase2
    ? [
        ...footerLinks.Product,
        { label: "Contributor portal", href: "/login?next=/contributor" },
      ]
    : footerLinks.Product;

  const linkGroups = {
    Product: productLinks,
    Legal: footerLinks.Legal,
  };

  return (
    <footer className="border-t border-ivory-200 dark:border-graphite-800 bg-ivory-50 dark:bg-graphite-950">
      <div className="marketing-container py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <SyftinLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-graphite-500 dark:text-graphite-300">
              Syftin helps business teams collect structured JSON from approved
              public websites — pricing research, registry lookups, and job
              market reports — without maintaining custom scrapers.
            </p>
            <p className="mt-4 text-xs text-graphite-400">
              Early access pilot · India business customers
              {phase2 ? " · Contributor program by invite" : ""}
            </p>
          </div>

          {Object.entries(linkGroups).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-medium uppercase tracking-wider text-graphite-400 dark:text-graphite-400">
                {group}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-graphite-500 dark:text-graphite-300 transition-colors hover:text-graphite-900 dark:hover:text-honey-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-2xl border border-ivory-200 dark:border-graphite-800 bg-white dark:bg-graphite-900/50 p-6">
            <p className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
              Get early access
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-graphite-500 dark:text-graphite-400">
              Tell us the datasets you need — we&apos;ll get you set up on the
              pilot.
            </p>
            <a
              href="#get-access"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-honey-500 px-3.5 py-2 text-sm font-medium text-graphite-950 transition-colors hover:bg-honey-400"
            >
              Request access
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@syftin.io"
              className="mt-4 flex items-center gap-1.5 text-xs text-graphite-500 dark:text-graphite-400 transition-colors hover:text-graphite-900 dark:hover:text-honey-400"
            >
              <Mail className="h-3.5 w-3.5" />
              hello@syftin.io
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-ivory-200 dark:border-graphite-800 pt-8 sm:flex-row">
          <p className="text-xs text-graphite-400">
            © {new Date().getFullYear()} Syftin. All rights reserved.
          </p>
          <p className="text-xs text-graphite-400">
            Public web data collection for legitimate business research · Made in
            India
          </p>
        </div>
      </div>
    </footer>
  );
}
