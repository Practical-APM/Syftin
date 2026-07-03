import { formatInrFromCents, type CostEstimate } from "@/lib/pricing/estimates";
import { PLATFORM_MAX_RECORDS } from "@/lib/env";

export function CostEstimatePanel({
  estimate,
  label = "Estimated cost",
}: {
  estimate: CostEstimate;
  label?: string;
}) {
  const unit = estimate.urlCount > 1 ? "URL" : "job";

  return (
    <div className="rounded-xl border border-honey-500/25 bg-honey-500/5 px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-honey-500">
            {label}
          </p>
          <p className="app-stat-value mt-1 text-2xl leading-8 text-honey-400">
            {formatInrFromCents(estimate.totalCents)}
          </p>
        </div>
        <div className="text-right text-xs text-graphite-300">
          <p>Base extraction: {formatInrFromCents(estimate.baseCents)}</p>
          <p>
            Records ({estimate.effectiveRecords.toLocaleString()} expected):{" "}
            {formatInrFromCents(estimate.recordCents)}
          </p>
          {estimate.urlCount > 1 && <p>{estimate.urlCount} URLs in batch</p>}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-graphite-400">
        <p>
          Target volume:{" "}
          <span className="text-graphite-300">
            {estimate.targetRecords.toLocaleString()} rows per {unit}
          </span>
        </p>
        {estimate.budgetRecords != null && (
          <p>
            Budget covers:{" "}
            <span className="text-graphite-300">
              ~{estimate.budgetRecords.toLocaleString()} rows per {unit}
            </span>
            {estimate.limitedBy === "budget" &&
              estimate.budgetRecords < estimate.targetRecords && (
                <span className="text-honey-400/90">
                  {" "}
                  — collection stops when budget is spent
                </span>
              )}
          </p>
        )}
        <p>
          Extraction stops at the{" "}
          <span className="text-graphite-300">lowest</span> of: your target volume,
          your budget, or the platform safety limit (
          {PLATFORM_MAX_RECORDS.toLocaleString()} rows/{unit}).
        </p>
        {estimate.pricing.priceTier === "adversarial" && (
          <p className="text-amber-600/90 dark:text-amber-400/90">
            Premium domain pricing (₹{(estimate.pricing.baseFeePaise / 100).toFixed(0)} base + ₹
            {(estimate.pricing.perRecordPaise / 100).toFixed(2)}/row) — includes dual-node
            consensus verification.
          </p>
        )}
        {estimate.effectiveRecords > 100 && (
          <p>
            Large volumes paginate automatically — each page may be fetched by
            contributor nodes, then merged on the hub (next links, load-more, or scroll).
          </p>
        )}
      </div>
    </div>
  );
}
