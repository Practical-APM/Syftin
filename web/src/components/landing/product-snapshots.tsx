"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  CloudUpload,
  Cpu,
  Download,
  IndianRupee,
  Plug,
  Plus,
  Server,
  Shield,
  Thermometer,
  TrendingUp,
  Webhook,
  Wifi,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { ProductFrame } from "@/components/landing/product-frame";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types/jobs";
import { schemaForDomain } from "@/lib/constants/schema-templates";
import { isPhase2EnabledClient } from "@/lib/env";

type PersonaTab = "buyer" | "contributor";

type SnapshotId =
  | "overview"
  | "new-job"
  | "download"
  | "integrations"
  | "credits"
  | "contributor-home"
  | "contributor-install"
  | "contributor-resources";

const buyerSnapshots: {
  id: SnapshotId;
  label: string;
  caption: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    caption:
      "Track field-match scores, jobs in progress, and privacy screening from one dashboard.",
  },
  {
    id: "new-job",
    label: "Create a job",
    caption:
      "Pick an approved public site, paste the fields you want back as JSON, and submit.",
  },
  {
    id: "download",
    label: "Download JSON",
    caption:
      "Completed jobs show a quality score and a one-click JSON download.",
  },
  {
    id: "integrations",
    label: "Integrations",
    caption:
      "Webhooks, API keys, S3/GCS bucket push, and SFTP — with delivery logs and failed-job alerts.",
  },
  {
    id: "credits",
    label: "Credits",
    caption:
      "Prepay with UPI, cards, or netbanking via Razorpay when your workspace uses credits.",
  },
];

const contributorSnapshots: {
  id: SnapshotId;
  label: string;
  caption: string;
}[] = [
  {
    id: "contributor-home",
    label: "Overview",
    caption:
      "See device status, network safeguards, and payout progress after approved fetches.",
  },
  {
    id: "contributor-install",
    label: "Install",
    caption:
      "One-line installer registers your laptop as a background node — no coding required.",
  },
  {
    id: "contributor-resources",
    label: "Resources",
    caption:
      "Eco, Balanced, or Titan profiles with thermal PID throttling — pause on battery, idle, or metered data.",
  },
];

