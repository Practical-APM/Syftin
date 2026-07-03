/** Human-readable labels for worker variance flag codes */
export function formatVarianceFlag(flag: string): string {
  if (flag === "empty_output") {
    return "No records were extracted from the page";
  }
  if (flag === "volume_capped") {
    return "Collection stopped at your budget cap — partial result delivered";
  }
  if (flag === "job_terminated_exhausted") {
    return "Pagination ended — no new records on 3 consecutive pages";
  }
  if (flag === "load_more_expanded") {
    return "Page expanded via load-more clicks before extraction";
  }
  if (flag === "scroll_expanded") {
    return "Page expanded via scroll to load lazy content";
  }
  if (flag === "distributed_pagination") {
    return "Multiple pages fetched by contributor nodes";
  }
  if (flag === "edge_page_1") {
    return "First page HTML came from a contributor node";
  }
  if (flag === "low_compliance") {
    return "Extraction quality was low — some fields may be missing or wrong";
  }
  if (flag === "partial_fetch") {
    return "Pagination stopped early on a fetch error — data may be incomplete";
  }
  if (flag === "capacity_timeout") {
    return "Timed out waiting for contributor capacity — delivered available pages";
  }
  if (flag === "capacity_timeout_hub_fallback") {
    return "No contributor capacity — pages were fetched directly by the hub";
  }

  const pagesFetched = flag.match(/^pages_fetched_(\d+)$/);
  if (pagesFetched) {
    return `Fetched ${pagesFetched[1]} pages`;
  }

  const edgePages = flag.match(/^edge_pages_fetched_(\d+)$/);
  if (edgePages) {
    return `${edgePages[1]} contributor pages merged`;
  }

  const deduped = flag.match(/^deduped_(\d+)$/);
  if (deduped) {
    return `Removed ${deduped[1]} duplicate records across pages`;
  }

  const partialMissing = flag.match(/^partial_pages_missing_(\d+)$/);
  if (partialMissing) {
    return `Partial result — ${partialMissing[1]} page(s) could not be fetched`;
  }

  const missing = flag.match(/^record_(\d+)_missing_(.+)$/);
  if (missing) {
    const recordNum = Number(missing[1]) + 1;
    const field = missing[2].replace(/_/g, " ");
    return `Record ${recordNum} is missing field “${field}”`;
  }

  return flag.replace(/_/g, " ");
}
