import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

declare global {
  var __syftinLastOpsAlertAt: Record<string, number> | undefined;
}

function inMemoryRecently(key: string): boolean {
  const last = global.__syftinLastOpsAlertAt?.[key] ?? 0;
  return Date.now() - last < ALERT_COOLDOWN_MS;
}

function inMemoryMark(key: string): void {
  if (!global.__syftinLastOpsAlertAt) {
    global.__syftinLastOpsAlertAt = {};
  }
  global.__syftinLastOpsAlertAt[key] = Date.now();
}

export async function wasAlertSentRecently(key: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return inMemoryRecently(key);
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ops_alert_cooldowns")
      .select("last_sent_at")
      .eq("alert_key", key)
      .maybeSingle();

    if (error || !data?.last_sent_at) {
      return inMemoryRecently(key);
    }

    const ageMs = Date.now() - new Date(data.last_sent_at).getTime();
    return ageMs < ALERT_COOLDOWN_MS;
  } catch {
    return inMemoryRecently(key);
  }
}

export async function recordAlertSent(key: string): Promise<void> {
  inMemoryMark(key);

  if (!isSupabaseConfigured()) return;

  try {
    const admin = createAdminClient();
    await admin.from("ops_alert_cooldowns").upsert({
      alert_key: key,
      last_sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[syftin ops] could not persist alert cooldown:",
      err instanceof Error ? err.message : err,
    );
  }
}
