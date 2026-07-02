import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { getBatch } from "@/lib/data/batches";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const data = await getBatch(id, auth.org);
    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch batch" },
      { status: 500 },
    );
  }
}
