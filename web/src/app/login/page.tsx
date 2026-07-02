import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-ivory-50 dark:bg-graphite-950 text-sm text-graphite-500 dark:text-graphite-300">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
