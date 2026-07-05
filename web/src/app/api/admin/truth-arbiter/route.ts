import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { listTruthArbiterTasks } from "@/lib/data/truth-arbiter";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending") as
    | "pending"
    | "resolved"
    | "failed"
    | "all";

  const tasks = await listTruthArbiterTasks(status);
  return NextResponse.json({ tasks });
}
