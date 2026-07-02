export function jsonRowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    keys.join(","),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(",")),
  ];
  return lines.join("\n");
}
