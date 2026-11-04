# ChitraBodh — Visual Engine Improvement Guidelines

**Audience:** AI coding agents (and humans) who will improve the video generator.
**Status:** Planning document written 3 November 2026 after a live test run. **Nothing in this document is implemented.** Every "should", "proposed" or "target" below is a requirement for future work, not a description of current behavior.
**Scope:** The visual layer only — shapes, objects, connectors, flowcharts, layout, overlap prevention, motion, transitions, and visual quality assurance. Provider/billing/dashboard work is out of scope except where it affects visuals.

> **Product goal.** Given a topic or a product, produce a short vertical video that helps a viewer understand it faster than text would, using clear illustrations, real-world objects, simple diagrams and purposeful motion that follows the narration. Creators, educators and brand teams should be able to use the result without editing.

---

## 0. How an agent should use this document

1. Read sections 1–3 to understand what is wrong today and why.
2. Pick **one** phase from section 12. Do not start a later phase before the earlier phase's acceptance criteria pass.
3. Before changing code, read the files listed in section 2.4. The renderer and schema are small and tightly coupled.
4. Preserve backward compatibility (section 11). Saved plans and the offline demo must keep rendering.
5. After each change run `npm run typecheck` and `npm test` (no paid calls). Add tests with the change.
6. Use paid providers sparingly (section 11.3). Re-render from a saved plan wherever possible (`src/rerender.ts`).
7. Update this document's status markers (section 13) and the README when a phase lands. Record evidence, not claims.

Status markers used below: **[Implemented]**, **[Proposed]**, **[Verified]**, **[Unverified]**.

---

## 1. Test evidence (what the live run showed)

**Run:** topic "How does photosynthesis work?", Gemini planning + ElevenLabs narration (voice Adam), 3 November 2026.
Run directory (deleted after two hours): `.local-runs/4b325699-8b12-46ab-889e-7531f492ebe3/`.

| Measure | Result |
| --- | --- |
| Output | H.264 MP4, 1080 × 1920, 50.97 s, audio present (validated by the pipeline) |
| Provider calls | 1 Gemini, 1 ElevenLabs |
| Total time | about 3.4 minutes (almost all rendering) |
| Scenes | 4, each an `illustration` with 3–4 objects and exactly 2 actions |
| Script length | 123 words (target in the system prompt is 190–210; accepted minimum is 100) |
| Caption gaps | Only natural sentence pauses (0.5–0.7 s); captions are aligned to speech **[Verified]** |

A second topic, "How does binary search work?", **failed** four times in a row: Gemini repeatedly produced wrong search bounds (`Incorrect left-half elimination`, `Wrong search bounds: expected low=0, high=6`). The pipeline failed safely with no video, but the reliability gap is real.

### 1.1 Observed visual defects

| # | Defect | Where seen | Verified how |
| --- | --- | --- | --- |
| D1 | **Overlapping labels and objects** in the "Water and Minerals" scene: "Upward Flow", "Plant Leaves" and the water block stack on top of one another; the water block overlaps the leaf. | Scene 2 at 28 s | Frame inspected **[Verified]**; geometry reproduced from `plan.json` (section 2.1) |
| D2 | **Arrows start in empty space**, not at the source object. In scene 1 the "Energy" arrow begins far from the sun and ends in the middle of the leaf. | Scene 1 at 4 s and 15 s | Frame inspected **[Verified]** |
| D3 | **The oxygen is a plain white circle** on a pale background: low contrast and not recognizable as a gas. | Scene 4 at 42 s | Frame inspected **[Verified]** |
| D4 | **Large empty areas.** The diagram card is about 900 × 770 px in a 1080 × 1920 frame, with objects small inside it and roughly a quarter of the frame blank above and below. | All scenes | Frames inspected **[Verified]** |
| D5 | **Sparse motion.** Each scene (12–17 s long) has only two animated actions. In scene 1 the first action starts at 4.4 s and the second at 6.8 s; the rest of the 16.8 s is static. | Timeline | `timeline.json` **[Verified]** |
| D6 | **Hard scene cuts.** Only the heading fades in; the illustration jumps. | `Explainer.tsx` | Code read **[Verified]**; playback **[Unverified]** |
| D7 | **Wrong or weak visual metaphors.** Carbon dioxide is drawn as a "Carbon Atom" (an atom icon). Water "moves up" with no roots, stem or tubes visible. Glucose is a labeled teal box. | Scenes 2–3 | Plan and frames **[Verified]** (scene 3 frame was **not** inspected; its overlap risk is computed from the plan, see 2.1) |
| D8 | **Fixed vocabulary.** Only 16 object kinds exist: sun, moon, hill, water, cloud, tree, animal, person, factory, soil, atom, leaf, box, circle, arrow, text. No rectangle/triangle/line primitives, no flowchart shapes, no product objects. | `src/illustration.ts` | Code read **[Verified]** |
| D9 | **Hard-coded branding** ("CHITRABODH", "EXPLAINED SIMPLY", footer tagline) in every video. | `Explainer.tsx` | Code read **[Verified]** |

