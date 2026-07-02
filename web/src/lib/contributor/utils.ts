export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatRupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    scout: "Scout — light pages",
    ranger: "Ranger — JS-heavy sites",
    titan: "Titan — GPU extraction",
  };
  return map[tier] ?? tier;
}
