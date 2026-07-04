import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { requireNodeAuth } from "@/lib/security/node-auth";
import {
  createPayloadUploadUrl,
  isPayloadStorageConfigured,
} from "@/lib/storage/payload-storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }

  const auth = await requireNodeAuth(request, "nodeComplete");
  if (!auth.ok) return auth.response;

  if (!isPayloadStorageConfigured()) {
    return NextResponse.json({ enabled: false });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: task, error } = await admin
    .from("fetch_tasks")
    .select("id, claimed_by_node_id, status")
    .eq("id", id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.claimed_by_node_id !== auth.nodeId) {
    return NextResponse.json(
      { error: "Task not claimed by this node." },
      { status: 403 },
    );
  }
  if (task.status !== "claimed") {
    return NextResponse.json(
      { error: "Task is not in claimed state." },
      { status: 400 },
    );
  }

  const upload = await createPayloadUploadUrl(id);
  return NextResponse.json({
    enabled: true,
    uploadUrl: upload.url,
    payloadKey: upload.key,
    expiresIn: upload.expiresIn,
    encoding: "gzip",
  });
}