Not evaluated in this test: audio quality and pronunciation, perceived sync during playback, and the frame for scene 3.

---

## 2. Root-cause analysis (grounded in the code)

### 2.1 Why objects overlap

The Gemini plan for scene 2 contained these objects (centers, sizes in a 900 × 740 canvas):

| Object | Center | Size | Box (x, y) |
| --- | --- | --- | --- |
| `obj_leaf_two` | 500, 250 | 200 × 150 | 400–600, 175–325 |
| `obj_water` (start) | 500, 500 | 120 × 80 | 440–560, 460–540 |
| `obj_water` (after `move` to 500, 350) | 500, 350 | 120 × 80 | 440–560, **310–390** |
| `obj_arrow_water` | start 500, 420 → leaf center 500, 250 | — | label at midpoint ≈ y 321 |

Computed overlaps after the move:

- Water box (y 310–390) overlaps the leaf box (y 175–325) by 15 px.
- The leaf's label is drawn at `y + height/2 + 28 = 353`, i.e. **inside** the water box.
- The arrow label sits at the arrow midpoint (y ≈ 321), directly between the two.
- Scene 3 repeats the pattern: the atom moves to (450, 350) and lands on the start of the "Reaction" arrow at (460, 350).

Why no code stopped it:

| Cause | Location |
| --- | --- |
| Validation only checks that each object's box is **inside the canvas** (and that a move destination is inside the canvas). It never checks object-vs-object, object-vs-label or label-vs-label overlap. | `src/illustration.ts`, `validateIllustration` |
| The planner prompt says labeled objects must be "separated by at least 65 pixels", but **no validator enforces it**, so the model violates it silently. | `src/providers.ts` (visual instruction text) |
| Labels are placed with a fixed formula (`y + height/2 + 28`) and arrow labels at the midpoint. There is no collision test or alternative placement. | `src/video/IllustratedScene.tsx` |
| `move` destinations are validated for bounds only, so an object can legally move onto another object. | `src/illustration.ts` |
| The model is asked to compute pixel coordinates for everything. LLMs are unreliable at spatial layout. | Design |
| There is no automated visual check of the rendered frames. | Pipeline |

### 2.2 Why arrows look wrong

- An arrow is an object with its **own** `x/y` (its start) and a `toId`. The model must guess a start point that touches the source; it usually does not (D2).
- The line is drawn from the arrow's `x/y` to the **center** of the target, so the head ends inside the target rather than at its edge.
- There is no `fromId`, no edge/anchor logic and no routing (elbow, curve).

### 2.3 Why motion feels thin

- The schema asks for at least one `move` or `flow` per scene and allows 1–12 actions, but the model satisfies the minimum with two actions.
- Actions are only `reveal`, `move`, `pulse`, `rotate`, `flow`. Objects are visible from the first frame unless the model explicitly adds `reveal`; the prompt says "use reveal sparingly".
- There is no scene transition system, no staggering, no easing choice, no camera movement, no path motion.

### 2.4 Files to read before changing anything

| File | Role |
| --- | --- |
| `src/illustration.ts` | Zod schema, kinds list, `validateIllustration`, `objectPose` (motion math) |
| `src/video/IllustratedScene.tsx` | SVG drawing of every kind, label placement, arrow drawing |
| `src/video/Explainer.tsx` | Frame layout (header, chapter, heading, 770 px stage, captions, progress), scene switching |
| `src/providers.ts` | Planner prompts, JSON-schema trimming, repair loop, binary-search special case |
| `src/timing.ts` | Maps spoken phrases to action start times via ElevenLabs alignment |
| `src/contracts.ts` | `PlanSchema`, scene rules (one visual engine per scene) |
| `src/pipeline.ts` | Orchestration, retries, duration repair |
| `src/array-story.ts`, `src/video/ArraySearch.tsx` | Binary-search engine |
| `tests/illustration.test.ts`, `tests/pipeline.test.ts` | Existing tests to extend |

---

## 3. Design principles for every visual

1. **Show the thing, not a label for the thing.** Prefer a recognizable object (a bottle, a leaf, a server) to a text box. Text supports the picture.
2. **One idea per scene, one focal object at a time.** Reveal progressively; do not show 10 objects at once.
3. **Layout is deterministic.** The AI chooses *what* to show and *in which relation*. Code decides *where* it goes.
4. **Motion explains.** Every animation must represent something in the narration (a transfer, a transformation, a comparison, an emphasis). Decorative motion is a defect.
5. **Speech drives timing.** Keep the existing rule: actions start on exact spoken phrases mapped by character alignment.
6. **Never overlap.** Overlap is a validation error, not a style choice (section 6).
7. **Readable on a phone.** Minimum label size, minimum contrast, safe areas (section 9).
8. **Fail closed.** If a layout cannot be made valid, repair or reject; never render a known-bad frame.
9. **Evidence over claims.** Every visual improvement needs a fixture plan, a test, and an inspected frame.

