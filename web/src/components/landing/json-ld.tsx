import { getFaqJsonLdEntries } from "@/lib/landing/faq-data";
import { isPhase2Enabled } from "@/lib/env";

export function JsonLd() {
  const phase2 = isPhase2Enabled();
  const faqEntries = getFaqJsonLdEntries(phase2);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Syftin",
      image: "https://syftin.io/syftin-512.png",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Syftin helps business teams collect structured datasets from approved public websites — with privacy screening, quality scores, and flexible delivery via webhook, API, S3/GCS, or SFTP.",
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/PreOrder",
        description: "Early access for business customers in India",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqEntries.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
