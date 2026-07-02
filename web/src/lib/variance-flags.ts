/** Human-readable labels for worker variance flag codes */
export function formatVarianceFlag(flag: string): string {
  if (flag === "empty_output") {
    return "No records were extracted from the page";
  }

  const missing = flag.match(/^record_(\d+)_missing_(.+)$/);
  if (missing) {
    const recordNum = Number(missing[1]) + 1;
    const field = missing[2].replace(/_/g, " ");
    return `Record ${recordNum} is missing field “${field}”`;
  }

  return flag.replace(/_/g, " ");
}