---

## 4. Target visual vocabulary **[Proposed]**

The renderer should support three families of drawable objects plus connectors. All are vector (SVG), local, license-free and deterministic. Do not add remote image fetching or unrestricted AI image generation in these phases.

### 4.1 Geometric primitives

| Kind | Notes |
| --- | --- |
| `circle`, `ellipse` | Fill and/or outline |
| `rect`, `rounded_rect` | `cornerRadius` optional |
| `triangle` | Pointing `up`, `down`, `left`, `right` |
| `diamond` | Also used as the flowchart decision shape |
| `pentagon`, `hexagon`, `star` | Optional, for badges and molecules |
| `line` | Straight segment between two points or two objects |
| `curve` | Quadratic or cubic Bezier |
| `bracket`, `brace` | Group annotation ("these three steps") |
| `text` | Free text block with wrap |
| `badge` | Number/letter in a circle for step markers (1, 2, 3) |

Style options for every primitive: `fill` (palette token), `stroke` (palette token), `strokeWidth` (2–8), `strokeStyle` (`solid` | `dashed` | `dotted`), `opacity`.

### 4.2 Connectors (lines and arrows between objects)

A connector references objects instead of raw coordinates:

```ts
{
  id: 'link_sun_leaf',
  kind: 'connector',
  fromId: 'sun', toId: 'leaf',
  fromAnchor: 'auto',            // 'auto' | 'top' | 'right' | 'bottom' | 'left'
  toAnchor: 'auto',
  route: 'straight',             // 'straight' | 'elbow' | 'curve'
  style: 'dashed',               // 'solid' | 'dashed' | 'dotted'
  head: 'arrow',                 // 'arrow' | 'none' | 'dot'
  label: 'Energy',               // optional; placed by the layout engine, never by the model
  color: 'gold'
}
```

Rules:

- The engine computes start and end on the **edge** of each shape (ray-to-bounding-shape intersection), with a small gap (6–10 px) so heads never sit inside a shape.
- `auto` anchors choose the pair of sides with the shortest unobstructed path.
- `elbow` routes use orthogonal segments with a fixed corner radius and avoid other objects' boxes.
- Flow particles (existing `flow` action) travel along the *routed path*, not only a straight line.
- The legacy `arrow` kind (with its own `x/y/toId`) stays supported for old plans (section 11).

### 4.3 Flowchart nodes

| Node kind | Shape | Use |
| --- | --- | --- |
| `terminator` | Pill (rounded rect, full radius) | Start / End |
| `process` | Rectangle | Step |
| `decision` | Diamond | Yes/No branch; connectors from it carry `Yes`/`No` labels |
| `data` | Parallelogram | Input / output |
| `document` | Rectangle with wavy bottom | Report, invoice, record |
| `database` | Cylinder | Storage |
| `subprocess` | Rectangle with side bars | Grouped step |

Flowchart rules: top-to-bottom or left-to-right only; at most 7 nodes per scene; label at most 24 characters; at most one decision per scene in V1; branches converge or end visibly.

### 4.4 Real-world object library

Goal: the planner chooses from a **named catalog** and the renderer draws each item from local SVG. Items are built either as single paths or as **composites of primitives** (so they can be styled by palette and animated by part).

Initial catalog (grouped by use). Existing kinds are marked ✓.

| Group | Objects |
| --- | --- |
| Nature | sun ✓, moon ✓, cloud ✓, rain, snow, wind, mountain, hill ✓, tree ✓, flower, seed, **root**, **stem**, leaf ✓, soil ✓, river, ocean, fish, bird, animal ✓ |
| People & body | person ✓, group of people, heart, brain, lungs, stomach, eye |
| Science | atom ✓, **molecule** (composite of circles and lines, e.g. H₂O, CO₂, O₂), flask, beaker, magnet, battery, thermometer, microscope, DNA |
| Technology | laptop, phone, server, database, chip, wifi, lock, key, camera, gear, globe, cloud-server, code window |
| Commerce and product | package/box ✓ (generic), bottle, can, cup, tube, pouch, bag, shoe, t-shirt, shopping cart, store, warehouse, truck, factory ✓, price tag, barcode, coin, receipt |
| Charts and ideas | bar chart, line chart, pie chart, target, lightbulb, magnifier, megaphone, calendar, clock, check, cross, star, question mark, rocket |

Rules for the catalog:

