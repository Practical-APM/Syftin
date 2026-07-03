"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ContributorConnectionVerifier() {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/contributor/nodes");
      if (!res.ok) return;
      const data = await res.json();
      const nodes = (data.nodes ?? []) as Array<{
        status: string;
        machine_label: string;
      }>;
      const live = nodes.find((n) => n.status === "online");
      setOnline(Boolean(live));
      setDeviceName(live?.machine_label ?? null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [check]);

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4",
        online
          ? "border-honey-500/30 bg-honey-500/10"
          : "border-graphite-700 bg-graphite-900/60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
              online ? "bg-honey-500 text-graphite-950" : "bg-graphite-800 text-graphite-400",
            )}
          >
            {online ? (
              <Check className="h-4 w-4" strokeWidth={2.5} />
            ) : checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium text-ivory-50">
              {online ? "You're online!" : "Waiting for your device…"}
            </p>
            <p className="mt-0.5 text-xs text-graphite-400">
              {online
                ? `${deviceName ?? "Device"} connected — you can close the installer window.`
                : "Open the installer you downloaded above. This updates automatically."}
            </p>
          </div>
        </div>
        {online ? (
          <Link href="/contributor/nodes">
            <Button size="sm" variant="outline">
              View devices
            </Button>
          </Link>
        ) : (
          <Button size="sm" variant="outline" onClick={check} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check now"}
          </Button>
        )}
      </div>
    </div>
  );
}
