import { getActiveDomainList } from "@/lib/data/domains";

export async function DomainMarquee() {
  const domains = await getActiveDomainList();
  const items = [...domains, ...domains];

  return (
    <section
      id="supported-sites"
      className="overflow-hidden border-y border-ivory-200 bg-ivory-100/50 py-6"
      aria-label="Supported public websites"
    >
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-widest text-graphite-400">
        Supported sources
      </p>
      <div className="relative flex">
        <div className="animate-marquee flex shrink-0 items-center gap-12 whitespace-nowrap">
          {items.map((domain, i) => (
            <span
              key={`${domain}-${i}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-graphite-500"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-honey-500" />
              {domain}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
