---
name: Daylight Studio
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c18'
  on-surface-variant: '#3f4945'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#6f7975'
  outline-variant: '#bec9c4'
  surface-tint: '#116b58'
  primary: '#005142'
  on-primary: '#ffffff'
  primary-container: '#126b58'
  on-primary-container: '#9ae8d0'
  inverse-primary: '#87d5be'
  secondary: '#546159'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3d9'
  on-secondary-container: '#59665e'
  tertiary: '#3e4945'
  on-tertiary: '#ffffff'
  tertiary-container: '#55615c'
  on-tertiary-container: '#cfdcd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f2da'
  primary-fixed-dim: '#87d5be'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#005141'
  secondary-fixed: '#d8e6dc'
  secondary-fixed-dim: '#bccac0'
  on-secondary-fixed: '#121e18'
  on-secondary-fixed-variant: '#3d4a42'
  tertiary-fixed: '#d9e5df'
  tertiary-fixed-dim: '#bdc9c3'
  on-tertiary-fixed: '#131e1a'
  on-tertiary-fixed-variant: '#3e4945'
  background: '#fbf9f3'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dd'
typography:
  display:
    fontFamily: Manrope
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  editorial-callout:
    fontFamily: Newsreader
    fontSize: 1.375rem
    fontWeight: '400'
    lineHeight: 1.875rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Manrope
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  label-md:
    fontFamily: Manrope
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.125rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Manrope
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies a warm editorial studio aesthetic, uniting rigorous technical synthesis with natural tactile clarity. Designed for knowledge workers, architects of thought, and technical researchers, the interface rejects neon futurism, skeuomorphic gloss, and glassmorphic blurs in favor of considered physical print dynamics: crisp paper, rich ink, and generous breathing room.

Key attributes:
- **Quiet Authority**: Typography and layout dominate over decorative chrome. Visual hierarchy relies on asymmetric proportions, scale, and disciplined contrast.
- **Organic Precision**: Technical instruments and schematics are framed inside warm parchment-toned surfaces, making dense concepts legible and humane.
- **Truth in Presentation**: No artificial status metrics, vanity charts, or synthetic lighting effects. Every visual mark serves cognitive comprehension.

## Colors

The palette is anchored by earthen, mineral tones that reduce eye fatigue during long analytical sessions while maintaining clear semantic boundaries.

- **Canvas (`#F7F5EF`)**: Warm daylight cream functioning as the universal background.
- **Surface (`#FFFFFF`)**: Pure crisp paper white reserved for elevated cards, modal panels, and reading sheets.
- **Primary Ink (`#202B27`)**: Deep Studio Ink for headlines, prominent metrics, and high-priority textual data.
- **Secondary Ink (`#59665E`)**: Sage Muted for supportive running text, captions, metadata, and structural label indicators.
- **Interactive Accent (`#126B58`)**: Deep Spruce dedicated to interactive primary triggers, focus states, and hyper-legible text links. Always pairs with `#FFFFFF` for interior glyphs or text.
- **Dividers & Hairlines (`#D9DED6`)**: Subdued mineral line weight separating functional zones without breaking reading flow.
- **Input Borders (`#7C887F`)**: Grounded neutral stroke providing clear boundaries for editable components under daylight conditions.
- **Restricted Diagrammatic Accents**:
  - `Sun Solar (#F2C14E)`: Exclusively reserved for nodal focal points, solar highlights, and directional vectors within technical schematics.
  - `Terra Coral (#E77B5B)`: Exclusively reserved for state deltas, heat anomalies, and callout coordinates within illustrations.
  - *Strict Rule*: Neither `#F2C14E` nor `#E77B5B` may ever be used as backgrounds for buttons, badges, chips, or interactive containers.

## Typography

The typographic hierarchy prioritizes structural balance through `Manrope`, complemented by restrained, italicized serif moments (`Newsreader` in place of Instrument Serif when drawing from standard library sets) for poetic editorial emphasis.

- **Primary Structure (`Manrope`)**: Employs geometric yet humanized proportions. Display, headline, and body levels emphasize precision and neutrality.
- **Editorial Accent (`Newsreader Italic`)**: Applied with strict discipline. Reserved exclusively for pull quotes, short poetic chapter summaries, or brief context markers. It must never be applied to navigation, buttons, functional field labels, or tabular figures.
- **Rhythm & Numbers**: Numerical and data tables must utilize proportional tabular figures with explicit alignment. Label styles favor tracked-out uppercase or medium-weight sentence case to delineate functional status without visual clutter.

## Layout & Spacing

The layout philosophy uses an asymmetric editorial canvas grounded on an 8pt vertical grid. Spacing is intentionally generous to evoke curated print publications and analytical notebooks.

