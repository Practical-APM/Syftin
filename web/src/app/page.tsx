import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { PlainIntro } from "@/components/landing/plain-intro";
import { TrustStrip } from "@/components/landing/trust-strip";
import { DomainMarquee } from "@/components/landing/domain-marquee";
import { PersonasSection } from "@/components/landing/personas-section";
import { LandingNodeCapacitySection } from "@/components/landing/landing-node-capacity-section";
import { ProductSnapshots } from "@/components/landing/product-snapshots";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { PainVisual } from "@/components/landing/pain-visual";
import { BentoFeatures } from "@/components/landing/bento-features";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { ComplianceSection } from "@/components/landing/compliance-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { MobileCtaBar } from "@/components/landing/mobile-cta-bar";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { JsonLd } from "@/components/landing/json-ld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://syftin.io";

export const metadata: Metadata = {
  title: "Syftin | Structured Web Data for Business Teams",
  description:
    "Turn public website pages into clean JSON datasets. Syftin helps business teams collect pricing, registry, and job market data — with privacy screening, quality scores, and webhook, API, bucket, or SFTP delivery.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Syftin | Structured Web Data for Business Teams",
    description:
      "Clean JSON from public websites for pricing research, company registries, and job market analytics. Push to webhook, API, S3/GCS, or SFTP.",
    url: siteUrl,
    siteName: "Syftin",
    type: "website",
    images: [
      {
        url: "/syftin-512.png",
        width: 512,
        height: 512,
        alt: "Syftin — structured web data platform",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Syftin | Structured Web Data for Business Teams",
    description:
      "Clean JSON from public websites. Webhook, API, bucket, or SFTP delivery. Privacy screening and field-match scores.",
    images: ["/syftin-512.png"],
  },
};

export default function HomePage() {
  return (
    <SmoothScrollProvider>
      <JsonLd />
      <ScrollProgress />
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Hero />
        <TrustStrip />
        <PlainIntro />
        <DomainMarquee />
        <PersonasSection />
        <LandingNodeCapacitySection />
        <ProductSnapshots />
        <InteractiveDemo />
        <PainVisual />
        <BentoFeatures />
        <UseCasesSection />
        <ComplianceSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
      <MobileCtaBar />
    </SmoothScrollProvider>
  );
}
