"use client";

import { WifiOff } from "lucide-react";
import type { RealtimeStatus } from "@/hooks/use-jobs-realtime";

export function RealtimeStatusBanner({ status }: { status: RealtimeStatus }) {
  if (status !== "disconnected" && status !== "error") return null;

  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2.5 lg:px-8">
      <p className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-amber-900">
        <WifiOff className="h-4 w-4 shrink-0" />
        Live updates paused — refreshing the page may help. Job status still
        updates when you navigate.
      </p>
    </div>
  );
}
