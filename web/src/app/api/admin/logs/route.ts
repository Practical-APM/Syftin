import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isAuthRequired } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin(): Promise<boolean> {
  if (!isAuthRequired()) return isPlatformAdminEmail(null);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? isPlatformAdminEmail(user.email) : false;
}

type LogType = "delivery" | "export" | "payout";

export async function GET(request: NextRequest) {
  const isAdmin = await assertAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ logs: [] });
  }

  const params = request.nextUrl.searchParams;
  const type = (params.get("type") ?? "delivery") as LogType;
  const limit = Math.min(Number(params.get("limit") ?? 100), 500);

  const admin = createAdminClient();

  if (type === "delivery") {
    const { data, error } = await admin
      .from("job_delivery_log")
      .select("id, job_id, organization_id, channel, event_type, status, attempt_count, last_error, response_status, delivered_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data ?? [], type });
  }

  if (type === "export") {
    const { data, error } = await admin
      .from("export_batch_log")
      .select("id, organization_id, export_date, channel, status, file_path, record_count, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data ?? [], type });
  }

  if (type === "payout") {
    const { data, error } = await admin
      .from("payout_events")
      .select("id, contributor_id, amount_paise, status, razorpayx_payout_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data ?? [], type });
  }

  return NextResponse.json({ error: "Unknown log type. Use: delivery | export | payout" }, { status: 400 });
}
