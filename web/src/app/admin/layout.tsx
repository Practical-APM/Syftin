import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isAuthRequired } from "@/lib/env";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthRequired()) {
    if (!isPlatformAdminEmail(null)) {
      redirect("/dashboard");
    }
    return <AdminShell>{children}</AdminShell>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
