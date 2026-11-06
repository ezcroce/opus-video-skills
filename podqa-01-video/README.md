# podqa-01-video

The illustrated video for **PodQAst Inteligente #01** — 3:17, 1920×1080, 24 fps, painted frame by frame
and muxed with the episode audio.

This project follows the method of the [`painted-animation`](../skills/painted-animation/) skill:
storyboard with timed reads → shade-shot build → render contact sheets → look at them → revise → encode.
The medium is the same one the skill prescribes: watercolour washes, boiling ink linework, flat 2D,
no lettering, a transition at every seam, and something happening in every shot.

## Why the engine is a port, not the skill's template

The skill's renderer drives headless Chrome to run p5.js + p5.brush. This sandbox cannot run Chrome:
the binary from `@sparticuz/chromium` needs `libnss3` / `libnspr4` / `libnssutil3`, there is no root to
install them, and no network route to a distro mirror. So `engine/` re-implements the same medium on
[`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas) (Skia, prebuilt, no system deps):

| Skill (`template/src/core.js`) | Here (`engine/core.mjs`) |
|---|---|
| `paint(pts, {wash, washOp})` on p5.brush | `paint(ctx, pts, {wash, alpha})` — four low-alpha passes of a wobbling path, granulation specks, double wet edge |
| `inkLine` / ink brush | `ink(ctx, pts, {w, col})` — tapered variable-width strip plus a bleed pass |
| `glow()` additive | `glow(ctx, …)` — radial gradient in `lighter` mode |
| `BOIL` 12 Hz reseed, `jit()`, `boilSeed()` | `setBoil(frame)`, `seed(key)`, `jitter` — identical semantics |
| paper grain + `PAL` | `paper()`, `grain()`, `PAL`, `vignette()` |
| `camBegin/camEnd` | `withCam(ctx, cam, fn)` |
| `iris` / `brushWipe` | one paper-bleed transition: `bleedPts()` clip |

Everything above `engine/` — the cast, the props, the shot list — is authored the way the skill's
`ANIMATION_GUIDE.md` asks for, so a future run *with* Chrome could port the shots to the p5 engine by
swapping the drawing primitives, not the staging.

## Files

| Path | |
|---|---|
| `STORYBOARD.md` | The film: logline, motifs, the 15 shots with shot-in/out times, the audio cue each answers, and its reads |
| `engine/core.mjs` | Paper, brush, ink, glow, camera, transitions, math |
| `engine/cast.mjs` | Vivi (the host), the wind-up machine, and the props |
| `shots/index.mjs` | The 15 shots, each a pure function of local time |
| `align.mjs` | Reads `segments.json` + the episode and writes `cues.json`: every sentence's measured start |
| `render.mjs` | Contact sheets, partial clips, and the full encode (JPEG → ffmpeg → MP4 with the audio) |
| `cues.json` | Generated: 4 blocks, 42 sentence cues |

## Run it

```bash
npm install                     # @napi-rs/canvas
node align.mjs                  # cues.json from the episode's segments
node render.mjs --sheet=3,45,118,190 --cols=2 --w=760 --out=out/check/sheet.jpg
node render.mjs --from=0 --to=6 --out=out/check/clip.mp4 --audio=../episodes/podqa-01.mp3
node render.mjs --fps=24 --to=197.4 --audio=../episodes/podqa-01.mp3 --out=out/podqa-01.mp4
```

`FFMPEG=/path/to/ffmpeg` if it is not on `PATH`. Rendering costs about 120 ms per 1080p frame on two
cores, so the full film is roughly ten minutes.

## What it cost, and what is still rough

- **Speed.** 120 ms/frame at 1080p: ~4600 frames. Fine for a night run, slow for iteration; a contact
  sheet of 15 frames is 2 s, which is what makes the look-and-revise loop bearable.
- **Bugs found by looking.** `mic()`, `lamp()` and `mug()` drew at the origin (a missing `translate`),
  the paper overlay was painted *over* the scene (blank frames), and the desk highlight was a five-lobed
  blob that read as a star. None of those were visible in code review.
- **Still rough.** The washes are flatter than p5.brush's pigment mixing; there is no wet-on-wet bleed,
  and the cast is a simple creature rather than an acted character. The composition leans on camera
  moves and overlap for depth, which is the cheapest way to keep flat 2D from looking like stickers.

## Audio

`../episodes/podqa-01.mp3` — produced by [`podcast-prompt-pipeline`](../skills/podcast-prompt-pipeline/),
3:17, −16 LUFS, mono 44.1 kHz. The video is cut to `cues.json`, which is derived from the episode's own
segment durations, not from a guess.
