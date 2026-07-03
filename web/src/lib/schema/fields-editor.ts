/** Helpers for non-technical field editing (no raw JSON required). */

export type SchemaFieldRow = {
  key: string;
  example: string;
};

const RESERVED_KEYS = new Set(["_syftin"]);

export function schemaToFieldRows(
  schema: Record<string, unknown>,
): SchemaFieldRow[] {
  return Object.entries(schema)
    .filter(([key]) => !RESERVED_KEYS.has(key) && !key.startsWith("_"))
    .map(([key, value]) => ({
      key,
      example: formatExampleValue(value),
    }));
}

export function fieldRowsToSchema(rows: SchemaFieldRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = parseExampleValue(row.example);
  }
  return out;
}

function formatExampleValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(value);
}

function parseExampleValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function mergeSchemaWithMeta(
  fields: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const syftin = existing?._syftin;
  return syftin ? { ...fields, _syftin: syftin } : fields;
}
