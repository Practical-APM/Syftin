import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { retryJob } from "@/lib/data/jobs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await retryJob(id, auth.org);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
