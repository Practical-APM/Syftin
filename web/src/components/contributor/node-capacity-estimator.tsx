"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/input";
import {
  estimateNodeCapacity,
  type CalculatorOs,
  type CapacityEstimate,
} from "@/lib/contributor/resource-settings";

export function NodeCapacityEstimator({
  onTierRecommend,
}: {
  onTierRecommend?: (tier: CapacityEstimate["tier"]) => void;
}) {
  const [os, setOs] = useState<CalculatorOs>("macos-m");
  const [ramGb, setRamGb] = useState(16);
  const [hoursPerDay, setHoursPerDay] = useState(8);

  const estimate = useMemo(
    () => estimateNodeCapacity({ os, ramGb, hoursPerDay }),
    [os, ramGb, hoursPerDay],
  );

  return (
    <div className="rounded-xl border border-honey-500/20 bg-graphite-950 p-6 text-ivory-50 shadow-lg">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-light uppercase tracking-wider text-honey-400">
          Node capacity estimator
        </h3>
        <p className="mt-1 text-xs text-graphite-400">
          Pilot earnings estimate from your laptop specs — not a guarantee
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-graphite-300">
            Operating system
          </label>
          <Select
            value={os}
            onChange={(e) => setOs(e.target.value as CalculatorOs)}
          >
            <option value="macos-m">macOS (Apple Silicon M1/M2/M3)</option>
            <option value="linux-nv">Linux / Windows (NVIDIA GPU)</option>
            <option value="intel-amd">Any OS (integrated graphics only)</option>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-graphite-300">
            System RAM
          </label>
          <Select
            value={ramGb}
            onChange={(e) => setRamGb(Number(e.target.value))}
          >
            <option value={8}>8 GB</option>
            <option value={16}>16 GB</option>
            <option value={32}>32 GB or higher</option>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-graphite-300">
            Estimated uptime (hours per day)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-graphite-700 accent-honey-500"
            />
            <span className="min-w-[60px] rounded border border-graphite-700 bg-graphite-900 px-3 py-1 text-center text-sm font-medium text-honey-400">
              {hoursPerDay}h
            </span>
          </div>
        </div>
      </div>

      <hr className="my-6 border-graphite-800" />

      <div className="space-y-3 rounded-lg border border-graphite-800 bg-graphite-950/60 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-graphite-400">
            Worker classification
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-honey-500/20 bg-honey-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-widest text-honey-400">
              {estimate.tierLabel}
            </span>
            {onTierRecommend && (
              <button
                type="button"
                onClick={() => onTierRecommend(estimate.tier)}
                className="text-[10px] font-medium text-honey-400 hover:text-honey-300"
              >
                Use on Install →
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-graphite-400">Primary tasks</span>
          <span className="text-right text-xs font-normal text-graphite-200">
            {estimate.task}
          </span>
        </div>
        <div className="flex items-end justify-between border-t border-graphite-900 pt-3">
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-honey-500">
              Estimated monthly income
            </span>
            <span className="text-[10px] text-graphite-500">
              Pilot rates ·{" "}
              <Link href="/contributor/earnings" className="text-honey-400 hover:text-honey-300">
                payout rules in Earnings
              </Link>
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-light tracking-tight text-honey-400">
              ~ ₹{estimate.monthlyInr.toLocaleString("en-IN")}
            </span>
            {estimate.monthlyInrLow < estimate.monthlyInr && (
              <span className="ml-2 text-sm text-graphite-500">
                (₹{estimate.monthlyInrLow.toLocaleString("en-IN")}–₹
                {estimate.monthlyInr.toLocaleString("en-IN")} at pilot fleet load)
              </span>
            )}
            <span className="block text-xs text-graphite-400">/ month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
