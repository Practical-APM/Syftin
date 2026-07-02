import Link from "next/link";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { isPhase2Enabled } from "@/lib/env";

const footerLinks = {
  Product: [
    { label: "Who it's for", href: "#who-its-for" },
    { label: "Product previews", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "Interactive demo", href: "#demo" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Buyer dashboard", href: "/dashboard" },
    { label: "Documentation", href: "/docs" },
    { label: "Request access", href: "#get-access" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "DPA", href: "/dpa" },
  ],
  Contact: [{ label: "hello@syftin.io", href: "mailto:hello@syftin.io" }],
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
    Contact: footerLinks.Contact,
  };

  return (
    <footer className="border-t border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-950">
      <div className="marketing-container py-16 lg:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <SyftinLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-graphite-500 dark:text-graphite-300">
              Syftin helps business teams collect structured JSON from approved
              public websites — pricing research, registry lookups, and job
              market reports — without maintaining custom scrapers.
            </p>
            <p className="mt-3 text-xs text-graphite-400 dark:text-graphite-400">
              Early access pilot · India business customers
              {phase2 ? " · Contributor program by invite" : ""}
            </p>
          </div>
          {Object.entries(linkGroups).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-medium uppercase tracking-wider text-graphite-500 dark:text-graphite-300">
                {group}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-graphite-500 dark:text-graphite-300 transition-colors hover:text-graphite-900 dark:hover:text-ivory-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-ivory-200 dark:border-graphite-700 pt-8 sm:flex-row">
          <p className="text-xs text-graphite-400 dark:text-graphite-400">
            © {new Date().getFullYear()} Syftin. All rights reserved.
          </p>
          <p className="text-xs text-graphite-400 dark:text-graphite-400">
            Public web data collection for legitimate business research.
          </p>
        </div>
      </div>
    </footer>
  );
}
