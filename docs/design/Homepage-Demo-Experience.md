# ChitraBodh homepage demo experience

Design exploration — 2 November 2026. Daylight Studio is the working candidate, not a confirmed brand choice.

## Purpose

Let a visitor understand the output before committing to video creation. Place a large vertical demo beside the hero copy, with the original topic visible below it. Actual output should carry the visual argument; avoid decorative motion that competes with it.

Stitch project: https://stitch.withgoogle.com/u/1/projects/16810763223132817674?pli=1

Created in Stitch: desktop homepage, expanded demo viewer, mobile homepage. The original three brand explorations remain. These screens specify interactive controls; working playback and prototype navigation have not been verified. The current asset is an illustrated preview, not a generated video.

## Demo content and states

- Water cycle and linear search topic choices demonstrate different visual capabilities.
- A real generated MP4 is required before labeling the preview as actual product output. No MP4 was found in the project at this design pass. The interim illustrated poster is labeled accordingly.
- When media is connected, derive duration from its metadata; never simulate elapsed playback or audio availability.
- Playback starts on user action. Provide play/pause, seek, mute/unmute, captions and expand. Selecting another topic pauses the previous sample and resets its time.
- Expanded view keeps the 9:16 video and includes a readable transcript. Close and Escape restore focus to the opening control.
- Loading retains the poster; failures show a retry action and transcript. No blank or endlessly spinning player.
- Use optional WebVTT captions for a toggleable track. If a sample has burned-in captions, explain that they cannot be hidden rather than presenting a misleading toggle.

## Layout and motion

Keep concise hero copy and one primary creation CTA. Place the video high on the page. Mobile is a single column with a reachable CTA that does not obscure captions. Use real content labels, 44px targets, visible focus, keyboard-accessible controls and reduced-motion support. No autoplay sound or decorative infinite loops.

Below the hero, show Topic → AI creates → Preview and share. Explain motion graphics, synchronized narration and optional captions in plain language. Make email/password sign-in and account creation clear; do not imply payment or unsupported performance guarantees.

## Implementation boundary

Stitch screens are design/prototype artifacts, not proof of production video playback or backend integration. Verify any prototype interactions separately. The production landing page should use a reviewed demonstration asset with a deliberate retention policy: ordinary generated videos expire after two hours, so do not hard-code a temporary signed URL as the permanent homepage sample. Decide on an explicitly retained public demo asset before deployment.

## Acceptance checks for the implemented page

Confirm actual MP4 and audio playback, correct aspect ratio without cropping captions, topic switching, accurate duration/seeking, caption track behavior, fallback states, keyboard operation, mobile overflow and reduced-motion behavior. Load media lazily or on demand rather than downloading every example at initial page load.
