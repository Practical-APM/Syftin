import { redirect } from "next/navigation";
import {
  getSessionContributor,
  provisionContributorUser,
} from "@/lib/auth/contributor";
import { ContributorShell } from "@/components/contributor/contributor-shell";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired, isPhase2Enabled } from "@/lib/env";

export default async function ContributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPhase2Enabled()) {
    redirect("/dashboard");
  }

  let contributor = await getSessionContributor();

  if (!contributor && isAuthRequired()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      redirect("/login?next=/contributor");
    }

    try {
      contributor = await provisionContributorUser(user.id, user.email);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Contributor access denied";
      redirect(
        `/login?next=/contributor&message=${encodeURIComponent(message)}`,
      );
    }
  }

  if (!contributor) {
    redirect("/login?next=/contributor");
  }

  return <ContributorShell>{children}</ContributorShell>;
}
