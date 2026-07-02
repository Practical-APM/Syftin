"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";

type ReleaseManifest = {
  version: string;
  localBuild: { assets?: string[] } | null;
  githubRelease: { repo: string | null; tag: string } | null;
};

export function ContributorReleaseStatus() {
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/releases/manifest")
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-graphite-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking release binaries…
      </div>
    );
  }

  if (!manifest) return null;

  const localAssets = manifest.localBuild?.assets ?? [];
  const hasLocal = localAssets.length > 0;
  const hasGithub = Boolean(manifest.githubRelease?.repo);
  const platformHint = hasLocal
    ? `${localAssets.length} binary asset(s) on this server`
    : hasGithub
      ? "Binaries served from GitHub Releases"
      : "Build binaries or set SYFTIN_GITHUB_REPO";

  return (
    <div className="rounded-xl border border-ivory-200 bg-ivory-50/50 px-4 py-3 text-xs text-graphite-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-medium text-graphite-800">
            Node release v{manifest.version}
          </span>
          {" · "}
          {hasLocal
            ? platformHint
            : hasGithub
              ? "Binaries served from GitHub Releases"
              : "Installer will build from source or use Docker"}
        </p>
        {!hasLocal && !hasGithub && (
          <Link
            href="/contributor/help"
            className="inline-flex items-center gap-1 font-medium text-emerald-700 underline"
          >
            <Download className="h-3 w-3" />
            Install options
          </Link>
        )}
      </div>
    </div>
  );
}
