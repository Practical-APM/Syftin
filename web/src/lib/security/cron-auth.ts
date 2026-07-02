import { safeEqualString } from "@/lib/security/timing-safe";

export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }

  const header = request.headers.get("x-cron-secret");
  if (header && safeEqualString(header, secret)) return true;

  return false;
}