- Each object declares: `kind`, default aspect ratio, **anchor points** (`top`, `bottom`, `left`, `right`, plus named parts such as `leaf.tip`), an optional `parts` list for part-level animation, and a **contrast-safe default color**.
- Every object must pass a thumbnail review (rendered on `sky`, `paper` and `night` backgrounds at 100 px and 300 px).
- Do not use unclear metaphors. A gas is **not** a cloud and CO₂ is **not** a carbon atom; use a labeled molecule composite (a gray circle between two red circles for CO₂, with a subscripted label). The current prompt already warns about clouds; the molecule composite fixes the atom problem (D7).
- If any third-party icon set is considered later, **verify its license** before adding files (attribution and share-alike licenses are not acceptable by default). Prefer authoring in-repo SVG. Record the license in `docs/design/`.

### 4.5 Palette and contrast

Current tokens are only `teal, blue, green, gold, brown, gray, white`. Proposed additions: `red`, `orange`, `purple`, `ink` (near-black), `sky_light`.

- Shapes must have at least 3:1 contrast against the background; text at least 4.5:1. See `docs/design/contrast-report.md` for the existing method.
- **White on `sky` background is forbidden** for shapes (this is D3). Use a stroke or a darker fill.
- Colors carry meaning consistently within a video (for example blue = water, gold = energy, green = plant, red = CO₂/heat). The planner should declare this once.

---

## 5. Scene composition: templates instead of free coordinates **[Proposed]**

Free-form pixel placement is the main source of overlap. New plans should choose a **layout template** and assign objects to **slots**. The engine computes coordinates, sizes and label positions. Free-form placement remains for legacy plans only.

### 5.1 Templates

Canvas reference: 900 × 740 today. If the stage is enlarged (section 9.1), scale slot coordinates proportionally; define slots as fractions (0–1) of the stage, not pixels.

| Template | Slots | Best for |
| --- | --- | --- |
| `hero` | 1 large center object + up to 3 satellites | Introduction, "what is X" |
| `left_to_right` | 2–4 stages evenly spaced on one row | Process, pipeline |
| `top_to_bottom` | 2–5 stages in a column | Flowchart, step list |
| `cycle` | 3–6 nodes on an ellipse, arrows clockwise | Water cycle, feedback loops |
| `compare_two` | Left and right halves with divider | A vs B, before/after |
| `hub_spoke` | 1 center + 3–6 around | Product features, "components of X" |
| `layers` | 2–5 stacked bands | Architecture, atmosphere, org levels |
| `timeline` | Horizontal axis with 3–6 markers | History, roadmap |
| `anatomy` | 1 large product with numbered callouts | Product explainers |
| `input_process_output` | 3 columns with arrows | Photosynthesis, factories, APIs |

Each template defines: slot rectangles, per-slot maximum object size, connector routes between slots, and where the label goes by default (below, above, or right).

### 5.2 Planner contract

The model returns, per scene:

```json
{
  "layout": "input_process_output",
  "background": "sky",
  "objects": [
    {"id":"water","kind":"water_drop","slot":"in_1","label":"Water"},
    {"id":"co2","kind":"molecule_co2","slot":"in_2","label":"CO₂"},
    {"id":"leaf","kind":"leaf","slot":"process","label":"Leaf"},
    {"id":"o2","kind":"molecule_o2","slot":"out_1","label":"Oxygen"},
    {"id":"sugar","kind":"molecule_glucose","slot":"out_2","label":"Glucose"}
  ],
  "connectors": [
    {"id":"c1","fromId":"water","toId":"leaf","style":"solid","head":"arrow"},
    {"id":"c2","fromId":"co2","toId":"leaf","style":"solid","head":"arrow"},
    {"id":"c3","fromId":"leaf","toId":"o2","style":"dashed","head":"arrow"},
    {"id":"c4","fromId":"leaf","toId":"sugar","style":"dashed","head":"arrow"}
  ],
  "actions": [
    {"targetId":"water","effect":"enter.slide_up","phrase":"roots pull water","occurrence":1},
    {"targetId":"c1","effect":"flow","phrase":"up from the soil","occurrence":1}
  ]
}
```

The model never supplies `x`, `y`, `width` or `height` for templated scenes. It may supply an optional `emphasis: 'large' | 'normal'` per object; the engine maps that to a size within the slot.

---

## 6. Solving overlap: a layered defense **[Proposed]**

No single fix is enough. Implement all five layers; each catches what the earlier one missed.

### Layer 1 — Prevent: templates and slots (section 5)
The model chooses relationships, not pixels. This removes the failure class that produced D1.

### Layer 2 — Place: deterministic label and connector layout
Implement a pure function `layoutScene(scene) → {objects, labels, connectors}` with no randomness and no DOM dependency, so it is unit-testable in Node.

