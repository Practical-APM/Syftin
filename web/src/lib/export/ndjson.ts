export function jsonRowsToNdjson(rows: Record<string, unknown>[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n");
}
