import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { normalizeAuthNext } from "@/lib/auth/normalize-next";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired, isSupabaseClientConfigured } from "@/lib/env";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = normalizeAuthNext(params.next) ?? "/dashboard";

  if (isAuthRequired() && isSupabaseClientConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect(next);
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-ivory-50 dark:bg-graphite-950 text-sm text-graphite-500 dark:text-graphite-300">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
