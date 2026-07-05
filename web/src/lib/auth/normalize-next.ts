/** Normalize `next` from query string or cookie (may be URL-encoded). */
export function normalizeAuthNext(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
