"use client";

import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Cpu,
  HelpCircle,
  Shield,
  Terminal,
  Wifi,
} from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TIER_DETAILS } from "@/lib/contributor/tier";
import { getPublicSiteUrl } from "@/lib/env";

const faqs = [
  {
    q: "Do I need to write any code?",
    a: "No. Copy the one-line install command from Install, paste it in Terminal, and press Enter. The script handles downloads, Chromium, and background service setup.",
  },
  {
    q: "How does Syftin know what software I need?",
    a: "When the node app starts, it scans your RAM, CPU, OS, and whether Chromium is available. It reports this to Syftin and we assign Scout (HTTP), Ranger (browser), or Titan (GPU, future) automatically.",
  },
  {
    q: "What data leaves my laptop?",
    a: "Only public HTML from whitelisted domains during active tasks. Raw HTML stays in memory and is sent encrypted to Syftin for processing — never sold or reused for ads.",
  },
  {
    q: "When do I get paid?",
    a: "See Earnings for your balance and payout rules. Add a UPI ID in Setup before your first payout.",
  },
  {
    q: "What does Titan mode do differently?",
    a: "Titan uses your full CPU/RAM cap but watches mouse and keyboard every 50ms. If you touch the machine, tasks pause within about 100ms — including aborting an in-progress fetch — so gaming or coding stays smooth.",
  },
  {
    q: "Can I limit CPU, RAM, or heat?",
    a: "Yes. Open Resources to pick Eco (25%), Balanced (50%), or Titan (100%) profiles, set CPU and RAM caps, and enable AC power or idle pause. The node app applies thermal throttling between tasks automatically.",
  },
  {
    q: "What happens if the node uses too much RAM or GPU memory?",
    a: "The daemon flushes heap memory, resets browser sessions, and pauses until usage drops below your profile cap. On thermal emergency it also enters a cooldown sleep. Live status appears under Resources → node telemetry.",
  },
  {
    q: "Does the node app work on Windows?",
    a: "Yes. Use the native installer from Install. Windows gets the same resource safeguards — AC power detection, idle pause, and Titan's fast input watch via native Win32 APIs.",
  },
  {
    q: "Can I pause on mobile data?",
    a: "Yes. Open Resources and set connection mode to metered or paused. Tasks won't be assigned while paused or on metered connections.",
  },
];

const troubleshooting = [
  {
    icon: AlertCircle,
    title: "Device stays offline",
    steps: [
      "Confirm you copied the full token from My devices (starts with sftn_).",
      "Re-run the install command — it updates config and restarts the service.",
      "On macOS: check ~/Library/LaunchAgents/io.syftin.node.plist exists.",
      "On Linux: run systemctl --user status syftin-node.",
    ],
  },
  {
    icon: Terminal,
    title: "Install command failed",
    steps: [
      "Ensure curl is installed (pre-installed on macOS).",
      "Try Docker: copy the Docker command from Install.",
      "If building from source, install Go 1.22+ and retry.",
    ],
  },
  {
    icon: Cpu,
    title: "Stuck as Scout instead of Ranger",
    steps: [
      "Ranger needs 12 GB+ RAM and Chromium. Re-run the installer to install browsers.",
      "Restart the node after Chromium installs — tier updates on next heartbeat.",
    ],
  },
  {
    icon: Wifi,
    title: "No tasks assigned",
    steps: [
      "Check Resources — paused or metered mode blocks tasks.",
      "Verify device shows online on My devices.",
      "Tasks only run for approved public domains when buyers create jobs.",
    ],
  },
];

export function ContributorHelpGuide() {
  const siteUrl = getPublicSiteUrl();

  return (
    <>
      <DashboardHeader title="Help" />
      <DashboardPage>
        <Panel padding="md" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-honey-400" />
            <div>
              <p className="text-sm font-medium text-ivory-50">
                Step-by-step install
              </p>
              <p className="mt-1 text-sm text-graphite-400">
                Commands, OS tabs, and connection checks live on the Install page.
              </p>
            </div>
          </div>
          <Link href="/contributor/download">
            <Button size="sm">Open install guide</Button>
          </Link>
        </Panel>

        <Panel id="node-types">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-honey-400" />
            <h2 className="text-lg font-light text-ivory-50">Node types</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(TIER_DETAILS) as Array<keyof typeof TIER_DETAILS>).map(
              (tier) => (
                <div
                  key={tier}
                  className="rounded-lg border border-graphite-700 bg-graphite-900/40 p-4"
                >
                  <p className="font-medium text-ivory-50">
                    {TIER_DETAILS[tier].label}
                  </p>
                  <p className="mt-1 text-xs text-graphite-400">
                    {TIER_DETAILS[tier].summary}
                  </p>
                  <p className="mt-2 text-[10px] text-graphite-500">
                    {TIER_DETAILS[tier].ram}
                  </p>
                </div>
              ),
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-honey-400" />
            <h2 className="text-lg font-light text-ivory-50">FAQ</h2>
          </div>
          <dl className="mt-4 space-y-4">
            {faqs.map((item) => (
              <div key={item.q}>
                <dt className="text-sm font-medium text-ivory-50">{item.q}</dt>
                <dd className="mt-1 text-sm text-graphite-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-honey-400" />
            <h2 className="text-lg font-light text-ivory-50">
              Troubleshooting
            </h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {troubleshooting.map((block) => (
              <div
                key={block.title}
                className="rounded-lg border border-graphite-700 bg-graphite-900/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <block.icon className="h-4 w-4 text-honey-400" />
                  <p className="text-sm font-medium text-ivory-50">
                    {block.title}
                  </p>
                </div>
                <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-graphite-400">
                  {block.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Panel>

        <p className="text-center text-xs text-graphite-500">
          Install script: {siteUrl}/install-node.sh
        </p>
      </DashboardPage>
    </>
  );
}
