"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ivory-50">
        {children}
      </div>
    </div>
  );
}