1. **Measure text conservatively.** Estimate width as `chars × fontSize × 0.58` (Arial-like bold), height as `fontSize × 1.25`, wrap at the slot width. Prefer the real font metrics if a font file is bundled; treat estimates as conservative bounds, not exact.
2. **Label candidates** per object, tried in order: below, above, right, left. Choose the first whose label box has no intersection with any object box, any connector segment, or any other label box.
3. **Connector labels** go at 0.5 along the routed path by default, then try 0.35 and 0.65; add a background "halo" (the existing stroke/paint-order trick) as a last resort, not as the first choice.
4. **Connector endpoints** on shape edges with a gap (section 4.2); elbow routes avoid object boxes inflated by the minimum gap.
5. **Z-order** is explicit: background shapes → objects → connectors → labels → callouts. Models may not reorder it, except via an optional `layer` field (`back`, `mid`, `front`).

### Layer 3 — Validate: geometric rules that reject bad plans
Extend validation (a new module, e.g. `src/layout-validate.ts`) so these checks run before narration is requested (no paid ElevenLabs credit is spent on a bad layout):

| Rule | Threshold |
| --- | --- |
| Object bounding boxes (including rotation and `pulse` scale) must not intersect | Minimum clearance **48 px**; target 65 px (the number the prompt already promises) |
| Label boxes must not intersect objects, connectors' strokes or other labels | Clearance 8 px |
| Everything stays within a safe margin of the stage | 40 px |
| `move` and `follow_path` **swept path** must stay clear of other *visible* objects | Sample the path at 12 steps |
| Overlap is evaluated **over time**: use each object's visible interval (enter time → exit time), so a hidden object does not block a visible one | Use action start times from `timing.ts` |
| Maximum simultaneously visible objects | 8 (hard cap 10 as today) |
| Minimum font size | Labels 24 px, headings per stage |
| Minimum distinct visual changes | At least 1 every 3 seconds (section 7.4) |
| Color contrast | Section 4.5 |

Return **structured errors**, not prose, so repair prompts are precise:

```json
{
  "code": "OBJECT_OVERLAP",
  "a": "obj_water", "b": "obj_leaf_two",
  "when": "after move at 16.8s",
  "overlapPx": 15,
  "suggestion": "choose a different slot or set toY >= 420"
}
```

### Layer 4 — Repair: auto-fix before asking the model again
In order, stopping at the first success:
1. Re-run label placement with all four candidates.
2. Nudge the overlapping object along the shortest axis inside its slot (bounded, deterministic iterations).
3. Shrink the larger object by up to 15 percent (never below the minimum size).
4. If it still fails, call the model with the structured error list, reusing the existing repair loop and four-request budget.

### Layer 5 — Verify: rendered-frame QA
Static geometry checks are necessary but not sufficient.
- For each new fixture plan, render stills at **every action start, the end of every action, and scene midpoints** (Remotion still rendering is already used for thumbnails) and store them for review.
- Extend the existing checksum technique from `docs/Prototype-Implementation-Status.md` to confirm frames differ when motion should occur and are identical when nothing should change.
- Keep a **regression fixture** built from this run's scene 2 and scene 3 coordinates (section 2.1). The validator must reject it, and a templated rewrite must pass.
- A human or reviewing agent inspects at least four frames per new video and records the result using the rubric in section 14.

---

## 7. Motion and transitions **[Proposed]**

### 7.1 Principles

- Prefer a few strong, readable motions to many small ones.
- Entrances use easing (ease-out cubic or a damped spring); loops are used only for ambient emphasis (a pulsing sun) and never on the focal object while it is being explained.
- Durations: entrances 0.4–0.8 s, emphasis 0.6–1.2 s, transfers/flows 1.5–4 s, scene transitions 0.4–0.7 s.
- Stagger groups by 0.12–0.25 s per item.
- Never animate more than two things at the same instant unless they are one logical group.

### 7.2 Action catalog (replace and extend `reveal | move | pulse | rotate | flow`)

| Group | Effects | Notes |
| --- | --- | --- |
| Enter | `fade`, `slide_up`, `slide_left`, `slide_right`, `pop` (scale with overshoot), `draw` (stroke draws on, for lines and shapes), `wipe`, `typewriter` | Objects not yet entered are **not visible** (and do not block layout in the time-aware overlap check) |
| Emphasize | `pulse`, `ring` (expanding highlight ring), `shake`, `glow`, `underline`, `dim_others` | `dim_others` lowers opacity of non-focus objects to 0.35 |
| Move | `move` (straight or arc), `follow_path` (along a connector), `orbit`, `swap` | Must respect swept-path rule |
| Transform | `scale_to`, `recolor`, `morph_label` (cross-fade text) | For "grows", "heats up", "becomes" |
| Flow | `flow` (particles along a routed connector), `dash_flow` (animated dash offset) | Particle count and speed configurable (3–6 particles) |
| Exit | `fade_out`, `slide_out`, `shrink` | Free space for the next idea in the same scene |
| Camera | `focus` (zoom 1.0–1.4 and pan to an object, 0.6 s ease) | Optional; never crop labels |

Every action keeps the existing contract: `targetId`, exact spoken `phrase` and `occurrence`, `duration`, plus `effect`. Legacy action names map to the new effects (section 11).

