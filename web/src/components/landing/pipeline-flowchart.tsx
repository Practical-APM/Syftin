"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/demo/pipeline-demos";

type PipelineFlowchartProps = {
  activeStage: number;
  compact?: boolean;
  className?: string;
};

export function PipelineFlowchart({
  activeStage,
  compact = false,
  className,
}: PipelineFlowchartProps) {
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none",
          compact ? "gap-0" : "gap-0",
        )}
        data-lenis-prevent
      >
        {PIPELINE_STAGES.map((stage, index) => {
          const done = index < activeStage;
          const current = index === activeStage;
          const upcoming = index > activeStage;

          return (
            <div key={stage.id} className="flex shrink-0 items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{
                    scale: current ? 1.08 : 1,
                    backgroundColor: done
                      ? "rgba(212, 160, 83, 0.25)"
                      : current
                        ? "rgba(212, 160, 83, 0.15)"
                        : "rgba(37, 37, 40, 0.8)",
                    borderColor: done || current
                      ? "rgba(212, 160, 83, 0.6)"
                      : "rgba(107, 107, 112, 0.4)",
                  }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex items-center justify-center rounded-full border font-mono text-[10px] font-medium",
                    compact ? "h-6 w-6" : "h-7 w-7",
                    done || current ? "text-honey-400" : "text-graphite-500",
                  )}
                >
                  {done ? "✓" : index + 1}
                </motion.div>
                <span
                  className={cn(
                    "mt-1.5 max-w-18 text-center leading-tight",
                    compact ? "text-[9px]" : "text-[10px]",
                    current
                      ? "font-medium text-honey-400"
                      : done
                        ? "text-graphite-400"
                        : "text-graphite-600",
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < PIPELINE_STAGES.length - 1 && (
                <motion.div
                  className={cn(
                    "mx-0.5 h-px shrink-0",
                    compact ? "w-3 sm:w-4" : "w-4 sm:w-5",
                  )}
                  animate={{
                    backgroundColor:
                      index < activeStage
                        ? "rgba(212, 160, 83, 0.5)"
                        : "rgba(107, 107, 112, 0.35)",
                  }}
                />
              )}
              {upcoming && index === activeStage - 1 ? null : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineStageDetail({
  activeStage,
}: {
  activeStage: number;
}) {
  const stage = PIPELINE_STAGES[activeStage];
  if (!stage) return null;

  return (
    <motion.p
      key={stage.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs leading-relaxed text-graphite-400"
    >
      <span className="font-medium text-graphite-300">{stage.label}:</span>{" "}
      {stage.detail}
    </motion.p>
  );
}
