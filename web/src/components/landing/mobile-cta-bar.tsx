"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPhase2EnabledClient } from "@/lib/env";

export function MobileCtaBar() {
  const [visible, setVisible] = useState(false);
  const phase2 = isPhase2EnabledClient();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ivory-200 dark:border-graphite-700 bg-ivory-50/95 dark:bg-graphite-950/95 p-3 backdrop-blur-md transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      role="region"
      aria-label="Quick actions"
    >
      <div className="flex items-center gap-2">
        <a href="#get-access" className="flex-1">
          <Button className="w-full" size="sm">
            Request access
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </a>
        {phase2 && (
          <Link href="/login?next=/contributor" className="shrink-0">
            <Button size="sm" variant="secondary">
              Node
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
