# ChitraBodh V1 — motion-first explainers

Updated 28 October 2026 after the first video review. This refines the visual requirements in the V1 PRD. The next build prioritizes explanation quality over dashboard expansion.

## Product promise

**Describe an idea; ChitraBodh turns it into a narrated explanation that shows how the concept works through motion.** A set of static icons with captions is not enough for a physical process.

## Updated core features

1. **Simple creation:** enter an idea, choose a voice and captions, then Generate. AI creates the script, visual sequence and timing internally. The user does not edit a storyboard.
2. **Motion that explains:** show changes of state, movement, direction and cause/effect. Examples include heat reaching water, vapor rising, droplets forming, rain falling and water flowing downhill. Decorative bouncing alone does not meet this requirement.
3. **Continuous visual context:** retain the same landscape or diagram across related scenes. Spotlight the current process while preserving enough context to see how the parts connect.
4. **Voice-synchronized actions:** derive animation triggers from exact narrated phrases and actual ElevenLabs alignment. Do not start a process before its explanatory cue or use guessed timestamps.
5. **Clear voiceover and captions:** Adam is the current test narrator. Caption groups remain readable on a phone and avoid covering the teaching visual.
6. **Vertical short-video export:** 1080 × 1920 MP4, 60–90 seconds, with audio, preview and download. The result is a linear video, not a clickable interactive lesson; its motion should make it feel engaging and easier to follow.
7. **Honest supported visuals:** the first specialized template is the water cycle. Other subjects use animated diagrams, flow connections and semantic icons. Expand the template catalog based on real topic tests; do not claim arbitrary physical simulations are supported.
8. **Existing operating limits:** one generation at a time for the local build, two-hour temporary media retention, no billing, analytics or brand customization. Instagram posting and scheduling remain a later integration within the retention window.

## First supported motion template: water cycle

| Phase | What the viewer sees | What it teaches |
| --- | --- | --- |
| Overview | Lake, sun, mountains, clouds, rain and river in one landscape | Water follows a continuous cycle |
| Evaporation | Water ripples, heat travels from the sun, schematic particles rise | Solar energy helps liquid water become invisible vapor |
| Condensation | Cloud droplets form and grow as the cloud develops | Cooling moist air produces liquid droplets |
| Precipitation | Drops fall from clouds and reach the surface | Drops or ice particles grow large enough to fall |
| Collection | Moving river flow and downward soil indicators | Water runs downhill or enters the ground |

Particles representing vapor are explicitly labeled schematic because water vapor is invisible. Avoid the misleading statement that an entire cloud becomes too heavy. This is an educational animated illustration, not a physically accurate fluid simulation or photorealistic generated footage.

## Pipeline change

The planner may emit `motion: { kind: "water_cycle", phase, triggerPhrase, occurrence }` for a scene. The validator checks the phase and exact phrase. The timing layer maps that phrase to `motionStart` using the narration alignment. The renderer evaluates all movement from the video frame time, making renders deterministic and avoiding browser animation clocks.

Existing plans without the motion field remain compatible. Their diagram flows now move in the direction of their edges after the target cue; sun, rain, water and vapor symbols also animate. New templates must declare their supported phases and timing contract before the planner can select them.

## Acceptance for this build

- The water-cycle video visibly shows flowing water, rising vapor indicators and falling rain, rather than only fading between icons.
- Two frames from the same active phase show actual displacement of the relevant visual elements.
- Rain, evaporation and collection effects remain inactive before their mapped trigger; only the selected phase or overview runs those effects.
- The visual explanation and narration agree. Scientific accuracy still needs human review; schema validity alone does not establish correctness.
- Captions remain legible, audio plays fully, and the MP4 meets dimensions/duration checks.
- The creator workflow remains unchanged and simple.

## Next template candidates

An electrical circuit with moving current indicators, a food chain with directional energy transfer, and RAM versus storage with data movement. These are candidates, not implemented capabilities.
