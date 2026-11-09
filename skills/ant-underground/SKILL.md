---
name: ant-underground
description: Make vertical pixel-art reels (MP4) that recruit the viewer — a warm underground world with dithered orange skies, a hanging lamp, violet mushrooms and two-tone pixel captions — rendered frame by frame from a low-resolution buffer in headless Chrome, with a synthesized score. Use when the user asks for a pixel-art video, a retro 16-bit style reel, a vertical/9:16 short with captions, a hook or teaser reel for social, an "engage the comments" video, or wants to extend/re-cut the Formigueiro reel.
---

# Ant underground

A method for making vertical, captioned pixel-art reels that pull the viewer in, distilled from a
reference reel: an ant explaining, in the viewer's own language, what the viewer just did by
following. It is bundled as a runnable `template/` (a 23 s reel that uses every technique) and a
worked example in `examples/formigueiro/`.

**How it works.** The picture is drawn into a **low-resolution buffer** (180×320 for a 9:16 frame)
and upscaled ×6 with nearest-neighbour at the very end, so the pixel grid survives. That buffer is
not flat: each pixel carries a soft gradient, the sky is **dithered** rather than banded, and light
sources bloom. `render.mjs` drives headless Chrome to render contact sheets, strips and stills for
review, or every frame in parallel, and ffmpeg encodes the MP4. `music/score.mjs` synthesizes the
score in Node from the same `cues.js`, so every hit lands on its frame.

## The one idea

**In this style the captions carry the whole story; the pictures only have to make the words
land.** And the story is not about the character — it is about **the person watching**. The
character speaks in the second person, in the present tense, and the viewer discovers they are the
subject of the sentence.

So a reel here is not "a video about an ant". It is a reel that says *you are one of us now*,
inside a fiction, without ever writing the word "follow".

Read [references/storytelling.md](references/storytelling.md) **before designing anything**. It has
the structure, the caption grammar, the engagement mechanics and the failure modes.

## Workflow

### 0. Scaffold
```bash
bash ~/.claude/skills/ant-underground/scripts/new_project.sh <project-dir>
```
Then read [references/storytelling.md](references/storytelling.md) (the method) and
[references/style-guide.md](references/style-guide.md) (the look: palette, composition, light, type)
in full. [references/technique.md](references/technique.md) covers how the pixel buffer, the dither,
the light and the font actually work. The measured reference values are in
[docs/reference-measurements.md](docs/reference-measurements.md).

### 1. Write the story first, in captions
This is the part that decides whether the reel works. Write `STORYBOARD.md` with **the captions
first**, before any picture is chosen:

| Beat | What it must do | Write it as |
|---|---|---|
| **The claim** | name the place and what is in it | two nouns: `ESTE FORMIGUEIRO / FORMIGAS` |
| **The want** | the speaker's ambition, first person | `QUER SER / VIRA FORMIGA` |
| **The invitation** | the viewer is pulled in — follow, comment, save | `QUEM SEGUE, DO CÉU` |
| **The cliffhanger** | something concrete and unfinished | `DO CÉU, ELA CAVOU` |

Then check the grammar: every line is a **fragment of at most two words**, the subject is dropped
on purpose, and the last line is a picture of something unfinished. Then — and only then — decide
what each shot shows. One image per caption, with one *job* for that image (the light is the
invitation; cutting to the sky means leaving the colony).

Show the storyboard to the user and let them react before building, unless they said to just go
ahead.

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
the captions legible at 1080 wide, in the lower band, and gone before the next shot? **and: does
each picture do the job the caption gave it?** Budget: a sheet per shot, a strip per caption
transition, a still per prop.

### 4. Score, render, encode
```bash
node music/score.mjs && ffmpeg -y -i assets/score.wav -c:a aac -b:a 192k assets/score.m4a
node render.mjs --frames --workers=4          # ~40–60 ms/frame
node render.mjs --encode --audio=assets/score.m4a --out=out/reel.mp4 --fps=30
```
You can't hear the score: check it with `ebur128` and per-section RMS, and say so when you report.
Audio-only changes don't need a re-render — remux (`-map 0:v -map 1:a -c:v copy`).

## The rules that matter most
1. **Captions first, and short.** ≤ 2 words per line, fragments, second person, present tense.
   The pictures serve the words.
2. **The CTA lives inside the fiction.** Never write "follow", "like" or "comment" in a caption.
   Make the action the premise instead, and end on something unfinished.
3. **Draw low, upscale last.** Everything is authored in the 180×320 buffer and blown up at the
   end. Drawing at full resolution is how the pixel look is lost.
4. **The pixel is not flat.** A flat fill looks like a spreadsheet; a smooth gradient looks like a
   photograph. Both are wrong. Dither the sky, lattice the soil.
5. **One light source, falling downward.** The lamp is the only light. Its spill goes *down* and
   fades to zero — an omnidirectional glow washes the soil flat and kills the depth.
6. **Pure functions of `t`.** Frames render in parallel and out of order: no state across frames,
   no `Math.random()`. Use `hash2(i, seed)` for stable randomness.
7. **Clear the buffer every frame.** `renderFrame` calls `pix.clear()` first. Without it each shot
   is painted over the last and the reel turns into a smear.

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
  cache, and the `.env` the scaffold writes; otherwise pass `--chrome=<path>`.

## Adapting

- The anthill is a template, not a rule: change the palette in `PAL`, the surface line in `WORLD`,
  and the props in `props.js` to get a different place with the same look. The **story structure**
  survives the change — that is the part that carries.
- The captions can be any language the font covers. Add the glyphs to `G` (a bitmap of `#`/`.`
  rows) and the accents to `ACC`/`MARKS`.
- A second part of a series reuses the world exactly: same palette, same props, same lamp. Only
  the captions and the new image change — that is what makes it recognisably the same place.
- New creatures are drawn with the same tools (`pix.set` on a small grid) and kept on-model across
  shots.
