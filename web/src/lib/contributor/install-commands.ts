import { getPublicSiteUrl } from "@/lib/env";
import type { ComputeTier } from "@/lib/contributor/tier";
import { installerFileName } from "@/lib/contributor/installer-file";

export type InstallOs = "macos" | "linux" | "windows";

export function detectInstallOs(userAgent: string): InstallOs {
  if (/Win/i.test(userAgent)) return "windows";
  if (/Linux/i.test(userAgent)) return "linux";
  return "macos";
}

/**
 * Download URL for the one-file installer.
 * Dev: dynamic API (correct localhost URL). Production: static files from postbuild.
 */
export function getInstallerDownloadUrl(os: InstallOs, tier: ComputeTier) {
  if (process.env.NODE_ENV === "production") {
    return `/installers/${installerFileName(os, tier)}`;
  }
  return `/api/contributor/installer?os=${os}&tier=${tier}`;
}

export function getInstallScriptUrl(siteUrl = getPublicSiteUrl()) {
  return `${siteUrl}/install-node.sh`;
}

export function getWindowsInstallScriptUrl(siteUrl = getPublicSiteUrl()) {
  return `${siteUrl}/install-node.ps1`;
}

export function getWindowsNativeInstallCommand(
  token: string,
  siteUrl = getPublicSiteUrl(),
  tier?: ComputeTier,
) {
  const script = getWindowsInstallScriptUrl(siteUrl);
  const tierArg = tier ? ` -Tier ${tier}` : "";
  return `powershell -ExecutionPolicy Bypass -Command "irm '${script}' -OutFile \"$env:TEMP\\syftin-install.ps1\"; & \"$env:TEMP\\syftin-install.ps1\" -Token ${token} -ApiUrl ${siteUrl}${tierArg}"`;
}

export function getOneLineInstallCommand(
  token: string,
  siteUrl = getPublicSiteUrl(),
  tier?: ComputeTier,
) {
  const script = getInstallScriptUrl(siteUrl);
  const tierArg = tier ? ` --tier ${tier}` : "";
  return `curl -fsSL "${script}" | bash -s -- --token ${token} --api ${siteUrl}${tierArg}`;
}

export function getPlaywrightInstallCommand(siteUrl = getPublicSiteUrl()) {
  return `curl -fsSL "${siteUrl}/install-playwright.sh" | bash`;
}

export function getNodeBinaryUrl(
  platform: "darwin-arm64" | "darwin-amd64" | "linux-arm64" | "linux-amd64",
  siteUrl = getPublicSiteUrl(),
) {
  return `${siteUrl}/releases/syftin-node-${platform}`;
}

export function getDockerInstallCommand(token: string, siteUrl = getPublicSiteUrl()) {
  return `docker run -d --name syftin-node --restart unless-stopped \\
  -e NODE_TOKEN="${token}" \\
  -e SYFTIN_API_URL="${siteUrl}" \\
  syftin/node:latest`;
}

export const INSTALL_STEPS = [
  {
    id: "profile",
    title: "Add payout details",
    href: "/contributor/setup",
    description: "Your UPI ID so we can send earnings automatically.",
  },
  {
    id: "device",
    title: "Register this laptop",
    href: "/contributor/nodes",
    description: "Get a one-time token tied to your machine.",
  },
  {
    id: "install",
    title: "Download & open the installer",
    href: "/contributor/download",
    description:
      "One file for your computer. Open it, paste your token once — everything else is automatic.",
  },
  {
    id: "verify",
    title: "Confirm you're online",
    href: "/contributor/nodes",
    description: "Status turns green within 30 seconds.",
  },
] as const;
