import { FadeIn } from "@/components/ui/fade-in";

export function PlainIntro() {
  return (
    <section className="py-14 lg:py-16">
      <div className="marketing-container-narrow text-center">
        <FadeIn>
          <p className="text-lg leading-relaxed font-normal text-graphite-600 dark:text-graphite-400 sm:text-xl">
            <span className="font-normal text-graphite-900 dark:text-ivory-50">Syftin</span> delivers
            high-quality, structured data from public websites for research and
            AI model improvement. We handle privacy, quality, and delivery.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
