import { FadeIn } from "@/components/ui/fade-in";

export function PlainIntro() {
  return (
    <section className="py-14 lg:py-16">
      <div className="marketing-container-narrow text-center">
        <FadeIn>
          <p className="text-lg leading-relaxed text-graphite-600 sm:text-xl">
            <span className="font-medium text-graphite-900">Syftin</span> delivers
            high-quality, structured data from public websites for research and
            AI model improvement. We handle privacy, quality, and delivery.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
