export type ExportFormat = "json" | "csv" | "ndjson";

export function parseExportFormat(raw: string | null): ExportFormat {
  if (raw === "csv" || raw === "ndjson") return raw;
  return "json";
}

export function exportContentType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "ndjson":
      return "application/x-ndjson; charset=utf-8";
    default:
      return "application/json; charset=utf-8";
  }
}

export function exportFileExtension(format: ExportFormat): string {
  return format === "ndjson" ? "ndjson" : format;
}
