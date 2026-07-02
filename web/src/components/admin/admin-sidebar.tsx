"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  Cpu,
  FlaskConical,
  Globe,
  IndianRupee,
  LogOut,
  Mail,
  Shield,
} from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: Activity, exact: true },
  { href: "/admin/organizations", label: "Workspaces", icon: Building2 },
  { href: "/admin/domains", label: "Whitelist", icon: Globe },
  { href: "/admin/invites", label: "Pilot invites", icon: Mail },
  { href: "/admin/contributor-invites", label: "Contributor invites", icon: Mail },
  { href: "/admin/contributors", label: "Contributor fleet", icon: Cpu },
  { href: "/admin/payouts", label: "Payouts", icon: IndianRupee },
  { href: "/admin/revenue", label: "Revenue", icon: IndianRupee },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/benchmarks", label: "Benchmarks", icon: FlaskConical },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-graphite-800 bg-graphite-950"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <div className="flex h-14 items-center border-b border-graphite-800 px-4">
        <SyftinLogo variant="light" />
        <span className="ml-2 rounded-md bg-honey-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-honey-400">
          Admin
        </span>
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

      <div className="space-y-1 border-t border-graphite-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500 transition-colors hover:bg-graphite-900 hover:text-graphite-300"
        >
          <Shield className="h-4 w-4" strokeWidth={1.75} />
          Buyer dashboard
        </Link>
        <Link
          href="/auth/signout"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500 transition-colors hover:bg-graphite-900 hover:text-graphite-300"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Link>
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
