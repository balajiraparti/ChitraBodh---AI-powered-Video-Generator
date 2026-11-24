# Design System: Chitrabodh F19 Storyboard Studio

Extends ../DESIGN.md and the existing Daylight Studio Stitch asset. Preserve the user-approved brand over generic skill defaults.

## 1. Visual theme and atmosphere
Warm, clear working studio. Balanced density 5, asymmetric layout 5, restrained interface motion 3. Scenes supply visual interest; interface stays quiet. Match existing top navigation and Moving Chitra brand.

## 2. Color palette and roles
Warm canvas #F7F5EF, white worksheets #FFFFFF, ink #202B27, secondary ink #59665E, borders #D9DED6. Spruce #126B58 is the only interactive accent. Solar #F2C14E and coral #E77B5B belong only inside educational illustrations, preserving the approved brand. Semantic error text may use #BA1A1A.

## 3. Typography
Manrope throughout functional UI, 36px desktop/28px mobile heading, 16px body with 1.5 line height, 14px labels. Short reading lines, tabular timing numbers, no code font for narration. No font redesign.

## 4. Components
44px minimum controls, 10px control radius, 16px preview-panel radius, labeled fields, visible counters and focus rings. Scene rows use numbered portrait thumbnails and dividers. One primary action per state. Candidates show saved/proposed with readable changes and Apply/Discard. Disabled generation always has an explanation. Skeletons during planning, no invented percentage.

## 5. Layout
Desktop top navigation matches existing Create board; asymmetric scene list plus portrait preview/edit area. Max content 1400px, 48px outer margin, 24px gutters. Under 768px use a single column, 20px margin, no horizontal overflow. Separate mobile overview/detail views. Do not shrink desktop timelines onto mobile.

## 6. Motion and interaction
Silent motion preview is explicitly user-played, with pause/scrub and textual description. Final audio timing may vary. Interface transitions use opacity/transform, short 160–220ms easing; no perpetual distracting motion. Reduced-motion disables decorative animation. Preserve keyboard focus after apply. Unsaved edits survive failures.

## 7. Anti-patterns
No code/JSON/model settings, neon, gradients, glass, unrelated photos, emoji, fake progress, forced approval per scene, automatic publication, or misleading final-video download controls. Do not confuse previews with ready videos. Retain established branding instead of inventing another palette.
