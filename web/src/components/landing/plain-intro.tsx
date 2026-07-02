import { FadeIn } from "@/components/ui/fade-in";

export function PlainIntro() {
  return (
    <section className="py-14 lg:py-16">
      <div className="marketing-container-narrow text-center">
        <FadeIn>
          <p className="text-lg leading-relaxed text-graphite-600 sm:text-xl">
            <span className="font-medium text-graphite-900">Syftin</span> is a
            web platform that turns public website pages into{" "}
            <span className="font-medium text-graphite-900">
              clean JSON datasets
            </span>{" "}
            for business research — grocery pricing, company filings, hiring
            trends, and more. You choose the fields; Syftin handles collection,
            quality checks, privacy screening, and delivery to your stack.
          </p>
          <p className="mt-4 text-sm text-graphite-500">
            Built for teams in India. Early access pilot — not a personal
            scraping tool or open proxy network.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
