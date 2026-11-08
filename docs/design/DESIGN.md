# ChitraBodh — candidate design systems

Status: Daylight Studio accepted as the working application direction following the user's review; individual screens remain review drafts. Updated 3 November 2026.

Stitch project: https://stitch.withgoogle.com/u/1/projects/16810763223132817674?pli=1

The original three boards remain reference alternatives, not simultaneous application themes. New application screens use Daylight Studio consistently. The source specification is [Brand Directions](../ChitraBodh-Brand-Directions.md); machine-readable colors are in [brand-tokens.json](brand-tokens.json). Stitch output requires review against these specifications before implementation. See [screen inventory](Application-Screen-Inventory.md) for route and state coverage.

## Atmosphere

Pictures should lead to understanding. The interface should feel like a thoughtful creative studio: approachable, precise and calm. Show purposeful educational diagrams instead of decorative AI imagery. Working tagline: “Ideas in motion. Made clear.”

## Palette roles

| Candidate | Canvas | Surface | Ink | Main action | Illustration accents |
|---|---|---|---|---|---|
| Daylight Studio | #F7F5EF | #FFFFFF | #202B27 | #126B58, white labels | #F2C14E, #E77B5B |
| Cobalt Lab | #F3F5F9 | #FFFFFF | #18243E | #3155D9, white labels | #C5E76B, #9DADEB |
| Afterlight | #141C24 | #202C37 | #F0F4EE | #B9F27C, dark labels | #A6B6FF |

Use one dominant action color. Illustration accents do not replace semantic success/error states. Recheck contrast for generated variations and all interactive states.

## Typography

Daylight uses Manrope for all application UI and headings; Instrument Serif italic is reserved for a brief editorial emphasis on marketing/auth artwork, never software forms or dashboard controls. Cobalt and Afterlight reference boards use Space Grotesk headings with Manrope body/UI. Labels and captions remain sans-serif. Use tabular numerals where values change. Application scale: 32px page title, 24px section title, 16px body, 14px metadata; body line height 1.5 and prose width at most 65ch.

## Components

Minimum interactive target 44px. Inputs need persistent labels, visible borders and focus indication. Daylight: 10px control / 16px media corners. Cobalt: 8px / 12px. Afterlight: 12px / 16px. Keep the primary action explicit: “Create video”. Separate preview from publishing in later application screens.

## Layout

Use asymmetric editorial compositions and generous breathing room around diagrams. Keep reading order clear. Collapse to one column on small screens without horizontal overflow. Treat the current boards as brand specimens, not functional product screens. Do not introduce billing or analytics; registration uses the product's email/password authentication flow.

## Motion

Animate relationships: water-cycle arrows, array comparisons, scene progress and narration synchronization. Prefer transform and opacity. Respect reduced-motion preferences and provide static explanatory states. Avoid perpetual decorative loops. Diagrams need text labels as well as color.

## Anti-patterns and review

No glowing orbs, glassmorphism, stock robots, sparkle badges, gratuitous 3D, fake metrics or testimonials. Avoid generic centered heroes and repeated equal-card feature rows. Check wording, diagram accuracy, contrast, font loading and responsive behavior before implementation. Candidate marks are provisional, not trademark-cleared logos. Do not treat a generated screenshot as evidence of working animation or video generation.

For the production product mark, follow [Moving Chitra](Moving-Chitra-Logo.md). This replaces the provisional Daylight frame-and-dot mark.
