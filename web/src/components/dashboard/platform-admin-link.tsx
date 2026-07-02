"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

export function PlatformAdminLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/access")
      .then((r) => r.json())
      .then((data) => setIsAdmin(Boolean(data.admin)))
      .catch(() => setIsAdmin(false));
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-graphite-500 transition-colors hover:bg-graphite-900 hover:text-honey-400"
    >
      <Settings2 className="h-4 w-4" strokeWidth={1.75} />
      Platform admin
    </Link>
  );
}
