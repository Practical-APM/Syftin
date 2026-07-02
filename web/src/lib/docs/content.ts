import {
  DOMAIN_SCHEMA_TEMPLATES,
  formatSchemaTemplate,
} from "@/lib/constants/schema-templates";

export const JOB_REJECTION_GUIDES = [
  {
    title: "Domain not on approved list",
    cause: "The URL hostname is not in your workspace approved sites.",
    fix: "Use a URL on an approved domain, or ask Syftin to enable a new public source for your pilot.",
    link: "/dashboard/compliance",
  },
  {
    title: "Prohibited content in job name or schema",
    cause: "Input screening blocked terms that are not allowed on the platform.",
    fix: "Use neutral business research labels and field names. Remove any illegal or NSFW terms.",
    link: "/docs/errors",
  },
  {
    title: "Invalid JSON schema",
    cause: "The example fields must be a JSON object (one sample row), not an array or plain text.",
    fix: "Paste a single object like { \"price_inr\": 0, \"in_stock\": true } on the New Job form.",
    link: "/docs/schemas",
  },
  {
    title: "Login-only or private page",
    cause: "The worker could not read public content at the URL (auth wall, empty page, or bot block).",
    fix: "Target a publicly accessible listing or search results page. Retry after checking the URL in a private browser window.",
    link: "/docs/errors",
  },
  {
    title: "Low field match score",
    cause: "Extracted rows are missing fields from your example schema.",
    fix: "Check field match notes on the job detail page. Simplify field names or pick a page with clearer structure.",
    link: "/docs/errors",
  },
] as const;

export const DOMAIN_GUIDES = Object.entries(DOMAIN_SCHEMA_TEMPLATES).map(
  ([domain, schema]) => ({
    domain,
    vertical: verticalForDomain(domain),
    schema,
    schemaJson: formatSchemaTemplate(schema),
    fetchNote: fetchNoteForDomain(domain),
  }),
);

function verticalForDomain(domain: string): string {
  const map: Record<string, string> = {
    "blinkit.com": "Quick commerce pricing",
    "zeptonow.com": "Quick commerce pricing",
    "naukri.com": "Job listings",
    "mca.gov.in": "Company registry",
    "amazon.in": "E-commerce catalog",
    "flipkart.com": "E-commerce catalog",
    "myntra.com": "Fashion catalog",
    "zomato.com": "Restaurant listings",
    "swiggy.com": "Restaurant listings",
    "indiamart.com": "B2B suppliers",
  };
  return map[domain] ?? "Public web data";
}

function fetchNoteForDomain(domain: string): string {
  const playwright = ["blinkit.com", "naukri.com", "flipkart.com"];
  if (playwright.includes(domain)) {
    return "Often fetched with a headless browser when the page is JavaScript-heavy.";
  }
  return "Usually fetched with direct HTTP when the HTML contains the data.";
}

export const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Pick an approved URL",
    body: "Only public pages on domains in your Approved sites list.",
  },
  {
    step: "2",
    title: "Paste example fields",
    body: "One JSON object showing the columns you want in every row of the download.",
  },
  {
    step: "3",
    title: "Wait for processing",
    body: "Jobs move through queue → fetch → extract → privacy screen → validate.",
  },
  {
    step: "4",
    title: "Download JSON",
    body: "Files appear on the job detail page and under Downloads when status is Ready.",
  },
] as const;
