"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ShieldCheck,
} from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  detectInstallOs,
  getInstallerDownloadUrl,
  getOneLineInstallCommand,
  getWindowsNativeInstallCommand,
  type InstallOs,
} from "@/lib/contributor/install-commands";
import { installerFileName } from "@/lib/contributor/installer-file";
import { TIER_DETAILS, type ComputeTier } from "@/lib/contributor/tier";
import { getPublicSiteUrl } from "@/lib/env";
import { ContributorConnectionVerifier } from "@/components/contributor/contributor-connection-verifier";
import { ContributorReleaseStatus } from "@/components/contributor/contributor-release-status";
import { NodeCapacityEstimator } from "@/components/contributor/node-capacity-estimator";

const OS_TABS: { id: InstallOs; label: string }[] = [
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "windows", label: "Windows" },
];

const TIERS: ComputeTier[] = ["scout", "ranger", "titan"];

const OPEN_INSTRUCTIONS: Record<InstallOs, string> = {
  macos:
    "Double-click the downloaded .zip to unzip, then double-click the “Install Syftin …” file. The first time, right-click it → Open to get past the “unidentified developer” prompt.",
  windows:
    "Double-click the downloaded .bat file. If Windows shows a blue “protected your PC” box, click More info → Run anyway.",
  linux:
    "Unzip the download, then double-click the .sh and choose Run — or run ./install-syftin-… from a terminal.",
};

function TerminalMock({ children }: { children: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-graphite-800 bg-graphite-950 shadow-lg">
      <div className="flex items-center gap-2 border-b border-graphite-800 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-honey-500/80" />
        <span className="ml-2 text-[10px] font-medium text-graphite-500">
          Terminal
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-honey-400/90">
        {children}
      </pre>
    </div>
  );
}

function StepCard({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10 text-sm font-semibold text-honey-400">
          {n}
        </span>
        <div className="w-full">
          <p className="font-medium text-ivory-50">{title}</p>
          <div className="mt-1 text-sm text-graphite-400">{children}</div>
        </div>
      </div>
    </Panel>
  );
}

