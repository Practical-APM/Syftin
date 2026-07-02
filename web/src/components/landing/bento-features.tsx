"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Globe,
  ListChecks,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { HoverLift } from "@/components/landing/micro-interactions";
import { APPROVED_DOMAINS_SAMPLE } from "@/lib/demo/pipeline-demos";
import { schemaForDomain } from "@/lib/constants/schema-templates";

const features = [
  {
    id: "schema",
    icon: ClipboardList,
    title: "Fields you want back",
    summary: "Paste one example row as JSON — same as the New Job form.",
    detail:
      "Syftin shapes every download to match your schema. The worker validates each record against these fields and reports a field-match score.",
    visual: (active: boolean) => (
      <motion.pre
        animate={{ opacity: active ? 1 : 0.7 }}
        className="mt-4 overflow-x-auto rounded-xl bg-graphite-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-400/90"
      >
        {JSON.stringify(schemaForDomain("blinkit.com"), null, 2)}
      </motion.pre>
    ),
    span: "lg:col-span-2",
  },
  {
    id: "whitelist",
    icon: Globe,
    title: "Approved sites",
    summary: "Only Syftin-approved public domains — viewable in your dashboard.",
    detail:
      "Jobs targeting unapproved sites are rejected at submission. During pilot, Syftin maintains the approved list; view it under Approved sites.",
    visual: (active: boolean) => (
      <motion.div
        animate={{ opacity: active ? 1 : 0.65 }}
        className="mt-4 flex flex-wrap gap-2"
      >
        {APPROVED_DOMAINS_SAMPLE.map((d) => (
          <span
            key={d}
            className="rounded-lg border border-ivory-200 bg-ivory-50 px-2.5 py-1 font-mono text-[11px] text-graphite-600"
          >
            {d}
          </span>
        ))}
      </motion.div>
    ),
    span: "lg:col-span-1",
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy screened",
    summary: "Emails and phone numbers stripped before you download.",
    detail:
      "The worker runs regex-based PII redaction on every output row. Personal identifiers never reach your JSON file.",
    visual: (active: boolean) => (
      <motion.div animate={{ opacity: active ? 1 : 0.65 }} className="mt-4 space-y-2 text-sm">
        <p className="text-red-500/80 line-through">
          recruiter_phone: &quot;+91 98765 43210&quot;
        </p>
        <p className="text-emerald-600">→ removed</p>
      </motion.div>
    ),
    span: "lg:col-span-1",
  },
  {
    id: "quality",
    icon: ListChecks,
    title: "Field match score",
    summary: "Quality percentage on every completed job.",
    detail:
      "After extraction, Syftin compares output fields to your example schema. Scores appear on the job detail page and in Overview stats.",
    visual: (active: boolean) => (
      <motion.div
        animate={{ opacity: active ? 1 : 0.65 }}
        className="mt-4 flex items-end gap-1.5"
      >
        {[62, 88, 74, 98, 91].map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: active ? 1 : 0.6 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="w-4 origin-bottom rounded-md bg-honey-500/70"
            style={{ height: `${h * 0.32}px` }}
          />
        ))}
        <span className="mb-0.5 ml-3 text-sm font-semibold text-honey-600">
          98.4%
        </span>
      </motion.div>
    ),
    span: "lg:col-span-1",
  },
  {
    id: "deliver",
    icon: Plug,
    title: "Deliver anywhere",
    summary: "Download or push — webhook, API, S3/GCS, SFTP.",
    detail:
      "Set up Integrations once. Completed jobs auto-deliver in JSON, CSV, or NDJSON. Failed-job webhooks optional.",
    visual: (active: boolean) => (
      <motion.div
        animate={{ opacity: active ? 1 : 0.65 }}
        className="mt-4 flex flex-wrap gap-2"
      >
        {["Webhook", "REST API", "S3 / GCS", "SFTP"].map((ch) => (
          <span
            key={ch}
            className="rounded-lg border border-honey-500/25 bg-honey-500/10 px-3 py-1.5 text-[11px] font-medium text-honey-600"
          >
            {ch}
          </span>
        ))}
      </motion.div>
    ),
    span: "lg:col-span-2",
  },
];

export function BentoFeatures() {
  const [active, setActive] = useState<string>("schema");

  return (
    <section id="features" className="marketing-section">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
            Everything in one workflow
          </h2>
          <p className="mt-3 text-sm text-graphite-500">
            Click a feature to see how it maps to the product.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((item, i) => {
            const isActive = active === item.id;
            return (
              <FadeIn key={item.id} delay={i * 0.04} className={item.span}>
                <HoverLift className="h-full">
                  <button
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`flex h-full w-full flex-col rounded-2xl border p-7 text-left transition-all ${
                      isActive
                        ? "border-honey-500/40 bg-white shadow-md shadow-honey-500/5"
                        : "border-ivory-200 bg-ivory-50 hover:border-ivory-300 hover:shadow-sm"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? "text-honey-600" : "text-graphite-500"}`}
                      strokeWidth={1.5}
                    />
                    <h3 className="mt-4 font-semibold text-graphite-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-graphite-500">
                      {item.summary}
                    </p>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 text-xs leading-relaxed text-graphite-600"
                        >
                          {item.detail}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {item.visual(isActive)}
                  </button>
                </HoverLift>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
