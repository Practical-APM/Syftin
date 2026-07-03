import { AlertTriangle } from "lucide-react";
import { formatVarianceFlag } from "@/lib/variance-flags";

export function VarianceFlagsPanel({ flags }: { flags: string[] }) {
  if (!flags.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-graphite-900 dark:text-ivory-50">
            Field match notes
          </p>
          <p className="mt-1 text-xs text-graphite-600 dark:text-graphite-300">
            Some expected fields were missing from the extracted output. Your
            download is still available — review these before using the data.
          </p>
          <ul className="mt-3 space-y-1.5">
            {flags.slice(0, 8).map((flag) => (
              <li
                key={flag}
                className="text-xs text-amber-900/90 dark:text-amber-200/90 before:mr-2 before:content-['•']"
              >
                {formatVarianceFlag(flag)}
              </li>
            ))}
          </ul>
          {flags.length > 8 && (
            <p className="mt-2 text-xs text-graphite-500 dark:text-graphite-400">
              +{flags.length - 8} more field gaps
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
