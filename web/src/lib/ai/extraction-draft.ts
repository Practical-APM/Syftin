export type ExtractionDraft = {
  mode: "single" | "batch";
  name: string;
  target_url?: string;
  urls?: string[];
  example_schema: Record<string, unknown>;
  max_records: number;
  budget_inr: number;
  required_region?: string;
  summary: string;
};

export type ExtractionDraftRequest = {
  requirements: string;
  mode: "single" | "batch";
  allowed_domains: string[];
};
