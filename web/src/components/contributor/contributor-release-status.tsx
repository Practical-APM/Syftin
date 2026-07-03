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
      <div className="flex items-center gap-2 text-xs text-graphite-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking release binaries…
      </div>
    );
  }

  if (!manifest) return null;

  const localAssets = manifest.localBuild?.assets ?? [];
  const hasLocal = localAssets.length > 0;
  const hasGithub = Boolean(manifest.githubRelease?.repo);

  return (
    <div className="rounded-xl border border-graphite-700 bg-graphite-900/40 px-4 py-3 text-xs text-graphite-400">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-medium text-graphite-200">
            Node release v{manifest.version}
          </span>
          {" · "}
          {hasLocal
            ? `${localAssets.length} binary asset(s) on this server`
            : hasGithub
              ? "Binaries served from GitHub Releases"
              : "Installer will build from source or use Docker"}
        </p>
        {!hasLocal && !hasGithub && (
          <Link
            href="/contributor/help"
            className="inline-flex items-center gap-1 font-medium text-honey-400 hover:text-honey-300"
          >
            <Download className="h-3 w-3" />
            Install options
          </Link>
        )}
      </div>
    </div>
  );
}
