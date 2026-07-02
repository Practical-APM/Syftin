import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-ivory-50 text-sm text-graphite-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
