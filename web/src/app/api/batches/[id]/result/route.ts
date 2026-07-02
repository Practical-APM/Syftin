import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { mergeBatchResults } from "@/lib/data/batches";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const results = await mergeBatchResults(id, auth.org);
    if (results.length === 0) {
      return NextResponse.json(
        { error: "No completed results found for this batch" },
        { status: 404 },
      );
    }

    // Determine filename
    const filename = `syftin-batch-${id.slice(0, 8)}.json`;

    return new NextResponse(JSON.stringify(results, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch results" },
      { status: 500 },
    );
  }
}
