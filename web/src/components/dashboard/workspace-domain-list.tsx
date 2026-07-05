"use client";

import type { WhitelistEntry } from "@/lib/data/domains";

export function WorkspaceDomainList({
  domains,
  usesSubset,
}: {
  domains: WhitelistEntry[];
  usesSubset: boolean;
}) {
  if (domains.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ivory-200 bg-ivory-50 px-4 py-8 text-center text-sm text-graphite-500">
        No approved sites configured yet. Contact support@syftin.com to enable domains
        for your workspace.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {usesSubset && (
        <p className="rounded-lg border border-honey-200 bg-honey-50/60 px-4 py-3 text-xs text-honey-900">
          Your workspace uses a curated subset of Syftin&apos;s platform whitelist.
          Contact Syftin to request additional domains.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {domains.map((entry) => (
          <span
            key={entry.domain}
            className="inline-flex items-center gap-2 rounded-lg border border-ivory-200 bg-ivory-50 py-1 pl-3 pr-3 text-xs font-medium text-graphite-700"
          >
            <span className="font-mono">{entry.domain}</span>
            {entry.vertical && (
              <span className="text-graphite-400">· {entry.vertical}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