function BuyerSidebar({ active }: { active: string }) {
  const items = [
    { icon: Activity, label: "Overview", id: "overview" },
    { icon: TrendingUp, label: "Jobs", id: "jobs" },
    { icon: Plus, label: "New job", id: "new-job" },
    { icon: Download, label: "Downloads", id: "download" },
    { icon: Plug, label: "Integrations", id: "integrations" },
    ...(isPhase2EnabledClient()
      ? [{ icon: IndianRupee, label: "Credits", id: "credits" }]
      : []),
    { icon: Shield, label: "Approved sites", id: "sites" },
  ];

  return (
    <aside className="hidden w-[130px] shrink-0 border-r border-graphite-700/60 bg-graphite-950 p-2.5 sm:block">
      <nav className="space-y-0.5">
        {items.map(({ icon: Icon, label, id }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] ${
              active === id
                ? "bg-graphite-800 text-ivory-50"
                : "text-graphite-500"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function ContributorSidebar({ active }: { active: string }) {
  const items = [
    { icon: Activity, label: "Overview", id: "contributor-home" },
    { icon: Cpu, label: "My devices", id: "devices" },
    { icon: IndianRupee, label: "Earnings", id: "earnings" },
    { icon: Download, label: "Install", id: "contributor-install" },
    { icon: Thermometer, label: "Resources", id: "contributor-resources" },
    { icon: Wifi, label: "Network", id: "network" },
  ];

  return (
    <aside className="hidden w-[130px] shrink-0 border-r border-graphite-700/60 bg-graphite-950 p-2.5 sm:block">
      <nav className="space-y-0.5">
        {items.map(({ icon: Icon, label, id }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] ${
              active === id
                ? "bg-graphite-800 text-ivory-50"
                : "text-graphite-500"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function OverviewSnapshot() {
  const jobs = [
    { name: "Mumbai grocery prices", domain: "blinkit.com", status: "completed" as const },
    { name: "Bangalore React roles", domain: "naukri.com", status: "processing" as const },
  ];

  return (
    <ProductFrame title="Syftin Dashboard">
      <div className="flex min-h-[320px]">
        <BuyerSidebar active="overview" />
        <div className="flex-1 p-4">
          <p className="text-[10px] text-graphite-500">Overview</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              { label: "Field match", value: "98.8%" },
              { label: "In progress", value: "1" },
              { label: "Records", value: "173" },
              { label: "Privacy", value: "Applied" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-2 py-1.5"
              >
                <p className="text-[8px] text-graphite-500">{s.label}</p>
                <p className="text-xs font-semibold text-ivory-50">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            {jobs.map((job) => (
              <div
                key={job.name}
                className="flex items-center justify-between rounded-lg bg-graphite-800/40 px-2.5 py-2"
              >
                <div>
                  <p className="text-[11px] font-medium text-ivory-50">
                    {job.name}
                  </p>
                  <p className="font-mono text-[9px] text-graphite-500">
                    {job.domain}
                  </p>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLORS[job.status]}`}
                >
                  {STATUS_LABELS[job.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function NewJobSnapshot() {
  const schema = schemaForDomain("blinkit.com");

  return (
    <ProductFrame title="Syftin Dashboard">
      <div className="flex min-h-[320px]">
        <BuyerSidebar active="new-job" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">Create a job</p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            Choose a public website and describe the fields you want back.
          </p>
          <div className="mt-3 space-y-3 rounded-xl border border-graphite-800 bg-graphite-950/40 p-3">
            <div>
              <p className="text-[10px] font-medium text-graphite-300">
                Job name
              </p>
              <div className="mt-1 rounded-lg border border-graphite-700 bg-graphite-900 px-2.5 py-1.5 text-[11px] text-ivory-50">
                Mumbai grocery prices
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-graphite-300">
                Target URL
              </p>
              <div className="mt-1 rounded-lg border border-graphite-700 bg-graphite-900 px-2.5 py-1.5 font-mono text-[10px] text-graphite-300">
                https://blinkit.com
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-graphite-300">
                Fields you want back
              </p>
              <pre className="mt-1 max-h-24 overflow-hidden rounded-lg border border-graphite-800 bg-graphite-950 p-2 font-mono text-[9px] leading-relaxed text-emerald-400/90">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg bg-honey-500 px-3 py-1.5 text-center text-[11px] font-medium text-graphite-950">
              Start collection
            </div>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function DownloadSnapshot() {
  const sample = [
    { product: "Amul Taaza Milk 500ml", price: "₹28", in_stock: true },
    { product: "Britannia Bread", price: "₹45", in_stock: true },
  ];

  return (
    <ProductFrame title="Syftin Dashboard">
      <div className="flex min-h-[320px]">
        <BuyerSidebar active="download" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ivory-50">
                Mumbai grocery prices
              </p>
              <p className="font-mono text-[10px] text-graphite-500">
                blinkit.com
              </p>
            </div>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLORS.completed}`}
            >
              {STATUS_LABELS.completed}
            </span>
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
                <p className="text-[11px] font-semibold text-ivory-50">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-honey-500/30 bg-honey-500/10 px-3 py-2">
            <ArrowDownToLine className="h-3.5 w-3.5 text-honey-400" />
            <span className="text-[11px] font-medium text-honey-400">
              Download syftin-job.json
            </span>
          </div>
          <pre className="mt-3 max-h-28 overflow-hidden rounded-lg border border-graphite-800 bg-graphite-950 p-2 font-mono text-[9px] leading-relaxed text-graphite-400">
            {JSON.stringify(sample, null, 2)}
          </pre>
        </div>
      </div>
    </ProductFrame>
  );
}

function CreditsSnapshot() {
  return (
    <ProductFrame title="Syftin Dashboard">
      <div className="flex min-h-[320px]">
        <BuyerSidebar active="credits" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">Credits</p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            Prepay balance for collection jobs in your workspace.
          </p>
          <div className="mt-3 rounded-xl border border-graphite-800 bg-graphite-950/50 p-4">
            <p className="text-[10px] text-graphite-500">Current balance</p>
            <p className="mt-1 text-2xl font-semibold text-ivory-50">₹2,000</p>
          </div>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-graphite-500">
            Top up
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["₹500", "₹2,000", "₹5,000"].map((pack, i) => (
              <div
                key={pack}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] ${
                  i === 1
                    ? "border-honey-500/40 bg-honey-500/10 text-honey-400"
                    : "border-graphite-700 text-graphite-400"
                }`}
              >
                {pack}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-honey-500 px-3 py-1.5 text-center text-[11px] font-medium text-graphite-950">
            Pay with Razorpay
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ContributorHomeSnapshot() {
  return (
    <ProductFrame title="Syftin Contributor" variant="contributor">
      <div className="flex min-h-[320px]">
        <ContributorSidebar active="contributor-home" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">
            Contributor overview
          </p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            Run the node app on your laptop for approved public-page fetches.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Balance", value: "₹142" },
              { label: "Devices", value: "1 / 1" },
              { label: "Network", value: "Wi‑Fi" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-2 py-2"
              >
                <p className="text-[8px] text-graphite-500">{s.label}</p>
                <p className="text-[11px] font-semibold text-ivory-50">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-graphite-800 bg-graphite-950/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-graphite-300">
                Payout progress
              </p>
              <span className="text-[10px] text-emerald-400">28%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite-800">
              <div className="h-full w-[28%] rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2 text-[9px] text-graphite-500">
              UPI payout at ₹500 · invite-only pilot
            </p>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ContributorInstallSnapshot() {
  return (
    <ProductFrame title="Syftin Contributor" variant="contributor">
      <div className="flex min-h-[320px]">
        <ContributorSidebar active="contributor-install" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">Install node app</p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            Copy your device token from My devices, then run one command.
          </p>
          <div className="mt-3 rounded-xl border border-graphite-800 bg-graphite-950 p-3">
            <p className="text-[9px] font-medium uppercase tracking-wider text-graphite-500">
              One-line install
            </p>
            <pre className="mt-2 overflow-x-auto font-mono text-[9px] leading-relaxed text-emerald-400/90">
              {`curl -fsSL "https://syftin.io/install-node.sh" | bash -s -- \\
  --token sftn_•••••••• \\
  --api https://syftin.io`}
            </pre>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-300">
              Device online · Ranger tier detected
            </span>
          </div>
          <p className="mt-3 text-[9px] text-graphite-500">
            Auto-detects RAM, CPU, and Chromium. Pauses on metered networks
            when enabled.
          </p>
        </div>
      </div>
    </ProductFrame>
  );
}

function IntegrationsSnapshot() {
  const channels = [
    { icon: Webhook, label: "Webhook", status: "Enabled" },
    { icon: Server, label: "REST API", status: "Key active" },
    { icon: CloudUpload, label: "S3 bucket", status: "Configured" },
    { icon: Server, label: "SFTP", status: "Optional" },
  ];

  return (
    <ProductFrame title="Syftin Dashboard">
      <div className="flex min-h-[320px]">
        <BuyerSidebar active="integrations" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">Integrations</p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            Auto-deliver completed jobs to your stack.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {channels.map(({ icon: Icon, label, status }) => (
              <div
                key={label}
                className="rounded-lg border border-graphite-800 bg-graphite-950/50 px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-honey-400" />
                  <p className="text-[10px] font-medium text-ivory-50">
                    {label}
                  </p>
                </div>
                <p className="mt-1 text-[9px] text-emerald-400">{status}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {(["JSON", "CSV", "NDJSON"] as const).map((fmt, i) => (
              <span
                key={fmt}
                className={`rounded-md border px-2 py-0.5 text-[9px] font-medium ${
                  i === 0
                    ? "border-honey-500/40 bg-honey-500/10 text-honey-400"
                    : "border-graphite-700 text-graphite-500"
                }`}
              >
                {fmt}
              </span>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-graphite-800 bg-graphite-950/40 p-3">
            <p className="text-[9px] font-medium uppercase tracking-wider text-graphite-500">
              Recent delivery
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-graphite-300">Mumbai grocery prices</span>
              <span className="text-emerald-400">Delivered · webhook</span>
            </div>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ContributorResourcesSnapshot() {
  const profiles = [
    { id: "eco", label: "Eco", pct: "25%" },
    { id: "balanced", label: "Balanced", pct: "50%", active: true },
    { id: "titan", label: "Titan", pct: "Max" },
  ];

  return (
    <ProductFrame title="Syftin Contributor" variant="contributor">
      <div className="flex min-h-[320px]">
        <ContributorSidebar active="contributor-resources" />
        <div className="flex-1 bg-ivory-50/5 p-4">
          <p className="text-xs font-medium text-ivory-50">Resource controls</p>
          <p className="mt-0.5 text-[10px] text-graphite-500">
            You decide how hard Syftin runs on your machine.
          </p>
          <div className="mt-3 flex gap-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`flex-1 rounded-lg border px-2 py-2 text-center ${
                  p.active
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-graphite-800 bg-graphite-950/50"
                }`}
              >
                <p
                  className={`text-[10px] font-medium ${
                    p.active ? "text-emerald-300" : "text-graphite-400"
                  }`}
                >
                  {p.label}
                </p>
                <p className="text-[9px] text-graphite-500">{p.pct}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 rounded-xl border border-graphite-800 bg-graphite-950/40 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] text-graphite-300">
                <Thermometer className="h-3 w-3 text-emerald-400" />
                46°C · PID throttling
              </span>
              <span className="text-[9px] text-emerald-400">Normal</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-graphite-800">
              <div className="h-full w-[58%] rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["AC power", "Idle only", "Block metered"].map((guard) => (
              <span
                key={guard}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300"
              >
                {guard}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function SnapshotView({ id }: { id: SnapshotId }) {
  switch (id) {
    case "overview":
      return <OverviewSnapshot />;
    case "new-job":
      return <NewJobSnapshot />;
    case "download":
      return <DownloadSnapshot />;
    case "integrations":
      return <IntegrationsSnapshot />;
    case "credits":
      return <CreditsSnapshot />;
    case "contributor-home":
      return <ContributorHomeSnapshot />;
    case "contributor-install":
      return <ContributorInstallSnapshot />;
    case "contributor-resources":
      return <ContributorResourcesSnapshot />;
    default:
      return <OverviewSnapshot />;
  }
}

export function ProductSnapshots() {
  const phase2 = isPhase2EnabledClient();
  const buyerTabs = buyerSnapshots.filter(
    (s) => s.id !== "credits" || phase2,
  );
  const contributorTabs = phase2 ? contributorSnapshots : [];

  const [persona, setPersona] = useState<PersonaTab>("buyer");
  const [activeId, setActiveId] = useState<SnapshotId>("overview");

  const tabs = persona === "buyer" ? buyerTabs : contributorTabs;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function switchPersona(next: PersonaTab) {
    setPersona(next);
    setActiveId(next === "buyer" ? "overview" : "contributor-home");
  }

  return (
    <section id="product" className="marketing-section">
      <div className="marketing-container">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-graphite-500">
            Inside the product
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
            See what you get — by role
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-graphite-500">
            Illustrative previews built from the live dashboard and contributor
            portal. Sample data only — your workspace will show your own jobs
            and devices.
          </p>
        </FadeIn>

        {phase2 && (
          <FadeIn delay={0.04} className="mt-8">
            <div className="inline-flex rounded-xl border border-ivory-200 bg-ivory-100/60 p-1">
              {(
                [
                  { id: "buyer" as const, label: "Business teams" },
                  { id: "contributor" as const, label: "Contributors" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchPersona(tab.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    persona === tab.id
                      ? "bg-white text-graphite-900 shadow-sm"
                      : "text-graphite-500 hover:text-graphite-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.06} className="mt-6">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
            data-lenis-prevent
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeId === tab.id
                    ? "border-honey-500/40 bg-honey-500/10 text-honey-700"
                    : "border-ivory-200 bg-ivory-50 text-graphite-500 hover:border-ivory-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.08} className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={active?.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {active && <SnapshotView id={active.id} />}
              {active && (
                <p className="mt-4 text-sm leading-relaxed text-graphite-500">
                  {active.caption}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </FadeIn>
      </div>
    </section>
  );
}
