"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Download,
  FileJson,
  FlaskConical,
  IndianRupee,
  Layers,
  LogOut,
  Plus,
  Shield,
  TrendingUp,
} from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import {
  DashboardSessionStrip,
  shouldShowSignOut,
} from "@/components/dashboard/dashboard-session";
import { PlatformAdminLink } from "@/components/dashboard/platform-admin-link";
import { cn } from "@/lib/utils";
import { isDevDashboard, isPhase2EnabledClient, isPhase3EnabledClient } from "@/lib/env";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Activity, exact: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: TrendingUp },
  { href: "/dashboard/jobs/new", label: "New job", icon: Plus },
  ...(isPhase3EnabledClient()
    ? [{ href: "/dashboard/batches", label: "Batches", icon: Layers }]
    : []),
  { href: "/dashboard/exports", label: "Downloads", icon: Download },
  { href: "/dashboard/integrations", label: "Integrations", icon: FileJson },
  ...(isPhase2EnabledClient()
    ? [{ href: "/dashboard/credits", label: "Credits", icon: IndianRupee }]
    : []),
  { href: "/dashboard/compliance", label: "Approved sites", icon: Shield },
  ...(isDevDashboard()
    ? [{ href: "/dashboard/benchmarks", label: "Benchmarks", icon: FlaskConical }]
    : []),
];

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === "/dashboard/jobs") {
      return (
        pathname === "/dashboard/jobs" ||
        (pathname.startsWith("/dashboard/jobs/") &&
          pathname !== "/dashboard/jobs/new")
      );
    }
    if (href === "/dashboard/batches") {
      return (
        pathname === "/dashboard/batches" ||
        (pathname.startsWith("/dashboard/batches/") &&
          pathname !== "/dashboard/batches/new")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-graphite-800 bg-graphite-950"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <div className="flex h-14 items-center border-b border-graphite-800 px-4">
        <SyftinLogo variant="light" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-graphite-800 text-ivory-50"
                  : "text-graphite-400 hover:bg-graphite-900 hover:text-graphite-200",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-honey-400" : "text-graphite-500 group-hover:text-graphite-400",
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <DashboardSessionStrip />

      <div className="space-y-1 border-t border-graphite-800 p-3">
        <PlatformAdminLink />
        {shouldShowSignOut() && (
          <Link
            href="/auth/signout"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500 transition-colors hover:bg-graphite-900 hover:text-graphite-300"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </Link>
        )}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500 transition-colors hover:bg-graphite-900 hover:text-graphite-300"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to site
        </Link>
      </div>
    </aside>
  );
}

export function DashboardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="shrink-0 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 lg:px-8"
        style={{ maxWidth: "var(--app-content-max)" }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-graphite-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-graphite-500">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
      <div
        className={cn("mx-auto max-w-6xl space-y-6", className)}
        style={{ maxWidth: "var(--app-content-max)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function SchemaPreview({
  schema,
}: {
  schema: Record<string, unknown>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ivory-200 bg-graphite-950 shadow-sm">
      <div className="flex items-center gap-2 border-b border-graphite-800 px-4 py-3">
        <FileJson className="h-3.5 w-3.5 text-honey-400" />
        <span className="text-xs font-medium text-graphite-400">
          Requested fields
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-graphite-300">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
