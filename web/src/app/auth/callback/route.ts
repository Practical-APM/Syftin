import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionContributorUser } from "@/lib/auth/contributor";
import { provisionPilotUser } from "@/lib/auth/org";
import { normalizeAuthNext } from "@/lib/auth/normalize-next";
import {
  resolvePostAuthDestination,
} from "@/lib/auth/post-auth";

function resolveAuthNext(
  searchParams: URLSearchParams,
  cookieNext: string | undefined,
): string | null {
  return (
    normalizeAuthNext(searchParams.get("next")) ??
    normalizeAuthNext(cookieNext) ??
    null
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const preferredNext = resolveAuthNext(
    searchParams,
    cookieStore.get("syftin_auth_next")?.value,
  );

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      const next = await resolvePostAuthDestination({
        email: data.user.email,
        userId: data.user.id,
        preferredNext,
      });

      try {
        if (next.startsWith("/contributor")) {
          await provisionContributorUser(data.user.id, data.user.email);
        } else {
          await provisionPilotUser(data.user.id, data.user.email);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Pilot access denied";
        const loginPath = next.startsWith("/contributor")
          ? `/login?next=${encodeURIComponent(next)}&error=invite&message=${encodeURIComponent(message)}`
          : `/login?error=invite&message=${encodeURIComponent(message)}`;
        const response = NextResponse.redirect(`${origin}${loginPath}`);
        response.cookies.delete("syftin_auth_next");
        return response;
      }
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete("syftin_auth_next");
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/login?error=auth`);
  response.cookies.delete("syftin_auth_next");
  return response;
}
