# ChitraBodh — Brand and Visual Directions

**Date:** 1 November 2026 · **Version:** 0.1 exploration · **Decision:** no direction selected yet.

Companions: [visual comparison board](design/chitrabodh-brand-board.html), [Stitch prompts](design/ChitraBodh-Stitch-Prompts.md), [PRD](ChitraBodh-V1-PRD.md), [application architecture](ChitraBodh-Dashboard-System-Design.md). This defines candidate brand systems before homepage design; it does not change application code or exported video styling.

## 1. What the brand should mean

ChitraBodh connects **picture and understanding**. Its promise is not simply more video: it helps someone see how an idea works. The working tagline remains **“Ideas in motion. Made clear.”**

Brand personality: curious, articulate, imaginative, dependable. A thoughtful visual studio with the precision of a learning tool. It should welcome an educator who has a topic but no animation expertise, while giving a creator confidence in the output.

Translate that philosophy into design:

| Product principle | Visual consequence |
|---|---|
| Understanding comes first | Clear type hierarchy, one focal point per section, generous space around explanations |
| Motion teaches | Arrows, paths, progressive states and highlighted relationships carry meaning |
| One idea starts the process | One strong primary action; avoid an intimidating tool console |
| AI works behind the scenes | Show the topic and outcome, rather than model names or decorative AI symbols |
| Creators stay in control | Distinct preview/publish actions, truthful progress, explicit expiry and recovery |
| Indian origin, broad audience | Respect the name; optional correctly typeset चित्रबोध in brand storytelling, not ornamental pseudo-Devanagari |

“Futuristic” should come from precise composition, responsive behavior, and well-resolved motion. Large glow effects, glass panels and floating geometric clutter would weaken the calm learning experience.

## 2. Three visual directions

These are alternatives, not three simultaneous themes. Choose one coherent system before building screens. The recommendations are design judgments, not market research or user-test results.

### A — Daylight Studio · recommended starting point

**Character:** warm, editorial, intelligently playful. A contemporary creative studio that makes complex topics approachable.

| Token | Color | Role |
|---|---|---|
| canvas | `#F7F5EF` | Warm paper background |
| surface | `#FFFFFF` | Inputs and selected functional surfaces |
| ink | `#202B27` | Primary text and wordmark |
| muted | `#59665E` | Supporting copy |
| primary | `#126B58` | Main actions, links, selected controls |
| highlight | `#F2C14E` | Sun, point of emphasis, limited marker fills |
| secondary accent | `#E77B5B` | Small illustration details, never default error color |
| divider | `#D9DED6` | Nonessential separators; not the sole input boundary |
| control edge | `#7C887F` | Input boundary and unselected controls |

**Typography:** Manrope 400/500/600/700 for product UI and main display. Instrument Serif italic sparingly for one short editorial emphasis such as “make sense”; never for form labels, navigation, captions or dense explanation. UI numbers use Manrope tabular numerals.

**Composition:** asymmetric editorial blocks, open whitespace, warm backgrounds, precise green controls, diagrams resembling well-designed textbook illustrations. Small yellow emphasis gives life without becoming an all-yellow website. Rounded rectangles are moderately soft, not bubbly.

**Signature motif:** a small circle moves through open frame brackets and comes into alignment. It expresses an idea becoming understandable. Use as a simple candidate mark and section motif, not a final trademark-cleared logo.

**Best fit:** educators and creators together; approachable first impression; comfortable longer dashboard use.

**Risk:** too much serif or paper treatment could look like a publishing site. Keep approximately 90% of UI typography sans-serif and use actual motion-diagram specimens to make the product category clear.

### B — Cobalt Lab

**Character:** crisp, capable, systematic. A modern design and explanation tool with strong technical clarity.

| Token | Color | Role |
|---|---|---|
| canvas | `#F3F5F9` | Cool near-white workspace |
| surface | `#FFFFFF` | Functional surfaces |
| ink | `#18243E` | Primary text |
| muted | `#55617A` | Supporting text |
| primary | `#3155D9` | Buttons, links, focus and active step |
| highlight | `#C5E76B` | Selected diagram item, highlighter accent |
| secondary accent | `#9DADEB` | Limited illustration support |
| divider | `#D8DEEA` | Nonessential separators |
| control edge | `#79859D` | Input/control boundary |

**Typography:** Space Grotesk 500/600 for headlines and section titles; Manrope 400/500/600 for reading and UI. Use tabular figures for steps and durations. Monospaced labels only for diagram indices, not whole pages.

