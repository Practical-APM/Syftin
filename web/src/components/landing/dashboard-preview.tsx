"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import {
  Activity,
  Download,
  IndianRupee,
  Plus,
  Shield,
  TrendingUp,
} from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types/jobs";
import { isPhase2EnabledClient } from "@/lib/env";

const sampleJobs = [
  {
    name: "Mumbai grocery prices",
    domain: "blinkit.com",
    status: "completed" as const,
    score: 98.4,
    records: 128,
  },
  {
    name: "Bangalore React roles",
    domain: "naukri.com",
    status: "processing" as const,
    score: null,
    records: null,
  },
  {
    name: "Q2 registry filings",
    domain: "mca.gov.in",
    status: "completed" as const,
    score: 99.2,
    records: 45,
  },
];

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredJob, setHoveredJob] = useState(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 200,
    damping: 20,
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const completedCount = sampleJobs.filter((j) => j.status === "completed").length;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className="relative animate-float"
      aria-label="Sample Syftin dashboard preview"
    >
      <div className="absolute -inset-4 rounded-3xl bg-honey-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-graphite-700/60 bg-graphite-900 shadow-2xl shadow-graphite-950/40">
        <div className="flex items-center gap-2 border-b border-graphite-700/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-graphite-700" />
          </div>
          <Image
            src="/syftin-192.png"
            alt=""
            width={16}
            height={16}
            className="ml-1 rounded-sm"
          />
          <span className="text-xs text-graphite-400">Syftin Dashboard</span>
          <span className="ml-auto rounded-md bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-400">
            Sample view
          </span>
        </div>

        <div className="flex min-h-[380px]">
          <aside className="hidden w-[148px] shrink-0 border-r border-graphite-700/60 bg-graphite-950 p-3 sm:block">
            <nav className="space-y-0.5">
              {[
                { icon: Activity, label: "Overview", active: true },
                { icon: TrendingUp, label: "Jobs" },
                { icon: Plus, label: "New job" },
                { icon: Download, label: "Downloads" },
                ...(isPhase2EnabledClient()
                  ? [{ icon: IndianRupee, label: "Credits" }]
                  : []),
                { icon: Shield, label: "Approved sites" },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                    active
                      ? "bg-graphite-800 text-ivory-50"
                      : "text-graphite-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex-1 p-5">
            <p className="text-xs text-graphite-500">Overview</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Field match", value: "98.8%" },
                { label: "In progress", value: "1" },
                { label: "Records", value: "173" },
                { label: "Privacy", value: "Applied" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-2.5 py-2"
                >
                  <p className="text-[9px] text-graphite-500">{stat.label}</p>
                  <p className="text-sm font-semibold text-ivory-50">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-graphite-500">
                Your collection jobs
              </p>
              {sampleJobs.map((job, i) => (
                <button
                  key={job.name}
                  type="button"
                  onMouseEnter={() => setHoveredJob(i)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                    hoveredJob === i
                      ? "bg-graphite-800/80"
                      : "bg-graphite-800/30"
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium text-ivory-50">
                      {job.name}
                    </p>
                    <p className="font-mono text-[10px] text-graphite-500">
                      {job.domain}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[job.status]}`}
                  >
                    {STATUS_LABELS[job.status]}
                  </span>
                </button>
              ))}
            </div>

            <motion.div
              key={hoveredJob}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-graphite-800 bg-graphite-950/60 px-3 py-2"
            >
              <p className="text-[10px] text-graphite-500">
                {sampleJobs[hoveredJob].name}
              </p>
              <p className="mt-0.5 text-xs text-graphite-300">
                {sampleJobs[hoveredJob].status === "completed"
                  ? `${sampleJobs[hoveredJob].score}% field match · ${sampleJobs[hoveredJob].records} records · JSON ready`
                  : "Collecting data from public page…"}
              </p>
            </motion.div>

            <p className="mt-3 text-[10px] text-graphite-600">
              Illustrative · {completedCount} of {sampleJobs.length} jobs complete
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
