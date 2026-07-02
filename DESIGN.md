# Syftin — Design System

## Theme

Light primary surfaces (ivory) for reading and trust; dark secondary surfaces (graphite) for depth, contrast sections, and dashboard chrome. Honey gold is the sole accent.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| ivory-50 | `#FAF7F2` | Primary page background |
| ivory-100 | `#F0EBE3` | Subtle borders, cards on light |
| ivory-200 | `#E5DDD2` | Muted dividers |
| graphite-950 | `#121214` | Deepest dark |
| graphite-900 | `#1A1A1D` | Dark section backgrounds |
| graphite-800 | `#252528` | Dark cards, sidebar |
| graphite-700 | `#323235` | Dark borders |
| graphite-500 | `#6B6B70` | Muted text on light |
| graphite-300 | `#A8A8AD` | Secondary text on dark |
| honey-400 | `#E8B86A` | Hover accent |
| honey-500 | `#D4A053` | Primary CTA, highlights |
| honey-600 | `#B8873A` | CTA pressed |

Neutrals are warm-tinted toward honey hue. No pure `#000` or `#fff`.

## Typography

- **Primary:** Inter (400, 500, 600, 700)
- **Mono:** JetBrains Mono for code/schema samples
- Scale: hero 4.5rem → body 1rem; weight contrast ≥1.25 between steps

## Motion

- Lenis smooth scroll globally on marketing pages
- Framer Motion: fade-up on scroll (ease-out, 0.5–0.7s)
- Hero dashboard: subtle parallax on mouse/scroll
- Horizontal marquee for domain whitelist strip
- No bounce/elastic; no layout-property animation

## Layout

- Marketing max-width ~1280px; generous section padding
- Dashboard: fixed sidebar (graphite) + ivory content area