### 7.3 Scene transitions

Currently the scene index switches at `scene.start`, the heading fades up, and the illustration cuts. Proposed scene-level field:

```ts
transition: { in: 'fade' | 'slide_left' | 'wipe_right' | 'zoom' | 'none'; durationSec: 0.4..0.8 }
```

Implementation options (decide with evidence, and record the decision):

1. **Hand-rolled cross-fade/slide** inside `Explainer.tsx`: render the outgoing and incoming scene together during an overlap window and interpolate opacity/translate. No new dependency.
2. **`@remotion/transitions`** (`TransitionSeries`, with `fade`, `slide`, `wipe`, `flip` presentations). This adds a dependency that must match the pinned Remotion version (4.0.539). Verify availability and version compatibility before adopting, and keep `package-lock.json` pinned.

Important: transitions must **not** change when speech-driven actions fire. The incoming scene should begin its transition slightly before `scene.start` (for example 0.3 s earlier) while the narration is still finishing, or the outgoing scene should hold, so audio never talks over a blank stage.

**Shared-element continuity** (phase later): objects that appear in consecutive scenes (for example the leaf) keep their identity and glide to their new slot instead of vanishing and reappearing. This needs a per-scene `persist: [objectId]` field and the layout engine's slot map for both scenes.

### 7.4 Motion density rule

- Every 3 seconds of narration should contain at least one visible change (enter, emphasize, move, transform, flow, or camera).
- Every sentence of narration should map to at least one visual beat. The planner should aim for 4–8 actions per scene for scenes longer than 10 seconds (this run had 2 per scene across 12–17 s; D5).
- Validator: compute the longest gap between action start times within a scene from `timing.ts` output. Reject or request repair if it exceeds 4 s (warn at 3 s).
- Ambient motion (floating particles, drifting clouds, gentle water) may fill the gaps but does **not** count toward the rule.

---

## 8. Making concepts and products understandable

### 8.1 Script-to-visual mapping

Plan each scene as: *hook → concept → example → recap* across the video. For each narration sentence the planner should state the intended visual beat. A sentence with no visual beat should be shortened or merged.

Recommended scene ratios for a 60–75 s video: 1 intro scene (hero), 3–5 explanation scenes, 1 recap scene (the full diagram with labels, with all objects visible).

### 8.2 Concept explainers (educational)

Prefer, in this order:
1. **Real-world analogy** (what a viewer already knows) shown as an object pair: "root = straw".
2. **Cause → effect chain** as a left-to-right template with connectors.
3. **Cycle** for repeating processes.
4. **Comparison** when two things are contrasted.
5. **Numeric/algorithm story** only when values can be generated deterministically (section 10).

### 8.3 Product and brand explainers

Brand manufacturers need videos about a **product**, not only a science concept.

- Use the `anatomy` template: the product in the center, numbered `badge` callouts connected with thin lines, and one callout revealed per narration beat.
- Use `before_after`/`compare_two` for problem vs product.
- Use `left_to_right` for "how it's made" and "how to use it".
- **Brand kit (later phase):** logo, product image upload, primary/secondary color, font, tagline, safe CTA end card. Replace the hard-coded header "CHITRABODH / EXPLAINED SIMPLY" and the footer line (D9) with brand tokens. Uploaded images must be size-limited, type-checked, stored only within the existing retention policy, and displayed through the same layout engine (an image behaves like an object with a bounding box).
- Do not claim product features that were not supplied by the user. The planner prompt must treat user-provided product facts as the only source for specifications, prices and claims; generic marketing superlatives are not acceptable.

### 8.4 Accuracy and honesty

Educational and product content must be factually reviewed by a person before publishing. The system should never invent statistics, certifications or comparisons. This remains a human-review requirement and is **not** solved by better visuals.

---

## 9. Frame layout and safe areas **[Proposed]**

### 9.1 Use more of the screen

Current `Explainer.tsx` layout (1080 × 1920): header at top, chapter label, a heading with `minHeight: 190`, an accent bar, then a stage of 770 px height and 900 px width, captions at `bottom: 270`, progress bar at `bottom: 165`. The stage occupies well under half the frame (D4).

Proposals:
- Enlarge the stage to about 1080 × 1100 (full-bleed horizontally, inside a rounded card with a 24–40 px margin), or reflow the heading to a smaller block so the illustration gets 1000–1150 px of height.
- Keep captions in the lower third but outside the stage so they never cover objects.
- Define the stage in **fractional coordinates** so templates stay valid if the stage size changes.

### 9.2 Safe zones for social platforms

Reels/Shorts/TikTok overlay UI on the bottom (roughly the lowest 250–300 px) and the right edge. Keep captions, labels and any call to action out of those zones. The platform numbers must be rechecked against current platform documentation before they are treated as fixed; treat them as conservative defaults until verified.

### 9.3 Typography

