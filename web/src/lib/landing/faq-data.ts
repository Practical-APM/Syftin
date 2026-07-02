export type FaqItem = {
  question: string;
  answer: string;
  audiences?: ("buyer" | "contributor" | "general")[];
};

const baseFaqs: FaqItem[] = [
  {
    question: "What is Syftin, in plain terms?",
    answer:
      "Syftin helps business teams turn public website pages into structured data files. You describe the fields you want — like product name and price — and Syftin collects, screens, and delivers results you can download or push to your systems.",
    audiences: ["general"],
  },
  {
    question: "Who can sign up today?",
    answer:
      "Buyer access is invite-only during our early access pilot. Business teams can request access with a work email. Contributor access is a separate, invite-only program for people running Syftin node apps on their own laptops.",
    audiences: ["general", "buyer", "contributor"],
  },
  {
    question: "What websites can I collect from?",
    answer:
      "Only domains on Syftin's approved public-site list. Jobs targeting other URLs are rejected at submission. During pilot, Syftin maintains the list; your dashboard shows the sites available to your workspace.",
    audiences: ["buyer", "general"],
  },
  {
    question: "What file format do I get?",
    answer:
      "JSON, CSV, or NDJSON. Download from the dashboard or pull via the REST API. Each completed job includes a field-match quality score. For automation, use webhooks or API keys under Integrations in your workspace.",
    audiences: ["buyer"],
  },
  {
    question: "Can I push job results to my own systems?",
    answer:
      "Yes. Under Dashboard → Integrations you can set up HTTPS webhooks, REST API keys, bucket push to S3/GCS, or SFTP drop. Webhooks fire on job completion (and optionally on failure); the API returns JSON, CSV, or NDJSON.",
    audiences: ["buyer"],
  },
  {
    question: "How is personal data handled?",
    answer:
      "Syftin acts as a data processor; your organization is the data controller. Outputs are screened for common PII (emails, phone numbers) before download. A Data Processing Agreement is available, and jobs require DPA acceptance in the dashboard.",
    audiences: ["buyer", "general"],
  },
  {
    question: "Do I need to run any software as a buyer?",
    answer:
      "No. Buyers use the web dashboard only — create jobs, track progress, and download results. Collection runs on Syftin's infrastructure.",
    audiences: ["buyer"],
  },
  {
    question: "How do credits work?",
    answer:
      "Some workspaces prepay credits via Razorpay (UPI, cards, or netbanking) before running jobs. Credit packs start at ₹500. Whether credits are required depends on your workspace settings — many pilot accounts queue jobs without a balance gate.",
    audiences: ["buyer"],
  },
  {
    question: "What does the contributor app actually do?",
    answer:
      "The Syftin node app runs in the background on your laptop. When a buyer job needs a page fetched, your device may retrieve public HTML and send it to Syftin's hub for extraction. It does not browse on your behalf outside approved tasks, and it can pause on metered networks.",
    audiences: ["contributor", "general"],
  },
  {
    question: "How do contributor resource controls work?",
    answer:
      "In Dashboard → Resources, pick Eco (25%), Balanced (50%), or Titan (max). Set CPU and RAM caps, thermal targets, and guards for AC power, idle-only runs, and metered networks. The node app reports live telemetry and pauses within milliseconds when you use the machine.",
    audiences: ["contributor"],
  },
  {
    question: "How do contributor payouts work?",
    answer:
      "Contributors in the pilot add a UPI ID in Setup. When your balance reaches ₹500, Syftin can send a UPI payout via RazorpayX. This is invite-only and not guaranteed income — task volume depends on live buyer demand.",
    audiences: ["contributor"],
  },
  {
    question: "Is Syftin a VPN, proxy, or crypto miner?",
    answer:
      "No. Syftin is a structured data collection platform for legitimate business research. Contributors share compute and network for approved public-page fetches only. There is no cryptocurrency mining and no resale of residential bandwidth as a standalone proxy product.",
    audiences: ["general", "contributor"],
  },
];

export function faqsForAudience(phase2: boolean): FaqItem[] {
  return baseFaqs.filter((faq) => {
    if (faq.question === "How do credits work?" && !phase2) {
      return false;
    }
    if (
      (faq.question === "What does the contributor app actually do?" ||
        faq.question === "How do contributor payouts work?" ||
        faq.question === "How do contributor resource controls work?") &&
      !phase2
    ) {
      return false;
    }
    return true;
  });
}

export function getFaqJsonLdEntries(phase2: boolean) {
  return faqsForAudience(phase2).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));
}
