"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Cpu,
  Download,
  Gauge,
  IndianRupee,
  LogOut,
  Settings,
  Shield,
  Wifi,
} from "lucide-react";
import { SyftinLogo } from "@/components/brand/syftin-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/contributor", label: "Overview", icon: Activity, exact: true },
  { href: "/contributor/setup", label: "Setup", icon: Settings },
  { href: "/contributor/nodes", label: "My devices", icon: Cpu },
  { href: "/contributor/earnings", label: "Earnings", icon: IndianRupee },
  { href: "/contributor/download", label: "Install", icon: Download },
  { href: "/contributor/resources", label: "Resources", icon: Gauge },
  { href: "/contributor/help", label: "Help", icon: BookOpen },
  { href: "/contributor/network", label: "Network", icon: Wifi },
];

export function ContributorSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-emerald-950/40 bg-graphite-950"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <div className="flex h-14 items-center border-b border-graphite-800 px-4">
        <SyftinLogo variant="light" />
        <span className="ml-2 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          Node
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
                  active ? "text-emerald-400" : "text-graphite-500 group-hover:text-graphite-400",
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