- Headings: at most two lines; shrink-to-fit rather than clipping.
- Labels: 24 px minimum at the 900-wide design scale (about 29 px at 1080 wide), bold, with high contrast.
- At most 3 distinct text sizes in a scene.

---

## 10. Reliability fixes for algorithmic topics **[Proposed]**

The binary-search failure showed that asking an LLM to calculate bounds, midpoints and eliminations is fragile (four attempts, no video).

- **Move the arithmetic into code.** The model supplies only the sorted `values` array and the `target` (and the narration). A deterministic generator in `src/array-story.ts` (or a sibling module) computes `low`, `high`, `mid`, `compare`, `discard_left/right`, `found/not_found` for every step.
- The model's remaining job is to attach each generated step to a spoken phrase. Validate that phrases appear in narration order, exactly as today.
- Apply the same principle to other computed visuals later (sorting steps, stack/queue operations, compound growth): **the model describes, code computes**.
- Improve repair prompts: when validation fails, include the **computed correct values** in the error text rather than only "wrong bounds".
- Keep the existing request budgets. Do not raise them to hide planning weaknesses.

---

## 11. Compatibility, limits and operating rules

### 11.1 Backward compatibility

- Saved `plan.json` files and the offline demo (`npm run demo`) must still validate and render.
- Keep the legacy `IllustrationSchema` kinds, the legacy `arrow` kind (own `x/y` + `toId`), and the legacy actions (`reveal`, `move`, `pulse`, `rotate`, `flow`). Map them internally to the new effects.
- Introduce new capability behind a plan **version** field (for example `illustrationVersion: 2`) rather than mutating the v1 schema in place. Legacy plans without the field use the v1 renderer.
- Maintain the rule that a scene uses one visual engine (`illustration`, `arrayStory` or `motion`) unless you deliberately and testably relax it.
- Keep provider JSON schemas small. The code already trims schemas for provider limits; new enums and fields increase schema size, so test with both Gemini and NVIDIA contracts (the localhost HTTP tests in `tests/`).

### 11.2 Retention and privacy

Generated media is deleted two hours after completion (README, "Temporary storage and limits"). Do not add long-lived storage for images, uploads or renders without a deliberate design decision recorded in the docs.

### 11.3 Cost control for agents

- **Do not** run live generation for every iteration. Use saved plans, `src/rerender.ts` for visual-only revisions (reuses audio and timing without provider calls), `npm run demo`, and fixture plans.
- A live run uses at most 4 storyboard requests and 3 narration requests. Use live runs for acceptance checks only: at most one per topic per phase.
- Never print, log or commit API keys. `.env` values stay local.
- Free-tier voice audio is for non-commercial testing (README). Do not describe output as ready for commercial publication.

### 11.4 What not to build in these phases

Unrestricted image or video generation, physics simulation, 3D, user-uploaded video, multi-language voice, and authentication/dashboard work. These are separate product decisions.

---

## 12. Implementation roadmap

Work in this order. Each phase ends with passing `npm run typecheck`, `npm test`, a rendered review of fixture frames, and updated docs.

### Phase 0 — Quick wins, no schema change
Goal: remove the worst defects from the current engine.
- Add overlap validation to `validateIllustration`: object-vs-object, label-vs-object, label-vs-label using conservative text-size estimates; enforce a 48 px clearance. (This is what the prompt already claims.)
- Validate `move` destinations and swept paths against other objects.
- Draw legacy arrows from the **edge of a source** to the edge of the target; for the legacy kind, if the arrow's start is within the source's box, use the box edge; otherwise reject with a clear message.
- Reject white shapes on `sky`; add the contrast check.
- Update the planner prompt: state the 48 px rule, the motion-density rule, and "use CO₂/O₂ labeled molecule metaphors, not a carbon atom".
- Enlarge the stage in `Explainer.tsx` and increase the object size minimums.
- Add the scene 2 / scene 3 regression fixtures.

**Acceptance:** the fixture from this run is rejected with structured errors; a corrected fixture passes; no overlap in any rendered fixture frame; existing 30 tests still pass.

### Phase 1 — Primitives, connectors, layout templates
- Add the primitive kinds (4.1), the `connector` kind (4.2) and the layout templates (5.1) behind `illustrationVersion: 2`.
- Implement `layoutScene` (section 6, Layer 2) as a pure module with unit tests.
- Update the planner prompt and JSON schema to the templated contract (5.2).

**Acceptance:** for each template, three fixture plans lay out without overlap; connectors touch shape edges; label placement chooses a different candidate when the first collides (tested).

### Phase 2 — Animation catalog and transitions
- Implement the enter/emphasize/move/transform/flow/exit actions (7.2) with easing helpers shared by renderer and validator.
- Implement scene transitions (7.3), choosing between hand-rolled and `@remotion/transitions` with a written decision.
- Add the motion-density validator (7.4).