- **Grid Architecture**:
  - **Desktop (1200px+)**: 12-column asymmetric layout with `3rem` margins and `1.5rem` gutters. Primary content panels frequently follow a 5:7 or 8:4 ratio to avoid mechanical monotony.
  - **Tablet (768px - 1199px)**: 8-column layout with `2rem` margins and `1.25rem` gutters.
  - **Mobile (<768px)**: 4-column layout with `1.25rem` margins and `1rem` gutters. Side-by-side elements collapse into sequential vertical stacks.
- **Whitespace Allocation**: Generous whitespace (`space-xl`) between topical chapters creates room for digestion. Micro-level gaps (`space-xs`, `space-sm`) inside forms and controls preserve tight grouping of related metadata.

## Elevation & Depth

This system avoids heavy drop shadows, synthetic glow, and blurred glass. Depth is established through crisp surface layering, tone changes, and precise hairlines.

- **Planar Stacking**: Base canvas sits on `#F7F5EF`. Active worksheets, modular cards, and contextual drawers rise to `#FFFFFF`.
- **Structural Outlines**: Depth boundaries are defined primarily with a 1px solid stroke of `#D9DED6`.
- **Low-Contrast Ambient Foundation**: When floating drawers or utility dropdowns require separation over live text, use an ultra-diffused, desaturated shadow: `0 4px 20px -2px rgba(32, 43, 39, 0.04), 0 2px 6px -1px rgba(32, 43, 39, 0.02)`.
- **Overlay Philosophy**: Modals dismiss background noise with a solid flat scrim tinted to `#202B27` at 28% opacity, keeping the environment quiet and undistracted.

## Shapes

Shapes reflect precision-cut paper and refined physical tools.

- **Control Radii (10px)**: Buttons, text fields, chips, selectors, and dropdown toggles adopt a strict 10px radius (`border-radius: 10px`), ensuring tactile comfort while maintaining geometric discipline.
- **Media & Panel Radii (16px)**: Content cards, diagram framing viewports, and structural canvas modules employ a 16px radius (`border-radius: 16px`).
- **Touch Target Enclosure**: Interactive controls must maintain a minimum bounding box of 44x44px regardless of visual border-box size to ensure high ergonomics across touchscreens and desktop pointing devices.

## Components

### Buttons
- **Primary**: Background `#126B58`, text `#FFFFFF`, border none, height 44px, padding 0 20px, radius 10px. Hover state shifts background to `#0F5546`. Active state scales subtly down to 0.99.
- **Secondary / Studio Stroke**: Background `#FFFFFF`, text `#202B27`, border 1px solid `#D9DED6`, height 44px, padding 0 20px, radius 10px. Hover background shifts to `#F7F5EF`.
- **Subtle / Ghost**: Background transparent, text `#59665E`, padding 0 16px, height 44px, radius 10px. Hover text shifts to `#202B27` with background `#D9DED6` at 30% opacity.

### Input Fields & Controls
- **Text Inputs**: Height 44px, background `#FFFFFF`, border 1px solid `#7C887F`, radius 10px, padding 0 14px, typography `body-md` in `#202B27`. Placeholder text in `#59665E` with 60% opacity. Focus state applies a 1px solid ring of `#126B58` with no external colored bloom.
- **Checkboxes & Radios**: Minimum 20x20px visual square (checkbox) or circle (radio), centered within a 44x44px touch target. Unchecked border is 1.5px solid `#7C887F` on `#FFFFFF`. Checked state fills `#126B58` with a `#FFFFFF` checkmark or center pip.

### Chips & Badges
- **Context Chips**: Height 32px, background `#FFFFFF`, border 1px solid `#D9DED6`, radius 10px, typography `label-md` in `#59665E`.
- **Active Filter State**: Background `#202B27`, border 1px solid `#202B27`, text `#FFFFFF`.
- *Constraint*: Solar and Coral accents are forbidden on chip components.

### Cards & Panels
- **Standard Card**: Background `#FFFFFF`, border 1px solid `#D9DED6`, radius 16px, padding `space-lg` (24px).
- **Interactive Card**: Same baseline, transitioning on hover to a 1px border of `#7C887F` with a soft translation of -1px on the Y axis.

### Lists & Tables
- **Editorial Data Rows**: Border-bottom 1px solid `#D9DED6`, padding 16px 0. Alternate row striping is prohibited; zebra patterns are replaced by generous whitespace and subtle hover highlights on desktop (`#F7F5EF`).
- **Table Headers**: Typography `label-sm` in `#59665E`, tracking 0.06em, text-transform uppercase, padding-bottom 8px.

### Diagram & Schematic Frames
- **Viewport Canvas**: Outer container border 1px solid `#D9DED6`, radius 16px, background `#FFFFFF`.
- **Accent Application**: Data paths, nodes, and schematic vectors may leverage Sun Solar (`#F2C14E`) and Terra Coral (`#E77B5B`) exclusively to communicate technical status, flow polarity, and categorical divergence.
