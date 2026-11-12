# Stitch implementation comparison

Updated 12 November 2026.

The reference is the owner's downloaded `stitch_chitrabodh_brand_direction_studies` folder, including each `code.html` and `screen.png`. Stitch MCP lists 31 items in project 16810763223132817674. The download contains all 24 numbered boards, three brand studies, three demo boards, and the Daylight design-system file.

## Changes to implemented routes

| Reference | Application | Changes |
|---|---|---|
| Daylight demo homepage desktop/mobile | / | Exported 7:5 hero, portrait illustration, prompt example selector, topic tabs, narration strip and three-step section. Original icon font bundled locally. |
| Expanded demo player | Homepage dialog | Exported water-cycle diagram, narration, accessible native dialog. |
| 01, 02, 24 | /sign-in | Centered white form and original background diagrams. Password registration follows the later approved auth requirement. Board 02's magic-link screen is superseded. |
| 03, 19 | /dashboard | Portrait project cards on desktop and compact rows on mobile. Real state, expiry, pagination and private video preview sources. |
| 04, 19 | Empty dashboard | Two-column introduction and canvas previews with the source empty-project illustration. |
| 05, 20 | /create | Topic editor, narrator selection cards, caption switch, grouped actions and original composition preview. |
| 06, 20 | Create idea panel | Separate right panel on desktop, stacked on mobile, three live suggestions and selection. Opening focuses the prompt. |
| 07, 21 | /jobs/[id] while active | Progress panel and current-stage side panel, live status and cancellation. |
| 08, 22 | /jobs/[id] while ready | Portrait player with adjacent export panel. Private media and two-hour lifetime. |
| 10, 18, 21 | Failed, cancelled and expired jobs | Real recovery messages and links inside the shared Daylight surface. |
| 15, 24 | /settings | Narrator cards, caption switch, timezone and save feedback. |
| Public workspace preview | /preview | Daylight project and canvas surfaces. |

## Design scope and adaptations

The approved Moving Chitra logo remains the product identity. Voice labels reflect the available voice catalog. Manual draft saving reflects the implemented feature. The source's canned success notifications, example account email and sample project records are replaced with real application state. Preview illustrations are labelled as samples.

Boards 09 (revisions), 11–14 (publishing and scheduling), 16 (Instagram connection), and the deletion dialogs in 17 are mapped to planned F13–F18. Their layouts remain the design reference when those features are implemented. Current screens therefore expose the implemented actions. Ready media uses the creator's actual output instead of the stock photos in board 03.

The Daylight reference takes precedence over the Cobalt Lab and Afterlight alternative studies. The copied DESIGN.md preserves the owner's design tokens. The compiled export utilities are scoped to #daylight and work without a Tailwind CDN script.

## Verification

Production build passed. The suite passed 59 tests with three opt-in checks skipped. Browser checks at 1280 × 844 and 390 × 844 covered homepage tab switching and expanded preview, sign-in, private library, settings, create, idea-panel opening, public preview, generation progress and expired recovery. All eight routes at both sizes had no horizontal overflow. Synthetic account and project records were cleaned up. Browser screenshots are retained locally in .cache/design-*.png. This is an implementation comparison, not a pixel-difference score. Future feature boards are not claimed as delivered.

To rebuild the exported utility CSS after editing a template, run Tailwind 3.4.17 with scripts/stitch-tailwind.config.cjs and an input file containing @tailwind utilities. The generated output is dashboard/pages/stitch-utilities.css. The application serves that stylesheet locally.
