import type { ComputeTier } from "@/lib/contributor/tier";
import type { InstallOs } from "@/lib/contributor/install-commands";

export const INSTALLER_TIERS: ComputeTier[] = ["scout", "ranger", "titan"];
export const INSTALLER_OSES: InstallOs[] = ["macos", "linux", "windows"];

const TIER_LABEL: Record<ComputeTier, string> = {
  scout: "Scout",
  ranger: "Ranger",
  titan: "Titan",
};

export function isInstallerOs(value: unknown): value is InstallOs {
  return value === "macos" || value === "linux" || value === "windows";
}

export function isInstallerTier(value: unknown): value is ComputeTier {
  return value === "scout" || value === "ranger" || value === "titan";
}

/** Name of the file the contributor downloads (one file per OS × tier). */
export function installerFileName(os: InstallOs, tier: ComputeTier): string {
  const label = TIER_LABEL[tier];
  if (os === "windows") return `Install-Syftin-${label}.bat`;
  if (os === "macos") return `Syftin-${label}-macOS.zip`;
  return `Syftin-${label}-Linux.zip`;
}

/** Name of the executable placed inside the macOS/Linux zip. */
export function unixEntryName(os: InstallOs, tier: ComputeTier): string {
  if (os === "macos") return `Install Syftin ${TIER_LABEL[tier]}.command`;
  return `install-syftin-${tier}.sh`;
}

/**
 * Self-contained double-clickable installer for macOS (.command) and Linux (.sh).
 * It asks for the device token once, then hands off to install-node.sh with the
 * correct tier so only the components that tier needs get installed.
 *
 * NOTE: keep bash variables brace-free ($VAR, not ${VAR}) so they are not
 * interpreted as template-string interpolations.
 */
export function buildUnixInstaller(
  os: InstallOs,
  tier: ComputeTier,
  siteUrl: string,
): string {
  const label = TIER_LABEL[tier];
  const platform = os === "macos" ? "macOS" : "Linux";
  return `#!/bin/bash
# Syftin node installer — ${label} tier (${platform})
# Double-click to run. You will be asked for your device token once.
set -e

SITE="${siteUrl}"
TIER="${tier}"

clear 2>/dev/null || true
echo ""
echo "  ==============================================="
echo "   Syftin node installer — ${label} tier"
echo "  ==============================================="
echo ""
echo "  This sets up the Syftin node app on this computer."
echo "  It runs quietly in the background and earns you credits."
echo ""

TOKEN="$SYFTIN_NODE_TOKEN"
while [ -z "$TOKEN" ]; do
  printf "  Paste your device token (starts with sftn_) and press Enter:\\n  > "
  read -r TOKEN </dev/tty
done

echo ""
echo "  Installing… the first run can take a few minutes."
echo ""

curl -fsSL "$SITE/install-node.sh" | bash -s -- --token "$TOKEN" --api "$SITE" --tier "$TIER"

echo ""
echo "  Setup finished. You can close this window."
echo "  Check your device at: $SITE/contributor/nodes"
echo ""
printf "  Press Enter to close… "
read -r _ </dev/tty || true
`;
}

/** Self-contained double-clickable installer for Windows (.bat). */
export function buildWindowsBat(tier: ComputeTier, siteUrl: string): string {
  const label = TIER_LABEL[tier];
  return `@echo off
setlocal
title Syftin node installer - ${label}
set "SITE=${siteUrl}"
set "TIER=${tier}"

echo.
echo   ===============================================
echo    Syftin node installer - ${label} tier
echo   ===============================================
echo.
echo   This sets up the Syftin node app on this computer.
echo   It runs quietly in the background and earns you credits.
echo.

set "TOKEN="
:asktoken
set /p "TOKEN=  Paste your device token (starts with sftn_): "
if "%TOKEN%"=="" goto asktoken

echo.
echo   Installing... the first run can take a few minutes.
echo.

powershell -ExecutionPolicy Bypass -Command "irm '%SITE%/install-node.ps1' -OutFile \\"$env:TEMP\\syftin-install.ps1\\"; & \\"$env:TEMP\\syftin-install.ps1\\" -Token '%TOKEN%' -ApiUrl '%SITE%' -Tier '%TIER%'"

echo.
echo   Setup finished. You can close this window.
echo   Check your device at: %SITE%/contributor/nodes
echo.
pause
`;
}

export type InstallerArtifact = {
  fileName: string;
  body: Uint8Array | string;
  contentType: string;
};

/** Build the downloadable installer bytes (shared by API route + deploy script). */
export async function buildInstallerArtifact(
  os: InstallOs,
  tier: ComputeTier,
  siteUrl: string,
): Promise<InstallerArtifact> {
  const fileName = installerFileName(os, tier);

  if (os === "windows") {
    return {
      fileName,
      body: buildWindowsBat(tier, siteUrl).replace(/\n/g, "\r\n"),
      contentType: "application/octet-stream",
    };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file(unixEntryName(os, tier), buildUnixInstaller(os, tier, siteUrl), {
    unixPermissions: 0o755,
    date: new Date(),
  });
  const body = await zip.generateAsync({
    type: "uint8array",
    platform: "UNIX",
    compression: "DEFLATE",
  });

  return { fileName, body, contentType: "application/zip" };
}
