import { AlertTriangle } from "lucide-react";
import { formatVarianceFlag } from "@/lib/variance-flags";

export function VarianceFlagsPanel({ flags }: { flags: string[] }) {
  if (!flags.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-graphite-900">
            Field match notes
          </p>
          <p className="mt-1 text-xs text-graphite-600">
            Some expected fields were missing from the extracted output. Your
            download is still available — review these before using the data.
          </p>
          <ul className="mt-3 space-y-1.5">
            {flags.slice(0, 8).map((flag) => (
              <li
                key={flag}
                className="text-xs text-amber-900/90 before:mr-2 before:content-['•']"
              >
                {formatVarianceFlag(flag)}
              </li>
            ))}
          </ul>
          {flags.length > 8 && (
            <p className="mt-2 text-xs text-graphite-500">
              +{flags.length - 8} more field gaps
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
