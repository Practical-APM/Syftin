import {
  schemaForDomain,
  formatSchemaTemplate,
} from "@/lib/constants/schema-templates";
import type { JobStatus } from "@/lib/types/jobs";

export type DemoVertical = "commerce" | "jobs" | "registry";

export type PipelineStage = {
  id: string;
  label: string;
  detail: string;
};

/** Matches worker/internal/pipeline order + dashboard job statuses */
export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "submit",
    label: "Submit",
    detail: "Job name, URL, and example fields saved to your workspace",
  },
  {
    id: "whitelist",
    label: "Approved site",
    detail: "Domain checked against Syftin's approved site list",
  },
  {
    id: "sanitize",
    label: "Screen input",
    detail: "Job name and schema checked for prohibited content",
  },
  {
    id: "fetch",
    label: "Fetch page",
    detail: "Public HTML retrieved via HTTP or Playwright when needed",
  },
  {
    id: "extract",
    label: "Extract",
    detail: "Local LLM (Ollama) maps page content to your field schema",
  },
  {
    id: "pii",
    label: "Privacy screen",
    detail: "Emails and phone numbers removed from output rows",
  },
  {
    id: "validate",
    label: "Validate",
    detail: "Field match score computed against your example schema",
  },
  {
    id: "deliver",
    label: "Deliver",
    detail: "Download JSON/CSV/NDJSON or push via webhook, bucket, or SFTP",
  },
];

export const STATUS_TO_STAGE: Record<JobStatus, number> = {
  pending: 0,
  queued: 1,
  processing: 4,
  validating: 6,
  completed: 7,
  failed: 4,
  cancelled: 0,
};

export const DEMO_VERTICALS: Record<
  DemoVertical,
  {
    id: DemoVertical;
    label: string;
    domain: string;
    jobName: string;
    url: string;
    accent: string;
    gradient: string;
    complianceScore: number;
    recordCount: number;
    rawSnippet: string;
    piiField?: { key: string; value: string };
    outputRows: Record<string, unknown>[];
  }
> = {
  commerce: {
    id: "commerce",
    label: "Pricing",
    domain: "blinkit.com",
    jobName: "Mumbai grocery prices — weekly",
    url: "https://blinkit.com/categories/dairy",
    accent: "text-emerald-400",
    gradient: "from-emerald-500/15 to-emerald-600/5",
    complianceScore: 98.4,
    recordCount: 3,
    rawSnippet: "Amul Taaza Milk 1L · ₹56 · In stock",
    piiField: { key: "seller_email", value: "vendor@example.com" },
    outputRows: [
      schemaForDomain("blinkit.com"),
      {
        product_name: "Britannia Bread 400g",
        price_inr: 45,
        mrp_inr: 50,
        in_stock: true,
      },
      {
        product_name: "Lays Classic Salted",
        price_inr: 20,
        mrp_inr: 20,
        in_stock: false,
      },
    ],
  },
  jobs: {
    id: "jobs",
    label: "Jobs",
    domain: "naukri.com",
    jobName: "Bangalore React roles — weekly",
    url: "https://naukri.com/react-developer-jobs",
    accent: "text-blue-400",
    gradient: "from-blue-500/15 to-blue-600/5",
    complianceScore: 97.1,
    recordCount: 2,
    rawSnippet: "Frontend Engineer · Razorpay · React, TypeScript",
    piiField: { key: "recruiter_phone", value: "+91 98765 43210" },
    outputRows: [
      schemaForDomain("naukri.com"),
      {
        title: "Data Analyst",
        company: "Swiggy",
        skills: ["SQL", "Python"],
        posted_date: "2026-06-28",
      },
    ],
  },
  registry: {
    id: "registry",
    label: "Registry",
    domain: "mca.gov.in",
    jobName: "Annual return filings — Q2",
    url: "https://mca.gov.in/content/mca/global/en/home.html",
    accent: "text-honey-400",
    gradient: "from-honey-500/15 to-honey-600/5",
    complianceScore: 99.2,
    recordCount: 1,
    rawSnippet: "Example Pvt Ltd · U12345MH2020PTC123456 · Annual Return",
    outputRows: [schemaForDomain("mca.gov.in")],
  },
};

export function schemaJsonForVertical(vertical: DemoVertical): string {
  return formatSchemaTemplate(schemaForDomain(DEMO_VERTICALS[vertical].domain));
}

export const APPROVED_DOMAINS_SAMPLE = [
  "blinkit.com",
  "naukri.com",
  "mca.gov.in",
  "flipkart.com",
  "amazon.in",
  "zeptonow.com",
];
