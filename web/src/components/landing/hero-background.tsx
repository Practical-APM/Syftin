export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="gradient-radial-light absolute inset-0" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-graphite-900/8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-honey-500/10 blur-3xl gpu-layer" />
      <div className="absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-honey-400/8 blur-3xl gpu-layer" />
    </div>
  );
}
