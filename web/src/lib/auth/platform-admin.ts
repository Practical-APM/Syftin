import { isAuthRequired } from "@/lib/env";

export function getPlatformAdminEmails(): string[] {
  return (
    process.env.PLATFORM_ADMIN_EMAILS ??
    process.env.SYFTIN_PLATFORM_ADMIN_EMAILS ??
    ""
  )
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Persona C — platform operators with global admin access */
export function isPlatformAdminEmail(
  email: string | undefined | null,
): boolean {
  const admins = getPlatformAdminEmails();
  if (admins.length === 0) {
    return process.env.NODE_ENV === "development" && !isAuthRequired();
  }
  return Boolean(email && admins.includes(email.toLowerCase()));
}
