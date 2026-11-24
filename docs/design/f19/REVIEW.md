# F19 Stitch design review

Date: 24 November 2026.

Project: [ChitraBodh Brand Direction Studies](https://stitch.withgoogle.com/projects/16810763223132817674).

Design basis: [F19 specification](../../ChitraBodh-Storyboard-Editor-Specification.md), [feature design system](DESIGN.md), existing Daylight Studio asset `assets/cccf862d03db4bc1ab5843a9ab2b459c` and screen 05 Create video. Existing screens are preserved; F19 boards are additive.

## Scope

SB01 planning; SB02 storyboard overview; SB03 scene editor; SB04 saved/proposed comparison; SB05 recovery alternatives; SB06 mobile overview/editor/feedback specimens.

## First-pass findings and refinement

Stitch returned all six requested boards. Visual inspection of SB02 found oversized portrait cards, touching navigation labels, missing visible green primary emphasis and excessive technical language. Requested a six-board correction: compact scene rows, explicit CSS and spacing, one primary Generate action, plain-language labels, no internal feature identifiers, no assumed planning duration/count, and no promised exact voice timing. Original generated boards are not production-ready acceptance evidence.

## Verification boundary

These are design artifacts, not implemented product screens. No live AI editing, narration, storage, publishing, keyboard or responsive browser behavior is proven by screenshots. User design review and implementation QA remain required. The mobile board contains multiple phone specimens; it is not itself a single mobile viewport.

## Stitch screen references

| Board | Screen ID |
|---|---|
| SB01 Planning | `1cf55539fb724bb990ad33d38d67705a` |
| SB02 Storyboard overview | `ed6ac363f0084187ab09a6dfafb3cea3` |
| SB03 Scene editor | `c72d964b076042f9b5825bae28212756` |
| SB04 Review AI changes | `ededcc3a97814e5891d2583258adb91e` |
| SB05 Recovery states | `591798ce163e4526b25e17610f37865c` |
| SB06 Mobile storyboard | `543395710236443db98087c24d47b2b2` |

First refinement returned a dark/unreadable SB02 export despite claiming styling success. A further repair requested embedded CSS independent of Tailwind CDN and screenshot refresh for every screen. Design acceptance requires actual visual inspection, not the generation tool's self-report.

## Brave repair verification — 24 November 2026

The user's Brave tab reproduced External content blocked on SB02, SB05 and SB06. The visible warnings named fonts.googleapis.com connect-src and, on mobile, lh3.googleusercontent.com image requests. Existing 05 Create video rendered in the same project. SB01 still showed internal engineering copy despite prior claimed corrections. A targeted in-place repair was submitted through the Brave Stitch composer, requesting embedded styling/inline SVG and the working screen's font-loading method. No domain permission or browser security setting was changed.

## 25 November — supplied export implementation

The owner subsequently supplied SB01–SB06 HTML and previews in the downloaded `stitch_chitrabodh_brand_direction_studies` folder and requested implementation. These local exports supersede the earlier failed live-generation attempts as the implementation reference. Added the Daylight storyboard page: scene navigation, portrait motion preview, three keyframes, narration/feedback controls, scope selection, saved/proposed comparison and recovery states. This is implementation evidence, not a claim that every viewport has passed visual QA. Manual pixel/layout review remains open.
