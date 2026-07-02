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
  {
    name: "Delhi rental listings",
    domain: "99acres.com",
    status: "pending" as const,
    score: null,
    records: null,
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
      className="relative animate-float w-full"
      aria-label="Sample Syftin dashboard preview"
    >
      <div className="absolute -inset-6 rounded-3xl bg-honey-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-graphite-700/60 bg-graphite-900 shadow-2xl shadow-graphite-950/50">
        <div className="flex items-center gap-2 border-b border-graphite-700/60 px-5 py-3.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-graphite-700" />
            <span className="h-3 w-3 rounded-full bg-graphite-700" />
            <span className="h-3 w-3 rounded-full bg-graphite-700" />
          </div>
          <Image
            src="/syftin-192.png"
            alt=""
            width={18}
            height={18}
            className="ml-1 rounded-sm"
          />
          <span className="text-xs text-graphite-400">Syftin Dashboard</span>
          <span className="ml-auto rounded-md bg-graphite-800 px-2.5 py-1 text-[10px] text-graphite-400">
            Sample view
          </span>
        </div>

        <div className="flex min-h-[480px]">
          <aside className="hidden w-[165px] shrink-0 border-r border-graphite-700/60 bg-graphite-950 p-4 sm:block">
            <nav className="space-y-1">
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
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] ${
                    active
                      ? "bg-graphite-800 text-ivory-50"
                      : "text-graphite-500 hover:bg-graphite-800/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex-1 p-6">
            <p className="text-sm text-graphite-500">Overview</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Field match", value: "98.8%" },
                { label: "In progress", value: "1" },
                { label: "Records", value: "173" },
                { label: "Privacy", value: "Applied" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-graphite-800 bg-graphite-950/50 px-4 py-3"
                >
                  <p className="text-[11px] text-graphite-500">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-ivory-50">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-graphite-500">
                Your collection jobs
              </p>
              {sampleJobs.map((job, i) => (
                <button
                  key={job.name}
                  type="button"
                  onMouseEnter={() => setHoveredJob(i)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    hoveredJob === i
                      ? "bg-graphite-800/80"
                      : "bg-graphite-800/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-ivory-50">
                      {job.name}
                    </p>
                    <p className="font-mono text-[11px] text-graphite-500">
                      {job.domain}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-[11px] font-medium ${STATUS_COLORS[job.status]}`}
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
              className="mt-5 rounded-xl border border-graphite-800 bg-graphite-950/60 px-4 py-3"
            >
              <p className="text-[11px] text-graphite-500">
                {sampleJobs[hoveredJob].name}
              </p>
              <p className="mt-1 text-sm text-graphite-300">
                {sampleJobs[hoveredJob].status === "completed"
                  ? `${sampleJobs[hoveredJob].score}% field match · ${sampleJobs[hoveredJob].records} records · JSON ready`
                  : sampleJobs[hoveredJob].status === "processing"
                  ? "Collecting data from public page…"
                  : "Waiting to start…"}
              </p>
            </motion.div>

            <p className="mt-4 text-[11px] text-graphite-600">
              Illustrative · {completedCount} of {sampleJobs.length} jobs complete
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
