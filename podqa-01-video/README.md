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
| `envelope.mjs` | Measures the episode once and writes `envelope.json`: per-frame lip opening and spread |
| `render.mjs` | Contact sheets, partial clips, and the full encode (JPEG → ffmpeg → MP4 with the audio) |
| `cues.json` | Generated: 4 blocks, 42 sentence cues |

## Run it

```bash
npm install                     # @napi-rs/canvas
node align.mjs                  # cues.json from the episode's segments
node envelope.mjs               # envelope.json from the episode's waveform (lip sync)
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
- **Still rough.** The washes are flatter than p5.brush's pigment mixing and there is no wet-on-wet
  bleed. The cast is a flat vector construction with a painted surface — it acts, but it does not
  deform. The composition leans on camera moves and overlap for depth, which is the cheapest way to
  keep flat 2D from looking like stickers.

## Lip sync

The mouth is not on a timer. `envelope.mjs` decodes the episode once (mono, 8 kHz, via ffmpeg) and
writes `envelope.json` — 4736 frames of `[open, spread]`, indexed by the film's frame rate:

- `open` = loudness in dB, mapped `(dB + 42) / 34` and clamped, with a fast attack (0.55) and a slow
  release (0.18) so the jaw snaps open on a consonant and eases shut on the vowel tail;
- `spread` = zero-crossing rate, i.e. how bright the frame sounds, zeroed whenever the mouth is closed
  — the corners pull back on sibilants, not on silence.

`render.mjs` loads the table and assigns `VOICE.open` / `VOICE.spread` before each frame, so the
character's lips, the machine's crank and the sound actually agree. Measured on this episode: 87 % of
frames voiced, mean opening 0.57, p95 0.87 — which is why the mouth is mostly half-open rather than
flapping between shut and wide.

## Audio

`../episodes/podqa-01.mp3` — produced by [`podcast-prompt-pipeline`](../skills/podcast-prompt-pipeline/),
3:17, −16 LUFS, mono 44.1 kHz. The video is cut to `cues.json`, which is derived from the episode's own
segment durations, not from a guess.