export function ContributorInstallWizard() {
  const siteUrl = getPublicSiteUrl();
  const searchParams = useSearchParams();
  const [os, setOs] = useState<InstallOs>("macos");
  const [tier, setTier] = useState<ComputeTier>("ranger");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  useEffect(() => {
    setOs(detectInstallOs(navigator.userAgent));
    const tierParam = searchParams.get("tier");
    if (tierParam === "scout" || tierParam === "ranger" || tierParam === "titan") {
      setTier(tierParam);
    }
    const tokenParam = searchParams.get("token");
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const fileName = installerFileName(os, tier);
  const downloadUrl = getInstallerDownloadUrl(os, tier);
  const osLabel = OS_TABS.find((t) => t.id === os)?.label ?? "macOS";
  const tierLabel = TIER_DETAILS[tier].label;

  const advancedToken = token.trim() || "sftn_paste_your_token_here";
  const advancedCmd = useMemo(
    () =>
      os === "windows"
        ? getWindowsNativeInstallCommand(advancedToken, siteUrl, tier)
        : getOneLineInstallCommand(advancedToken, siteUrl, tier),
    [os, siteUrl, tier],
  );

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function acceptTerms() {
    setTermsSaving(true);
    setTermsError(null);
    try {
      const res = await fetch("/api/contributor/accept-terms", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save terms acceptance.");
      }
      setTermsAccepted(true);
    } catch (err) {
      setTermsError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setTermsSaving(false);
    }
  }

  return (
    <>
      <DashboardHeader
        title="Install node app"
        description="Pick your computer, download one file, open it. That's the whole setup."
      />
      <DashboardPage>
        <ContributorReleaseStatus />

        <NodeCapacityEstimator onTierRecommend={setTier} />

        {token.trim() && (
          <Panel className="border-honey-500/30 bg-honey-500/5">
            <p className="text-sm font-medium text-ivory-50">
              Your device token — paste this when the installer opens
            </p>
            <code className="mt-3 block break-all rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 font-mono text-xs text-graphite-200">
              {token}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => copy(token, "token")}
            >
              {copied === "token" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy token
            </Button>
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <StepCard n={1} title="Register your device first">
              Get your one-time token from{" "}
              <Link
                href="/contributor/nodes"
                className="text-honey-400 hover:text-honey-300"
              >
                My devices
              </Link>
              . You&apos;ll paste it once when the installer opens.
            </StepCard>

            <StepCard n={2} title="Download your installer">
              We picked the right file for your machine and tier. No Go, no git,
              no terminal — just one file.
            </StepCard>

            <StepCard n={3} title="Open the file & paste your token">
              {OPEN_INSTRUCTIONS[os]}
            </StepCard>

            <StepCard n={4} title="Confirm you're online">
              Status updates below automatically. You can also check{" "}
              <Link
                href="/contributor/nodes"
                className="text-honey-400 hover:text-honey-300"
              >
                My devices
              </Link>
              — green within about 30 seconds.
            </StepCard>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite-500">
                Your computer
              </p>
              <div className="flex gap-1 rounded-lg border border-graphite-700 bg-graphite-900 p-1">
                {OS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOs(tab.id)}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      os === tab.id
                        ? "bg-honey-500 text-graphite-950 shadow-sm"
                        : "text-graphite-400 hover:text-ivory-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-graphite-500">
                Your tier
              </p>
              <div className="space-y-2">
                {TIERS.map((t) => {
                  const detail = TIER_DETAILS[t];
                  const active = tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-honey-500 bg-honey-500/10"
                          : "border-graphite-700 bg-graphite-900/40 hover:border-graphite-600"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-honey-500 bg-honey-500 text-graphite-950"
                            : "border-graphite-600"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ivory-50">
                            {detail.label}
                          </span>
                          <span className="text-[10px] text-graphite-500">
                            {detail.ram}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-graphite-400">
                          {detail.summary}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-graphite-500">
                Not sure? Pick <span className="text-graphite-300">Ranger</span>.
                Your device re-scans its hardware on first run and adjusts
                automatically.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-graphite-700 bg-graphite-900/40 px-4 py-3 text-xs text-graphite-400">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  if (e.target.checked) {
                    void acceptTerms();
                  } else {
                    setTermsAccepted(false);
                  }
                }}
                disabled={termsSaving}
                className="mt-0.5 h-4 w-4 rounded border-graphite-600 accent-honey-500"
              />
              <span>
                I have read and accept the{" "}
                <Link href="/contributor/terms" className="text-honey-400 hover:text-honey-300">
                  Contributor Terms
                </Link>{" "}
                including network use, campus/dorm guidance, and sub-processor role.
              </span>
            </label>
            {termsError && (
              <p className="text-xs text-red-400">{termsError}</p>
            )}

            <a
              href={downloadUrl}
              download
              className={`block ${termsAccepted ? "" : "pointer-events-none opacity-50"}`}
              aria-disabled={!termsAccepted}
            >
              <Button
                type="button"
                className="w-full justify-center"
                size="lg"
                disabled={!termsAccepted}
              >
                <Download className="h-4 w-4" />
                Download for {osLabel} · {tierLabel}
              </Button>
            </a>
            <p className="text-center text-[11px] text-graphite-500">
              Downloads <span className="font-mono">{fileName}</span>
            </p>

            <div className="rounded-lg border border-graphite-700 bg-graphite-900/40 px-4 py-3 text-xs text-graphite-400">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-honey-400" />
                <p>
                  By installing and running this node, you agree that Syftin may
                  route HTTPS page-fetch requests through your internet
                  connection for <strong className="text-graphite-300">approved public pages only</strong>.
                  Target sites may see your IP address. You can pause the node or
                  uninstall at any time from Network settings.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-graphite-700 bg-graphite-900/40 px-4 py-3 text-xs text-graphite-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-honey-400" />
              <p>{OPEN_INSTRUCTIONS[os]}</p>
            </div>
          </div>
        </div>

        <ContributorConnectionVerifier />

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-graphite-400 hover:text-ivory-50"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            Prefer the terminal? Show the one-line command
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <TerminalMock>
                {os === "windows" ? advancedCmd : `$ ${advancedCmd}`}
              </TerminalMock>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(advancedCmd, "advanced")}
              >
                {copied === "advanced" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy command
              </Button>
              <p className="text-[11px] text-graphite-500">
                Replace{" "}
                <span className="font-mono">sftn_paste_your_token_here</span>{" "}
                with your device token.
              </p>
            </div>
          )}
        </div>

        <Panel
          padding="md"
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-medium text-ivory-50">
              Scout, Ranger, and Titan tiers
            </p>
            <p className="mt-1 text-xs text-graphite-400">
              The installer sets up exactly what your tier needs — nothing more.
            </p>
          </div>
          <Link href="/contributor/help#node-types">
            <Button size="sm" variant="outline">
              Learn about tiers
            </Button>
          </Link>
        </Panel>
      </DashboardPage>
    </>
  );
}
