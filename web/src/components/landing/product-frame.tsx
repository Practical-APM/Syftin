"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductFrameProps = {
  title: string;
  badge?: string;
  variant?: "buyer" | "contributor";
  children: React.ReactNode;
  className?: string;
};

export function ProductFrame({
  title,
  badge = "Product preview",
  variant = "buyer",
  children,
  className,
}: ProductFrameProps) {
  return (
    <div
      className={cn("relative", className)}
      aria-label={`${title} — illustrative product preview`}
    >
      <div className="absolute -inset-3 rounded-3xl bg-honey-500/8 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-graphite-700/60 bg-graphite-900 shadow-2xl shadow-graphite-950/30">
        <div className="flex items-center gap-2 border-b border-graphite-700/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-graphite-700" />
            <span className="h-2 w-2 rounded-full bg-graphite-700" />
            <span className="h-2 w-2 rounded-full bg-graphite-700" />
          </div>
          <Image
            src="/syftin-192.png"
            alt=""
            width={14}
            height={14}
            className="ml-1 rounded-sm"
          />
          <span className="text-[11px] text-graphite-400">{title}</span>
          {variant === "contributor" && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-400">
              Node
            </span>
          )}
          <span className="ml-auto rounded-md bg-graphite-800 px-2 py-0.5 text-[9px] text-graphite-500">
            {badge}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
