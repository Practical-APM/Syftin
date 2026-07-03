"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Download, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: Sparkles, label: "Describe what you need (plain English)" },
  { icon: Globe, label: "Review URL, fields & budget" },
  { icon: Download, label: "Download structured JSON" },
];

const sampleJson = `[
  {
    "product_name": "Amul Milk 1L",
    "price_inr": 56,
    "in_stock": true
  }
]`;

export function DashboardOnboarding() {
  return (
    <div className="overflow-hidden rounded-xl border border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 shadow-sm">
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12 dark:bg-graphite-900">
          <p className="text-xs font-medium uppercase tracking-wider text-honey-600 dark:text-honey-400">
            Get started
          </p>
          <h2 className="marketing-title mt-2 text-2xl sm:text-[1.65rem]">
            Your first dataset is three steps away
          </h2>

          <ul className="mt-8 space-y-3.5">
            {steps.map((step, i) => (
              <motion.li
                key={step.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10">
                  <step.icon className="h-4 w-4 text-honey-600 dark:text-honey-400" />
                </span>
                <span className="text-sm font-normal text-graphite-600 dark:text-ivory-50/90">
                  {step.label}
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/dashboard/jobs/new">
              <Button size="lg" className="group">
                Start with AI assistant
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-t border-ivory-200 bg-graphite-950 p-6 sm:p-8 lg:border-t-0 lg:border-l lg:border-graphite-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-graphite-400">Example output</span>
            <span className="rounded-md bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-400">
              Sample
            </span>
          </div>
          <motion.pre
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="overflow-x-auto rounded-lg border border-graphite-800 bg-graphite-900 p-4 font-mono text-[11px] leading-relaxed text-honey-400/90"
          >
            {sampleJson}
          </motion.pre>
          <p className="mt-4 text-[11px] leading-relaxed text-graphite-500">
            Structured JSON with field-match scores — download, webhook, or push to your bucket.
          </p>
        </div>
      </div>
    </div>
  );
}
