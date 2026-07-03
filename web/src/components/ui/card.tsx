import { cn } from "@/lib/utils";

const panelPadding = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export function Panel({
  children,
  className,
  padding = "lg",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: keyof typeof panelPadding;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-xl border border-ivory-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 shadow-sm",
        panelPadding[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3" | "p";
}) {
  return (
    <Tag className={cn("app-section-label", className)}>{children}</Tag>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "default",
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "default" | "emerald" | "honey";
  valueClassName?: string;
}) {
  return (
    <Panel padding="md" className="flex flex-col">
      {Icon ? (
        <div className="flex items-center gap-2 text-graphite-500 dark:text-graphite-300">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              accent === "emerald"
                ? "text-emerald-600 dark:text-emerald-400"
                : accent === "honey"
                  ? "text-honey-500"
                  : "text-honey-500",
            )}
          />
          <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
        </div>
      ) : (
        <p className="text-xs font-medium text-graphite-500 dark:text-graphite-300">{label}</p>
      )}
      <p
        className={cn(
          "app-stat-value",
          Icon ? "mt-3" : "mt-2",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-graphite-500 dark:text-graphite-300">{hint}</p>}
    </Panel>
  );
}

const alertVariants = {
  neutral:
    "border-ivory-200 dark:border-graphite-700 bg-ivory-50 dark:bg-graphite-900/50 text-graphite-700 dark:text-graphite-200",
  info: "border-honey-500/20 bg-honey-500/5 text-graphite-900 dark:text-ivory-50",
  warning:
    "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200",
  error:
    "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300",
  success:
    "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
} as const;

export function AlertBanner({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof alertVariants;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-5 py-4 text-sm",
        alertVariants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
