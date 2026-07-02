import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionContributorUser } from "@/lib/auth/contributor";
import { provisionPilotUser } from "@/lib/auth/org";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      try {
        if (next.startsWith("/contributor")) {
          await provisionContributorUser(data.user.id, data.user.email);
        } else {
          await provisionPilotUser(data.user.id, data.user.email);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Pilot access denied";
        return NextResponse.redirect(
          `${origin}/login?error=invite&message=${encodeURIComponent(message)}`,
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
