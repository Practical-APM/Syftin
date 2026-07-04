import { createClient } from "@supabase/supabase-js";

/** Prefer transaction pooler in production to reduce connection churn (§9 edge gateway). */
function adminSupabaseUrl(): string {
  return (
    process.env.SUPABASE_POOLER_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

export function createAdminClient() {
  const url = adminSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials not configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
