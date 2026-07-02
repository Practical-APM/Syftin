import { jsonRowsToCsv } from "@/lib/export/csv";
import { jsonRowsToNdjson } from "@/lib/export/ndjson";
import {
  exportContentType,
  exportFileExtension,
  parseExportFormat,
  type ExportFormat,
} from "@/lib/export/formats";

export function serializeJobResult(
  rows: Record<string, unknown>[],
  jobId: string,
  format: ExportFormat,
): { body: string; contentType: string; filename: string } {
  const ext = exportFileExtension(format);
  const filename = `syftin-${jobId}.${ext}`;

  if (format === "csv") {
    return {
      body: jsonRowsToCsv(rows),
      contentType: exportContentType("csv"),
      filename,
    };
  }
  if (format === "ndjson") {
    return {
      body: jsonRowsToNdjson(rows),
      contentType: exportContentType("ndjson"),
      filename,
    };
  }

  return {
    body: JSON.stringify(rows, null, 2),
    contentType: exportContentType("json"),
    filename,
  };
}

export function parseResultFormatParam(
  searchParams: URLSearchParams,
  fallback: ExportFormat = "json",
): ExportFormat {
  return parseExportFormat(searchParams.get("format") ?? fallback);
}
