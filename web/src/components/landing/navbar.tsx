"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPhase2EnabledClient } from "@/lib/env";

const navLinks = [
  { href: "#who-its-for", label: "Who it's for" },
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const phase2 = isPhase2EnabledClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-ivory-200/80 dark:border-graphite-700 bg-ivory-50/90 dark:bg-graphite-950/90 backdrop-blur-md gpu-layer"
          : "bg-transparent",
      )}
    >
      <div className="marketing-container flex h-16 items-center justify-between">
        <SyftinLogo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-graphite-500 dark:text-graphite-300 transition-colors hover:text-graphite-900 dark:hover:text-ivory-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#get-access"
            className="text-sm font-medium text-graphite-500 dark:text-graphite-300 transition-colors hover:text-graphite-900 dark:hover:text-ivory-50"
          >
            Sign in
          </a>
          <a href="#get-access">
            <Button size="sm">
              Request access
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-graphite-900 dark:text-ivory-50 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-950 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-graphite-500 dark:text-graphite-300"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href="#get-access" onClick={() => setMobileOpen(false)}>
              <Button className="w-full">Request access</Button>
            </a>
            {phase2 && (
              <Link
                href="/login?next=/contributor"
                onClick={() => setMobileOpen(false)}
                className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                Contributor sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
