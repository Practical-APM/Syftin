import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { cancelBatch } from "@/lib/data/batches";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const result = await cancelBatch(id, auth.org);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel batch" },
      { status: 500 },
    );
  }
}
