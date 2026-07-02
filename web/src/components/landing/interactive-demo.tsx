"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Building2,
  Download,
  Play,
  RotateCcw,
  ShoppingCart,
  ShieldCheck,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";
import {
  DEMO_VERTICALS,
  PIPELINE_STAGES,
  schemaJsonForVertical,
  type DemoVertical,
} from "@/lib/demo/pipeline-demos";
import {
  PipelineFlowchart,
  PipelineStageDetail,
} from "@/components/landing/pipeline-flowchart";

const TAB_ICONS = {
  commerce: ShoppingCart,
  jobs: Briefcase,
  registry: Building2,
} as const;

const STAGE_MS = 650;

export function InteractiveDemo() {
  const [vertical, setVertical] = useState<DemoVertical>("commerce");
  const [activeStage, setActiveStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [showPiiStrike, setShowPiiStrike] = useState(false);
  const [completed, setCompleted] = useState(false);

  const demo = DEMO_VERTICALS[vertical];

  const reset = useCallback(() => {
    setRunning(false);
    setActiveStage(0);
    setShowPiiStrike(false);
    setCompleted(false);
  }, []);

  useEffect(() => {
    reset();
  }, [vertical, reset]);

  function runPipeline() {
    if (running) return;
    reset();
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;

    if (activeStage >= PIPELINE_STAGES.length - 1) {
      setCompleted(true);
      setRunning(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveStage((s) => {
        const next = s + 1;
        if (PIPELINE_STAGES[next]?.id === "pii") {
          setShowPiiStrike(true);
        }
        return next;
      });
    }, STAGE_MS);

    return () => window.clearTimeout(timer);
  }, [running, activeStage]);

  return (
    <section id="demo" className="marketing-section relative">
      <div className="marketing-container">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="marketing-eyebrow">
              Interactive walkthrough
            </p>
            <h2 className="marketing-title mt-3 text-3xl sm:text-4xl">
              See how a collection job runs
            </h2>
            <p className="marketing-lead">
              Pick a use case, then simulate the same pipeline your dashboard
              uses — from approved-site check to delivery.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-ivory-200 bg-graphite-950 shadow-2xl shadow-graphite-900/25">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1 border-b border-graphite-800 p-2 sm:p-3">
              {(Object.keys(DEMO_VERTICALS) as DemoVertical[]).map((id) => {
                const d = DEMO_VERTICALS[id];
                const Icon = TAB_ICONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVertical(id)}
                    disabled={running}
                    className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                      vertical === id
                        ? "text-ivory-50"
                        : "text-graphite-400 hover:text-graphite-300"
                    }`}
                  >
                    {vertical === id && (
                      <motion.span
                        layoutId="demo-tab"
                        className="absolute inset-0 rounded-lg bg-graphite-800"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 35,
                        }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {d.label}
                    </span>
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2 pr-1">
                {!running && !completed && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={runPipeline}
                    className="rounded-lg bg-graphite-800 text-ivory-50 hover:bg-graphite-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run simulation
                  </Button>
                )}
                {(completed || activeStage > 0) && !running && (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-graphite-400 hover:bg-graphite-800 hover:text-graphite-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Pipeline flowchart */}
            <div className="border-b border-graphite-800 bg-graphite-900/50 px-4 py-4 sm:px-6">
              <PipelineFlowchart activeStage={activeStage} />
              <div className="mt-3 min-h-10">
                <PipelineStageDetail activeStage={activeStage} />
              </div>
            </div>

            <div className="grid lg:grid-cols-2">
              {/* Input panel — mirrors new job form */}
              <div className={`bg-linear-to-br ${demo.gradient} p-6 sm:p-8`}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-graphite-500">
                  Job submission
                </p>
                <p className="mt-1 text-sm font-medium text-ivory-50">
                  {demo.jobName}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-graphite-400">
                  {demo.url}
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-graphite-900/80 p-4 backdrop-blur-sm">
                  <p className="text-[10px] text-graphite-500">
                    Raw page snippet
                  </p>
                  <motion.p
                    key={demo.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: activeStage >= 4 ? 1 : 0.4 }}
                    className="mt-2 text-xs text-graphite-300"
                  >
                    {demo.rawSnippet}
                  </motion.p>

                  {demo.piiField && (
                    <motion.div
                      animate={{
                        opacity: activeStage >= 5 ? 1 : 0.35,
                      }}
                      className="mt-3 rounded-lg border border-graphite-700/60 bg-graphite-800/50 px-3 py-2"
                    >
                      <p className="text-[10px] text-graphite-500">
                        Detected PII (removed before download)
                      </p>
                      <p
                        className={`mt-1 font-mono text-[10px] ${
                          showPiiStrike
                            ? "text-red-400/80 line-through"
                            : "text-amber-400/90"
                        }`}
                      >
                        {demo.piiField.key}: &quot;{demo.piiField.value}&quot;
                      </p>
                      {showPiiStrike && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          Redacted by privacy screen
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-[10px] text-graphite-500">
                    Fields you want back
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-graphite-800 bg-graphite-950 p-3 font-mono text-[10px] leading-relaxed text-graphite-400">
                    {schemaJsonForVertical(vertical)}
                  </pre>
                </div>
              </div>

              {/* Output panel — mirrors job detail + download */}
              <div className="border-t border-graphite-800 lg:border-t-0 lg:border-l">
                <div className="flex items-center justify-between border-b border-graphite-800 px-5 py-3">
                  <span className="font-mono text-xs text-graphite-400">
                    output.json
                  </span>
                  <AnimatePresence mode="wait">
                    {completed ? (
                      <motion.span
                        key="ready"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 text-xs text-emerald-400"
                      >
                        <Download className="h-3 w-3" />
                        Ready · {demo.complianceScore}% field match
                      </motion.span>
                    ) : running ? (
                      <motion.span
                        key="running"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-honey-400"
                      >
                        {PIPELINE_STAGES[activeStage]?.label}…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        className="text-xs text-graphite-500"
                      >
                        Run simulation to preview
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <div className="max-h-[360px] overflow-auto p-5 font-mono text-xs leading-relaxed">
                  <AnimatePresence mode="wait">
                    <motion.pre
                      key={`${vertical}-${completed ? "done" : activeStage}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: activeStage >= 4 ? 1 : 0.35, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.3, ease: easeOut }}
                      className="text-graphite-300"
                    >
                      {activeStage >= 4
                        ? JSON.stringify(
                            completed
                              ? demo.outputRows
                              : demo.outputRows.slice(0, 1),
                            null,
                            2,
                          )
                        : "// Output appears after extraction step…"}
                    </motion.pre>
                  </AnimatePresence>
                </div>

                {completed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-graphite-800 px-5 py-4"
                  >
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        {
                          label: "Field match",
                          value: `${demo.complianceScore}%`,
                        },
                        {
                          label: "Records",
                          value: String(demo.recordCount),
                        },
                        { label: "Privacy", value: "Screened" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg bg-graphite-900 px-2 py-2"
                        >
                          <p className="text-[10px] text-graphite-500">
                            {stat.label}
                          </p>
                          <p className="text-sm font-semibold text-ivory-50">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        <p className="mt-4 text-center text-xs text-graphite-400">
          Simulated pipeline — same stages as production jobs. Sample data only.
        </p>
      </div>
    </section>
  );
}
