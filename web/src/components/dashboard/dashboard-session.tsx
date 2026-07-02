"use client";

import { useEffect, useState } from "react";
import { Building2, User } from "lucide-react";
import { isAuthRequiredClient, isSupabaseClientConfigured } from "@/lib/env";

type SessionInfo = {
  orgName: string;
  email: string | null;
  role: string;
};

export function DashboardSessionStrip() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.orgName) {
          setSession({
            orgName: data.orgName,
            email: data.email ?? null,
            role: data.role ?? "member",
          });
        }
      })
      .catch(() => {});
  }, []);

  const showAuthChrome =
    isAuthRequiredClient() && isSupabaseClientConfigured();

  if (!session && !showAuthChrome) return null;

  return (
    <div className="border-t border-graphite-800 px-3 py-3">
      {session ? (
        <div className="rounded-lg bg-graphite-900/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-honey-400" />
            <p className="truncate text-xs font-medium text-ivory-50">
              {session.orgName}
            </p>
          </div>
          {session.email && (
            <div className="mt-1.5 flex items-center gap-2">
              <User className="h-3 w-3 shrink-0 text-graphite-500" />
              <p className="truncate text-[11px] text-graphite-500">
                {session.email}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="px-1 text-[11px] text-graphite-500">Loading workspace…</p>
      )}
    </div>
  );
}

export function shouldShowSignOut() {
  return isAuthRequiredClient() && isSupabaseClientConfigured();
}
