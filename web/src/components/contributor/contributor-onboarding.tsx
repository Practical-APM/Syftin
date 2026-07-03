"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_STEPS } from "@/lib/contributor/install-commands";

export function ContributorOnboarding({
  hasUpi,
  hasDevice,
  hasOnlineNode,
}: {
  hasUpi: boolean;
  hasDevice: boolean;
  hasOnlineNode: boolean;
}) {
  const completed = {
    profile: hasUpi,
    device: hasDevice,
    install: hasOnlineNode,
    verify: hasOnlineNode,
  };

  const doneCount = Object.values(completed).filter(Boolean).length;
  if (doneCount >= 4) return null;

  const stepStatus = [
    completed.profile,
    hasUpi && completed.device,
    completed.install || completed.verify,
    completed.verify,
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-honey-500/20 bg-graphite-900/80 shadow-sm">
      <div className="grid lg:grid-cols-5">
        <div className="border-b border-graphite-700 p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
          <p className="text-xs font-medium uppercase tracking-wider text-honey-400">
            Getting started
          </p>
          <h2 className="marketing-title mt-2 text-xl text-ivory-50">
            Plug in your laptop in 4 steps
          </h2>
          <p className="mt-2 text-sm text-graphite-300">
            No coding required. Copy one command, run it, and start earning from
            approved public-page fetches.
          </p>
          <p className="mt-4 text-xs font-medium text-honey-400">
            {doneCount} of 4 complete
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite-800">
            <div
              className="h-full rounded-full bg-honey-500 transition-all"
              style={{ width: `${(doneCount / 4) * 100}%` }}
            />
          </div>
        </div>

        <ol className="space-y-0 lg:col-span-3">
          {INSTALL_STEPS.map((step, i) => {
            const done = stepStatus[i];
            const blocked = step.id === "device" && !hasUpi && !done;
            const isNext =
              !done &&
              !blocked &&
              stepStatus.slice(0, i).every(Boolean);
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex gap-4 border-b border-graphite-800 px-6 py-4 last:border-0 ${
                  isNext ? "bg-honey-500/5" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-honey-500 text-graphite-950"
                      : isNext
                        ? "border-2 border-honey-500 text-honey-400"
                        : "border border-graphite-600 text-graphite-500"
                  }`}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ivory-50">{step.title}</p>
                  <p className="mt-0.5 text-xs text-graphite-400">
                    {blocked
                      ? "Complete Setup with your UPI ID first."
                      : step.description}
                  </p>
                  {blocked ? (
                    <Link href="/contributor/setup" className="mt-2 inline-block">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                        Add UPI first
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : isNext ? (
                    <Link href={step.href} className="mt-2 inline-block">
                      <Button size="sm" className="h-8 gap-1 text-xs">
                        Continue
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