**Composition:** stronger grid, straight alignment, slightly squarer 8px controls and 12px panels. Typographic step numbers, array boxes and connective paths form the design language. Cobalt is used with discipline; lime stays inside deliberate highlights.

**Signature motif:** an ordered sequence of three modules, with one selected module connecting to a clear result. The geometry can inform navigation indicators, teaching visuals and small loading sequences.

**Best fit:** strongest expression of technical precision and a clean professional SaaS application.

**Risk:** can become a generic developer dashboard. Keep people-facing copy, large visual examples and an expressive heading rhythm; avoid an excess of tables, grids and micro-labels.

### C — Afterlight

**Character:** cinematic, focused, quietly futuristic. A dark creative workspace with a luminous but restrained signal color.

| Token | Color | Role |
|---|---|---|
| canvas | `#141C24` | Deep graphite background |
| surface | `#202C37` | Raised controls and panels |
| ink | `#F0F4EE` | Primary text |
| muted | `#A9B5B7` | Supporting text |
| primary | `#B9F27C` | Mint-lime actions; dark text on fill |
| primary foreground | `#141C24` | Button labels |
| highlight | `#A6B6FF` | Secondary diagram path or frame |
| divider | `#354553` | Nonessential separators |
| control edge | `#70828F` | Form/control boundary |

**Typography:** Space Grotesk 500/600 for strong, compact display; Manrope 400/500 for controls and copy. No thin gray text and no neon-outline fonts.

**Composition:** large dark negative space, a few deliberate light surfaces and glowing-color *fills*, not blurry glows. Video frames and timed paths are dominant. Use 12px controls and 16px media frames. Keep shadows minimal because separation comes from surface values.

**Signature motif:** a time path passing through a sequence of keyframes. A single highlighted node indicates the moment an idea becomes clear.

**Best fit:** strongest cinematic and futuristic impression; compelling video preview stage.

**Risk:** could feel like an AI/video template or gaming product; dark workspaces also need careful reading comfort. It is the most demanding direction to keep restrained and distinctive.

## 3. Recommendation and selection criteria

Start with **A — Daylight Studio**. The combination of warm paper, deep green, purposeful yellow and restrained editorial type communicates creativity and educational clarity without making the product feel childish. It is also a good match for the name ChitraBodh.

Choose B if the desired impression is primarily precise and technical. Choose C if cinematic presence matters more than daytime reading comfort. Do not combine all three palettes or type systems. A dark video-player stage within A is possible without making the entire product a separate dark theme.

Review each board against four questions:

1. Does this feel like a tool I would trust to explain a topic clearly?
2. Does it feel creative without distracting from the actual video?
3. Can the same visual language support forms, job errors and a video library?
4. Would I still enjoy using it after an hour, not just on a hero screenshot?

Select the overall direction first. Small accent adjustments can follow; avoid deciding only by favorite swatch.

## 4. Shared typography, spacing and components

### Typography scale

| Role | Desktop | Mobile | Weight / line height |
|---|---|---|---|
| Homepage hero | 64–80px | 40–48px | 500–600; 1.02–1.10 |
| Page title | 32–40px | 28–32px | 600; 1.15–1.25 |
| Section heading | 24–28px | 22–24px | 600; 1.2–1.3 |
| Main body | 16–18px | 16px | 400–500; 1.5–1.65 |
| Form/control label | 14–16px | 14–16px | 500–600; 1.4 |
| Supporting label | 12–14px | 12–14px | 500; 1.4 |

Use sentence case. Restrict all caps to short section markers with modest tracking. Keep reading lines around 45–70 characters. Never fit important labels by reducing them to tiny text. Homepage editorial typography must not leak into operational job-status or error screens.

Use a 4px spacing unit: 4, 8, 12, 16, 24, 32, 48, 64, 96. Typical content width 1200–1280px; desktop gutters32px, mobile20px. Desktop homepage uses an underlying12-column grid; dashboard uses a clear navigation rail and content region. Mobile collapses to one readable column. Avoid wrapping every paragraph in a card.

Buttons: primary filled in brand action color; secondary outlined or quiet neutral; text action for low emphasis. Target height44–48px with comfortable touch area. Small icons20–24px with consistent stroke weight; optional larger illustration strokes should belong to the diagram system. One primary action per decision area.

Form fields: real visible label above the field, semantic hint below, clear boundary, distinct focus ring, inline error text. Placeholder text never replaces labels. Forms and job states must remain useful without color. Pending buttons retain action text with a small status indicator, not only a spinner.