**Acceptance:** an average of at least one visible change per 3 s on the four standard topics; scene cuts are no longer instantaneous; speech-trigger timing is unchanged (tests from `timing` still pass).

### Phase 3 — Real-world object library and composites
- Add catalog objects (4.4) in priority order: roots/stem, water drop, molecules (H₂O, CO₂, O₂, glucose), bottle, laptop, phone, server, database, truck, package, price tag, charts.
- Add contrast-safe defaults and extended palette (4.5).
- Build a gallery page or script that renders every object on three backgrounds for review (a developer tool; not part of the product UI).

**Acceptance:** the photosynthesis scene shows root, stem, leaf, water drops and labeled CO₂/O₂ molecules; a reviewer can identify each object at 100 px.

### Phase 4 — Flowcharts and product templates
- Add flowchart nodes (4.3), the `decision` branches, and `anatomy`, `compare_two`, `hub_spoke`, `timeline` templates.
- Add an elbow connector router that avoids object boxes.

**Acceptance:** "How UPI payment works" (flow with a decision), "How a reusable bottle keeps drinks cold" (anatomy) and "Solar vs wind" (compare) pass overlap validation and the rubric (section 14).

### Phase 5 — Deterministic generators and visual QA
- Deterministic binary-search steps (section 10).
- Automated frame-sampling harness (Layer 5), producing a contact sheet per run for faster review.

**Acceptance:** binary search succeeds in at least 9 of 10 trial plans using mocked providers; contact sheet is generated for fixture runs.

### Phase 6 — Brand kit
- Brand tokens, logo/product image placement through the layout engine, end card. Requires its own design note (storage, privacy, file validation).

---

## 13. Status tracker (update as work lands)

| Item | Status |
| --- | --- |
| Live run evidence and defect list (section 1) | **[Verified]** 3 Nov 2026 |
| Overlap validation (Phase 0) | Not started |
| Edge-anchored arrows (Phase 0) | Not started |
| Enlarged stage / better space use (Phase 0) | Not started |
| Primitives, connectors, templates (Phase 1) | Not started |
| Animation catalog and transitions (Phase 2) | Not started |
| Real-world object library (Phase 3) | Not started |
| Flowcharts and product templates (Phase 4) | Not started |
| Deterministic binary search + frame QA harness (Phase 5) | Not started |
| Brand kit (Phase 6) | Not started |

---

## 14. Review rubric for any generated video

Score each criterion 0 (fails), 1 (acceptable), 2 (good). A video is **acceptable** with no zeros on criteria A–D and a total of at least 16 of 24.

| ID | Criterion | What to check |
| --- | --- | --- |
| A | Overlap | No object, label or connector overlaps at any sampled time |
| B | Legibility | Labels readable on a phone-size preview; contrast per 4.5; captions not covering objects |
| C | Concept clarity | A viewer unfamiliar with the topic can restate it after watching; metaphors are not misleading |
| D | Accuracy | Facts reviewed by a person; no invented claims |
| E | Object recognizability | Each real-world object is identifiable without its label |
| F | Visual-script alignment | Each sentence has a visual beat; actions land on the spoken phrase (± 0.3 s) |
| G | Motion density | At least one visible change every 3 s; motion explains something |
| H | Transitions | Scene changes are smooth and never hide speech-linked action |
| I | Use of space | Focal object is large; no unexplained empty areas |
| J | Consistency | Same color, shape and position for the same concept across scenes |
| K | Pacing | 40–90 s, no static stretch longer than 4 s |
| L | Brand fit | Header, colors and tone match the brand when a brand kit is supplied |

Record each review in `docs/Prototype-Implementation-Status.md` with: run ID, topic, scores, frames inspected, and what was **not** verified (audio, motion playback).

### 14.1 Standard test topics

Use all of these when validating a phase (with mocked providers where possible, live for acceptance only):

| Topic | Tests |
| --- | --- |
| How does photosynthesis work? | Input→process→output, molecules, roots/stem/leaf (this run's baseline) |
| The water cycle | Cycle template, existing demo |
| How does binary search work? | Deterministic array story |
| How does UPI payment work? | Flowchart with a decision, app/bank objects |
| How does a reusable bottle keep drinks cold? | Product anatomy with callouts |
| Solar vs wind energy | Comparison template |
| How a T-shirt gets from cotton to your door | Left-to-right pipeline with real-world objects (truck, factory, store) |
| How do vaccines train the immune system? | Abstract concept, analogy objects, body parts |

---

## 15. Definition of done for a visual-engine change

- [ ] Typecheck and all tests pass, including new tests for the change.
- [ ] A fixture plan exercises the change and its failure mode.
- [ ] At least four rendered frames were **looked at** (not only checksummed), covering before/after of a motion.
- [ ] No known overlaps in sampled frames (rubric A).
- [ ] Legacy plans and the offline demo still render.
- [ ] README and this document's status table are updated; anything not verified is stated.
- [ ] No keys, run output or personal data were committed.
