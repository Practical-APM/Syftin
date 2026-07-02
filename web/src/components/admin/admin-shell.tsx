"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ivory-50">
        {children}
      </div>
    </div>
  );
}