Radius tokens: A controls10px/panels16px; B controls8px/panels12px; C controls12px/panels16px. Pills only for short tags/toggles, not every surface. Elevation is occasional and soft; prefer whitespace and value contrast over stacks of shadows.

## 5. Motion, illustration and product imagery

The brand's strongest visual asset should be an understandable teaching diagram. Use the same vocabulary as the product: sun, hill, moon, water, array boxes, nodes, arrows and labels. Maintain consistent stroke, coordinate system and corner treatment. A visual should show a cause, movement, comparison or sequence; do not sprinkle unrelated icons around the page.

UI motion:120–180ms for feedback;180–260ms for simple panel transitions; gentle ease-out. A homepage teaching demonstration can run a deliberate4–6second sequence with an obvious replay control. Do not animate background noise continuously. Respect reduced-motion settings; use a stable meaningful end frame instead of blanking the visual. No autoplay audio.

Brand boards contain **illustrative design specimens**, not newly AI-generated videos or proof of product capability. Use actual current video samples later and label them accurately. Do not draw a video player that pretends a still image is a playable result.

No stock robot, magic wand, floating brain, generic sparkle, oversized gradient orb or irrelevant3D object as the central identity. Avoid fake social proof, invented statistics and fabricated customer logos. Distinctiveness comes from the product's diagram language, typography and thoughtful composition.

## 6. Semantic colors and accessibility

Brand accent is not a status system. For light directions, proposed status pairs are success `#16644E` on `#E8F3ED`, warning `#805000` on `#FFF4D8`, error `#A52C36` on `#FCECEF`, information `#294EAA` on `#EDF2FF`. Pair every status with an icon/label. For C, use a dark neutral status surface with legible light semantic text after separate contrast testing; do not paste light-theme badge tokens into dark panels.

Text aims for at least4.5:1 contrast, or3:1 for qualifying large text. Essential control boundaries/focus indicators need sufficient contrast too; decorative dividers do not serve as the only boundary. Yellow, coral and pale periwinkle are illustration/highlight fills with dark text, not small colored text on white. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

The delivered contrast report checks the main specified text/button pairs. This is palette validation, not a declaration that the unbuilt application meets WCAG. Final components need keyboard, zoom, focus, screen-reader, responsive, state and color checks.

## 7. Brand voice and copy

Write as a clear, helpful creative partner. Specific, short and calm. Use “Create video,” “Choose a voice,” “Your video is ready,” and “Available until4:30PM.” Use “Try a simpler explanation” or “Describe a change” rather than technical editing terminology.

Suggested homepage line: **“Make ideas make sense.”** Supporting line: “Turn a topic into a clear, narrated explainer—with diagrams that move with your voiceover.” Existing tagline: “Ideas in motion. Made clear.”

Do not claim instant generation, guaranteed factual correctness, automatic viral reach, unlimited credits, or universal topic support. Keep “AI” factual and secondary to the explanation. Scheduling and Instagram claims on a future homepage must match actual release readiness.

## 8. Homepage exploration after selection

The next build should be one homepage with enough real detail to judge the brand, not all screens at once:

1. Restrained wordmark/navigation; one clear sign-in or creation entry appropriate to the internal pilot.
2. Editorial hero and one meaningful diagram/video example.
3. A concise three-stage story: idea → generation → preview/share.
4. A few honest sample topics showing process, algorithm and comparison visuals.
5. A focused closing action; no pricing cards, invented testimonials, waitlist collection or public-signup promise.

Review desktop and mobile, button/form specimens, loading/error/expiry styles and one video preview before extending to dashboard screens. “Homepage” here means a product-introduction exploration; the logged-in creator dashboard remains a separate later screen.

## 9. Font sources and handoff

Candidate font files are bundled alongside the board so the visual specimen can render without remote font requests. Preserve the corresponding font license files. Verify deployment font subsets/performance before shipping.

- [Manrope in Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope)
- [Space Grotesk, designer source](https://floriankarsten.github.io/space-grotesk/)
- [Instrument Serif in Google Fonts](https://github.com/google/fonts/tree/main/ofl/instrumentserif)

Deliverables: palette/type comparison board, this guideline draft, machine-readable candidate tokens, contrast report, and three reusable Stitch prompts. Do not mark a direction approved until the founder selects it.

Stitch status for this exploration: browser-control initialization failed with “failed to write kernel assets: The system cannot find the path specified. (os error3).” No Stitch project was created or modified. Local specimens and prompts are ready to review and transfer once browser access is available.
