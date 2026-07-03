"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Terminal,
} from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  detectInstallOs,
  getDockerInstallCommand,
  getOneLineInstallCommand,
  getInstallScriptUrl,
  getWindowsNativeInstallCommand,
  getWindowsInstallScriptUrl,
} from "@/lib/contributor/install-commands";
import { getPublicSiteUrl } from "@/lib/env";
import { ContributorConnectionVerifier } from "@/components/contributor/contributor-connection-verifier";
import { ContributorReleaseStatus } from "@/components/contributor/contributor-release-status";
import { NodeCapacityEstimator } from "@/components/contributor/node-capacity-estimator";

type OsTab = "macos" | "linux" | "windows";

const osTabs: { id: OsTab; label: string }[] = [
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "windows", label: "Windows" },
];

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

export function ContributorInstallWizard() {
  const siteUrl = getPublicSiteUrl();
  const searchParams = useSearchParams();
  const [os, setOs] = useState<OsTab>("macos");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOs(detectInstallOs(navigator.userAgent));
    const fromUrl = searchParams.get("token");
    if (fromUrl) setToken(fromUrl);
  }, [searchParams]);

  const placeholderToken = token.trim() || "sftn_paste_your_token_here";
  const nativeCmd = getOneLineInstallCommand(placeholderToken, siteUrl);
  const windowsCmd = getWindowsNativeInstallCommand(placeholderToken, siteUrl);
  const dockerCmd = getDockerInstallCommand(placeholderToken, siteUrl);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <DashboardHeader title="Install node app" />
      <DashboardPage>
        <ContributorReleaseStatus />

        <NodeCapacityEstimator />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <Panel>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10 text-sm font-semibold text-honey-400">
                  1
                </span>
                <div>
                  <p className="font-medium text-ivory-50">Register your device</p>
                  <p className="mt-1 text-sm text-graphite-400">
                    Go to{" "}
                    <Link href="/contributor/nodes" className="text-honey-400 hover:text-honey-300">
                      My devices
                    </Link>
                    , add a name, and copy the one-time token.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10 text-sm font-semibold text-honey-400">
                  2
                </span>
                <div className="w-full">
                  <p className="font-medium text-ivory-50">Paste token (optional)</p>
                  <p className="mt-1 text-sm text-graphite-400">
                    We&apos;ll pre-fill the install command below.
                  </p>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="sftn_…"
                    className="app-input mt-3 font-mono text-xs"
                  />
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-honey-500/10 text-sm font-semibold text-honey-400">
                  3
                </span>
                <div>
                  <p className="font-medium text-ivory-50">Run one command</p>
                  <p className="mt-1 text-sm text-graphite-400">
                    No Go, no git, no code. The installer downloads the node app,
                    sets up a background service, and installs Chromium if your
                    machine qualifies as a Ranger.
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <div className="flex gap-1 rounded-lg border border-graphite-700 bg-graphite-900 p-1">
              {osTabs.map((tab) => (
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

            {os === "windows" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-graphite-700 bg-graphite-900/40 p-5 text-sm text-graphite-300">
                  <p className="font-medium text-ivory-50">
                    Windows — native installer
                  </p>
                  <p className="mt-2 text-graphite-400">
                    Run in PowerShell (downloads the node app + Chromium automatically).
                  </p>
                  <TerminalMock>{windowsCmd}</TerminalMock>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => copy(windowsCmd, "windows")}
                    >
                      {copied === "windows" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy install command
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copy(getWindowsInstallScriptUrl(siteUrl), "win-script")
                      }
                    >
                      {copied === "win-script" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Script URL
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
                  <p className="font-medium">Or use Docker</p>
                  <p className="mt-2 text-amber-200/80">
                    If the native installer cannot find a Windows binary yet, install{" "}
                    <a
                      href="https://docs.docker.com/desktop/setup/install/windows-install/"
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Docker Desktop
                    </a>{" "}
                    and run:
                  </p>
                  <TerminalMock>{dockerCmd}</TerminalMock>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => copy(dockerCmd, "docker")}
                  >
                    {copied === "docker" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy Docker command
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <TerminalMock>
                  {`$ ${nativeCmd}`}
                </TerminalMock>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => copy(nativeCmd, "native")}
                  >
                    {copied === "native" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy install command
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copy(getInstallScriptUrl(siteUrl), "script")}
                  >
                    {copied === "script" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Script URL
                  </Button>
                </div>
              </>
            )}

            <p className="text-xs text-graphite-400">
              Prefer Docker on {os === "macos" ? "macOS" : "Linux"}?{" "}
              <button
                type="button"
                className="text-honey-400 hover:text-honey-300"
                onClick={() => copy(dockerCmd, "docker-alt")}
              >
                Copy Docker command
              </button>
              {copied === "docker-alt" && (
                <span className="ml-2 text-honey-400">Copied!</span>
              )}
            </p>
          </div>
        </div>

        <ContributorConnectionVerifier token={token} />

        <Panel padding="md" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ivory-50">
              Scout, Ranger, and Titan tiers
            </p>
            <p className="mt-1 text-xs text-graphite-400">
              Assigned automatically from your hardware scan.
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
