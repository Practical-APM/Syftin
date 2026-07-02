"use client";

import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Download,
  IndianRupee,
  Plus,
  Shield,
  TrendingUp,
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/types/jobs";
import { schemaForDomain } from "@/lib/constants/schema-templates";
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

const PREVIEW_STATUS_COLORS = {
  pending: "bg-graphite-500/15 text-graphite-400",
  processing: "bg-honey-500/15 text-honey-400",
  completed: "bg-honey-500/15 text-honey-400",
} as const;

const approvedSites = ["blinkit.com", "naukri.com", "mca.gov.in", "99acres.com"];

type PreviewView =
  | "overview"
  | "jobs"
  | "new-job"
  | "downloads"
  | "credits"
  | "approved-sites";

function PreviewStatusBadge({ status }: { status: keyof typeof PREVIEW_STATUS_COLORS }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${PREVIEW_STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function OverviewView({
  hoveredJob,
  setHoveredJob,
}: {
  hoveredJob: number;
  setHoveredJob: (i: number) => void;
}) {
  const completedCount = sampleJobs.filter((j) => j.status === "completed").length;

  return (
    <>
      <p className="text-xs text-graphite-400">Overview</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Field match", value: "98.8%" },
          { label: "In progress", value: "1" },
          { label: "Records", value: "173" },
          { label: "Privacy", value: "Applied" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-3 py-2.5"
          >
            <p className="text-[10px] text-graphite-500">{stat.label}</p>
            <p className="mt-0.5 text-base font-light text-ivory-50">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4.5 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-graphite-500">
          Your collection jobs
        </p>
        {sampleJobs.slice(0, 3).map((job, i) => (
          <button
            key={job.name}
            type="button"
            onMouseEnter={() => setHoveredJob(i)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
              hoveredJob === i ? "bg-graphite-800/80" : "bg-graphite-800/30"
            }`}
          >
            <div>
              <p className="text-xs font-medium text-ivory-50">{job.name}</p>
              <p className="font-mono text-[10px] text-graphite-500">{job.domain}</p>
            </div>
            <PreviewStatusBadge status={job.status} />
          </button>
        ))}
      </div>

      <motion.div
        key={hoveredJob}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-lg border border-graphite-800 bg-graphite-950/60 px-3 py-2.5"
      >
        <p className="text-[10px] text-graphite-500">{sampleJobs[hoveredJob].name}</p>
        <p className="mt-0.5 text-xs text-graphite-300">
          {sampleJobs[hoveredJob].status === "completed"
            ? `${sampleJobs[hoveredJob].score}% field match · ${sampleJobs[hoveredJob].records} records · JSON ready`
            : sampleJobs[hoveredJob].status === "processing"
              ? "Collecting data from public page…"
              : "Waiting to start…"}
        </p>
      </motion.div>

      <p className="mt-3.5 text-[10px] text-graphite-600">
        Illustrative · {completedCount} of {sampleJobs.length} jobs complete
      </p>
    </>
  );
}

function JobsView() {
  return (
    <>
      <p className="text-xs text-graphite-400">Jobs</p>
      <p className="mt-0.5 text-[10px] text-graphite-500">
        All collection jobs in your workspace
      </p>
      <div className="mt-4 space-y-1.5">
        {sampleJobs.map((job) => (
          <div
            key={job.name}
            className="flex items-center justify-between rounded-lg bg-graphite-800/40 px-3 py-2.5"
          >
            <div>
              <p className="text-xs font-medium text-ivory-50">{job.name}</p>
              <p className="font-mono text-[10px] text-graphite-500">{job.domain}</p>
            </div>
            <PreviewStatusBadge status={job.status} />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-graphite-600">
        Click a job in the live dashboard for field-match scores and downloads.
      </p>
    </>
  );
}

function NewJobView() {
  const schema = schemaForDomain("blinkit.com");

  return (
    <>
      <p className="text-xs font-medium text-ivory-50">Create a job</p>
      <p className="mt-0.5 text-[10px] text-graphite-500">
        Choose a public website and describe the fields you want back.
      </p>
      <div className="mt-3 space-y-3 rounded-xl border border-graphite-800 bg-graphite-950/40 p-3">
        <div>
          <p className="text-[10px] font-medium text-graphite-300">Job name</p>
          <div className="mt-1 rounded-lg border border-graphite-700 bg-graphite-900 px-2.5 py-1.5 text-[11px] text-ivory-50">
            Mumbai grocery prices
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-graphite-300">Target URL</p>
          <div className="mt-1 rounded-lg border border-graphite-700 bg-graphite-900 px-2.5 py-1.5 font-mono text-[10px] text-graphite-300">
            https://blinkit.com
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-graphite-300">Fields you want back</p>
          <pre className="mt-1 max-h-24 overflow-hidden rounded-lg border border-graphite-800 bg-graphite-950 p-2 font-mono text-[9px] leading-relaxed text-honey-400/90">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg bg-honey-500 px-3 py-1.5 text-center text-[11px] font-medium text-graphite-950">
          Start collection
        </div>
      </div>
    </>
  );
}

function DownloadsView() {
  const sample = [
    { product: "Amul Taaza Milk 500ml", price: "₹28", in_stock: true },
    { product: "Britannia Bread", price: "₹45", in_stock: true },
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ivory-50">Mumbai grocery prices</p>
          <p className="font-mono text-[10px] text-graphite-500">blinkit.com</p>
        </div>
        <PreviewStatusBadge status="completed" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Field match", value: "98.4%" },
          { label: "Records", value: "128" },
          { label: "Privacy", value: "Screened" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-2 py-1.5 text-center"
          >
            <p className="text-[8px] text-graphite-500">{s.label}</p>
            <p className="text-[11px] font-light text-ivory-50">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-honey-500/30 bg-honey-500/10 px-3 py-2">
        <ArrowDownToLine className="h-3.5 w-3.5 text-honey-400" />
        <span className="text-[11px] font-medium text-honey-400">Download syftin-job.json</span>
      </div>
      <pre className="mt-3 max-h-28 overflow-hidden rounded-lg border border-graphite-800 bg-graphite-950 p-2 font-mono text-[9px] leading-relaxed text-graphite-400">
        {JSON.stringify(sample, null, 2)}
      </pre>
    </>
  );
}

function CreditsView() {
  return (
    <>
      <p className="text-xs font-medium text-ivory-50">Credits</p>
      <p className="mt-0.5 text-[10px] text-graphite-500">
        Prepay balance for collection jobs in your workspace.
      </p>
      <div className="mt-3 rounded-xl border border-graphite-800 bg-graphite-950/50 p-4">
        <p className="text-[10px] text-graphite-500">Current balance</p>
        <p className="mt-1 text-2xl font-light text-ivory-50">₹2,000</p>
      </div>
      <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-graphite-500">
        Top up
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {["₹500", "₹2,000", "₹5,000"].map((pack, i) => (
          <div
            key={pack}
            className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium ${
              i === 1
                ? "border-honey-500/40 bg-honey-500/10 text-honey-400"
                : "border-graphite-700 text-graphite-400"
            }`}
          >
            {pack}
          </div>
        ))}
      </div>
    </>
  );
}

function ApprovedSitesView() {
  return (
    <>
      <p className="text-xs font-medium text-ivory-50">Approved sites</p>
      <p className="mt-0.5 text-[10px] text-graphite-500">
        Public domains your workspace can target today.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {approvedSites.map((domain) => (
          <span
            key={domain}
            className="rounded-lg border border-graphite-700 bg-graphite-900 px-2.5 py-1 font-mono text-[10px] text-graphite-300"
          >
            {domain}
          </span>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-honey-500/20 bg-honey-500/5 px-3 py-2 text-[10px] text-honey-400/90">
        Jobs targeting unlisted domains are rejected at submission.
      </p>
    </>
  );
}

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<PreviewView>("overview");
  const [hoveredJob, setHoveredJob] = useState(0);
  const phase2 = isPhase2EnabledClient();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), {
    stiffness: 220,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), {
    stiffness: 220,
    damping: 22,
  });

  const navItems: {
    id: PreviewView;
    icon: React.ElementType;
    label: string;
  }[] = [
    { id: "overview", icon: Activity, label: "Overview" },
    { id: "jobs", icon: TrendingUp, label: "Jobs" },
    { id: "new-job", icon: Plus, label: "New job" },
    { id: "downloads", icon: Download, label: "Downloads" },
    ...(phase2 ? [{ id: "credits" as const, icon: IndianRupee, label: "Credits" }] : []),
    { id: "approved-sites", icon: Shield, label: "Approved sites" },
  ];

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

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1400 }}
      className="relative w-full animate-float lg:max-w-none"
      aria-label="Interactive Syftin dashboard preview"
    >
      <div className="absolute -inset-4 rounded-3xl bg-honey-500/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-graphite-700/60 bg-graphite-900 shadow-2xl shadow-graphite-950/40">
        <div className="flex items-center gap-2 border-b border-graphite-700/60 px-4 py-2.5">
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
          <span className="text-[11px] text-graphite-400">Syftin Dashboard</span>
          <span className="ml-auto rounded-md bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-400">
            Interactive preview
          </span>
        </div>

        <div className="flex min-h-[380px]">
          <aside className="hidden w-[148px] shrink-0 border-r border-graphite-700/60 bg-graphite-950 p-3 sm:block">
            <nav className="space-y-0.5">
              {navItems.map(({ id, icon: Icon, label }) => {
                const active = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveView(id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      active
                        ? "bg-graphite-800 text-ivory-50"
                        : "text-graphite-500 hover:bg-graphite-800/40 hover:text-graphite-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </nav>
            <p className="mt-4 px-1 text-[9px] leading-relaxed text-graphite-600">
              Click a section to explore the buyer dashboard.
            </p>
          </aside>

          <div className="flex-1 p-4.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {activeView === "overview" && (
                  <OverviewView hoveredJob={hoveredJob} setHoveredJob={setHoveredJob} />
                )}
                {activeView === "jobs" && <JobsView />}
                {activeView === "new-job" && <NewJobView />}
                {activeView === "downloads" && <DownloadsView />}
                {activeView === "credits" && <CreditsView />}
                {activeView === "approved-sites" && <ApprovedSitesView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
