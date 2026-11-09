---
name: ant-underground
description: Make vertical pixel-art narrative reels (MP4) in code — a warm underground world with dithered orange skies, hanging lamps, violet mushrooms and two-tone pixel captions — rendered frame by frame from a low-resolution buffer in headless Chrome, with a synthesized score. Use when the user asks for a pixel-art video, a retro 16-bit style reel, a vertical/9:16 short with captions, a "Pixel Art" animation, or wants to extend/re-cut the Underground reel.
---

# Ant underground

A method for making vertical, captioned pixel-art shorts entirely in code, distilled from a reference
reel: an ant's small underground world, told in five shots with two-tone pixel captions. It is bundled
as a runnable `template/` (a 23 s reel that uses every technique) and a worked example in
`examples/formigueiro/`.

**How it works.** The picture is drawn into a **low-resolution buffer** (180×320 for a 9:16 frame)
and upscaled ×6 with nearest-neighbour at the very end, so the pixel grid survives. That buffer is
not flat: each pixel carries a soft gradient, the sky is **dithered** rather than banded, and light
sources bloom. `render.mjs` drives headless Chrome to render contact sheets, strips and stills for
review, or every frame in parallel, and ffmpeg encodes the MP4. `music/score.mjs` synthesizes the
score in Node from the same `cues.js`, so every hit lands on its frame.

## Workflow

### 0. Scaffold
```bash
bash ~/.claude/skills/ant-underground/scripts/new_project.sh <project-dir>
```
Then read [references/style-guide.md](references/style-guide.md) (the look, the palette, the
composition, the motion vocabulary) and [references/technique.md](references/technique.md) (how the
pixel buffer, the dither, the light and the font actually work). The measured reference values —
palette, ramps, layout — are in [docs/reference-measurements.md](docs/reference-measurements.md).

### 1. Storyboard before code
Write `STORYBOARD.md` in the project: the logline, the world, the palette arc, and one row per shot
(time, what the viewer sees, the caption that lands on it, the sound). Show it to the user before
building, unless they said to just go ahead.

Keep reels short. The reference is 23 s in 5 shots; the captions are the story, so each shot earns
its place only if it carries a line.

### 2. Build
- `src/cues.js`: the timeline — `S` (the shots and when they start), `dur`, `bpm`, `hits`. This is
  the single source of truth for both the picture and the score.
- `src/pixel.js`: the buffer and the palette. `Pix` holds RGB floats; `set`/`blend`/`add`/`rect`/
  `softCircle`/`dither` are the drawing primitives.
- `src/props.js`: the cast — `ant`, `lamp`, `mushroom`, `roots`, `pebble`, `ember`, `ringEmblem`,
  `stalks`.
- `src/font.js`: the bitmap font and `caption()`. The font carries Latin caps plus É, Ã, Ç, Õ, Á,
  À, Â, Ê — bake more into `ACC`/`MARKS` when a caption needs another accent.
- `src/scene.js`: the world — `drawSky`, `drawSoil`, `drawGround`, `vignette`, `lightSpill`.
- `src/shots.js`: one function per shot, registered in `SCENES`.

### 3. Look at it, every shot, several times
```bash
node render.mjs --sheet=1,5,9.5,14.5,20 --cols=5 --w=360 --out=out/check/sheet.jpg   # key frames
node render.mjs --strip=4.8:5.2 --cols=6 --w=320 --out=out/check/strip.jpg           # every frame of a moment
node render.mjs --stills=5.6 --out=out/stills                                          # full-res detail
ffmpeg -i out/reel.mp4 -vf "fps=1/2,scale=270:-2,tile=6x2" out/check/final.jpg         # the encode
```
Open every image with Read and check it against the reference: is the pixel grid visible? is the
sky dithered rather than banded? does the lamp light fall *downward* and fade out completely? are
the captions legible at 1080 wide, in the lower band, and gone before the next shot? Budget: a
sheet per shot, a strip per caption transition, a still per prop.

### 4. Score, render, encode
```bash
node music/score.mjs && ffmpeg -y -i assets/score.wav -c:a aac -b:a 192k assets/score.m4a
node render.mjs --frames --workers=4          # ~40–60 ms/frame
node render.mjs --encode --audio=assets/score.m4a --out=out/reel.mp4 --fps=30
```
You can't hear the score: check it with `ebur128` and per-section RMS, and say so when you report.
Audio-only changes don't need a re-render — remux (`-map 0:v -map 1:a -c:v copy`).

## The rules that matter most
1. **Draw low, upscale last.** Everything is authored in the 180×320 buffer and blown up at the
   end. Drawing at full resolution is how the pixel look is lost.
2. **The pixel is not flat.** The reference's pixels carry soft gradients and the sky is dithered.
   A flat fill looks like a spreadsheet; a smooth gradient looks like a photograph. Both are wrong.
3. **One light source, falling downward.** The lamp is the only light. Its spill goes *down* and
   fades to zero — an omnidirectional glow washes the soil flat and kills the depth.
4. **Captions are the story.** Two-tone (cream and amber, word by word), chunky, dark-outlined, in
   the lower band, and they must fade *out* — a caption that stays on screen sits on top of the
   next shot's words.
5. **Pure functions of `t`.** Frames render in parallel and out of order: no state across frames,
   no `Math.random()`. Use `hash2(i, seed)` for stable randomness.
6. **Clear the buffer every frame.** `renderFrame` calls `pix.clear()` first. Without it each shot
   is painted over the last and the reel turns into a smear.
7. **The soil must not band.** Per-row noise draws horizontal stripes; use a small noise lattice
   (4 px) with a second octave, bilinearly interpolated.

## Engine gotchas

- **`Pix._toImage()` allocates a canvas every call.** It is fine for a one-off frame but do not
  call it per pixel.
- **`drawText` shrinks to fit.** A long line drops a scale level rather than overflowing; that is
  deliberate, but if a caption looks too small, split it into two lines instead of raising the fit.
- **The accent marks sit above the glyph**, so a caption with an accent needs a little more room
  above it, or it collides with the line above.
- **`softCircle` is additive.** Two overlapping glows accumulate to white; use `blend` when you
  want the colour to stay put.
- **The screenshot must clip to the canvas.** The page carries a scrub bar, and a plain
  `page.screenshot()` includes it in every frame. `render.mjs` copies the canvas into a fixed
  1080×1920 element and shoots that.
- **Chromium may not be on the PATH.** `render.mjs` looks for Chrome, Chromium, the Playwright
  cache, and then the repo's own `.tools/bin/chromium`; otherwise pass `--chrome=<path>`.

## Adapting

- The ant is the default star, not a requirement. New creatures are drawn with the same tools
  (`pix.set` on a small grid) and kept on-model across shots.
- The world is a template, not a rule: change the palette in `PAL`, the surface line in `WORLD`, and
  the props in `props.js` to get a different place with the same look.
- Captions can be any language the font covers. Add the glyphs to `G` (a bitmap of `#`/`.` rows)
  and the accents to `ACC`/`MARKS`.
- `render.mjs --loop` is not implemented here (the reference has no loop), but `--clip` renders
  straight to MP4 for short pieces.
