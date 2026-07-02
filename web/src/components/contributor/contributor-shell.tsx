"use client";

import { ContributorSidebar } from "@/components/contributor/contributor-sidebar";

export function ContributorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <ContributorSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ivory-50">
        {children}
      </div>
    </div>
  );
}
