export function jobDownloadUrl(
  job: { id: string; result_url?: string | null },
  format: "json" | "csv" | "ndjson" = "json",
) {
  const base = job.result_url ?? `/api/jobs/${job.id}/result`;
  if (format === "json") return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}format=${format}`;
}
