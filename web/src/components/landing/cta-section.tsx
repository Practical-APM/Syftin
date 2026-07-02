"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { AccessRequestForm } from "@/components/landing/access-request-form";
import { isPhase2EnabledClient } from "@/lib/env";

export function CtaSection() {
  const phase2 = isPhase2EnabledClient();

  return (
    <section id="get-access" className="marketing-section">
      <div className="marketing-container">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-graphite-900 px-8 py-14 sm:px-16">
            <div className="gradient-radial-dark pointer-events-none absolute inset-0" />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="marketing-title text-3xl sm:text-4xl">
                Ready to collect data the right way?
              </h2>
              <p className="marketing-lead mx-auto max-w-lg">
                Request buyer access with your work email, or sign in if you
                already have an invite.
              </p>

              <div className="mt-8">
                <AccessRequestForm source="landing" variant="cta" />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-graphite-700 bg-graphite-800 text-ivory-50 hover:bg-graphite-700"
                  >
                    Already invited? Sign in
                  </Button>
                </Link>
                {phase2 && (
                  <Link href="/login?next=/contributor">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-graphite-400 hover:bg-graphite-800 hover:text-ivory-50"
                    >
                      Contributor sign in
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
                <a
                  href="#faq"
                  className="px-2 text-sm font-medium text-graphite-500 transition-colors hover:text-ivory-50"
                >
                  FAQ
                </a>
              </div>

              <p className="mt-6 text-xs text-graphite-500">
                Invite-only pilot for India-based business customers.
                {phase2
                  ? " Contributor earnings depend on live task volume — not guaranteed income."
                  : ""}
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
