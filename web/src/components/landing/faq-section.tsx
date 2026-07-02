"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { faqsForAudience } from "@/lib/landing/faq-data";
import { isPhase2EnabledClient } from "@/lib/env";

export function FaqSection() {
  const phase2 = isPhase2EnabledClient();
  const faqs = faqsForAudience(phase2);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="marketing-section">
      <div className="marketing-container-narrow">
        <FadeIn>
          <p className="marketing-eyebrow text-center">
            FAQ
          </p>
          <h2 className="marketing-title mt-3 text-center text-3xl sm:text-4xl">
            Common questions
          </h2>
          <p className="marketing-lead text-center">
            Straight answers for buyers, contributors, and anyone evaluating
            Syftin.
          </p>
        </FadeIn>

        <div className="mt-10 divide-y divide-ivory-200 dark:divide-graphite-700 rounded-2xl border border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-900">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <FadeIn key={faq.question} delay={i * 0.02}>
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 text-graphite-400 dark:text-graphite-300 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm leading-relaxed text-graphite-500 dark:text-graphite-200">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
