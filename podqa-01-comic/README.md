# podqa-01-comic

A second cut of **PodQAst Inteligente #01**, in a different medium: a printed comic. Not a repaint of
the painted version — a different animation language, built from a different engine.

**What it is.** A 44.6 s extract (`0:39 → 1:24` of the episode): the lost Mars probe, the two teams
measuring in different units, and the pattern that explains both. Three "pages", nine panels, one
panel per beat, lettered with the episode's own words.

**What it is not.** It is not a slideshow with pictures. Every panel is *composed* (framing, plate
balance, tail direction), every element is animated (wipes, pops, ink ticks landing one by one,
speed lines, a slow push-in while a panel holds), and the palette is three inks, like a real print job.

## The medium

| | painted version (`../podqa-01-video/`) | this one |
|---|---|---|
| fill | watercolour washes, four passes, granulation, wet edges | flat plate: one fill, no gradients |
| line | tapered brush stroke, boiling every 12 frames | uniform ink, straight-edged, reseeded every 12 frames |
| shading | pigment layering | halftone screens: 3 densities, 45° angle, clipped per shape |
| seam | paper bleed, 0.62 s | hard cut to the next panel, like an eye moving |
| camera | continuous push and drift | one panel per beat, 5 % push inside the panel |
| type | none | Bebas (display) and Comic Neue (lettering) |

Three inks: black, a warm red plate and a cold blue plate, on newsprint. Shadows are a *halftone*
offset in the blue plate, never a blur.

## Files

| Path | |
|---|---|
| `STORYBOARD.md` | The three pages: panel rects, beats, what each panel reads, and the lettering |
| `engine/comic.mjs` | Newsprint, halftone tiles, ink, `sharp`/`box`, panels, balloons, captions, SFX, camera |
| `shots/index.mjs` | The nine panels, each a function of local time |
| `render.mjs` | Contact sheets, the encode, and the mux of the extract's own audio |
| `fonts/` | Bebas Neue and Comic Neue (SIL OFL 1.1, from the Google Fonts repository) |

`engine/comic.mjs` imports the paper, the jitter and the camera from
`../podqa-01-video/engine/core.mjs`, so both films boil at the same rate — the two versions look like
two techniques applied to one world rather than two unrelated projects.

## Run it

```bash
npm install
# the extract, cut from the episode master (0:39, 44.57 s)
ffmpeg -ss 39.40 -t 44.57 -i ../episodes/podqa-01.mp3 -c:a aac -b:a 160k out/extract.m4a
node render.mjs --sheet=2,6.5,12.6,21,32,41 --cols=3 --w=560 --out=out/check/sheet.jpg
node render.mjs --fps=24 --to=44.57 --audio=out/extract.m4a --out=out/extract.mp4
```

Rendering is ~145 ms per 1080p frame, so the extract takes under three minutes — the painted version
takes twenty. Comics are cheap: that is part of the argument for this medium.

## Two things that took a debug pass

- **Lettering size.** A panel is framed by the camera at `min(0.88·W/w, 0.88·H/h)`, so a 1800-wide strip
  is drawn at 0.94 and a 1000-wide panel at 1.7. Type placed in page units therefore came out half the
  size in wide panels. Everything typographic now goes through `PX(panel, n)`, which converts a *screen*
  pixel size into page units for that panel's zoom.
- **Rectangles through a spline.** `ink()` smooths with Catmull-Rom; a rectangle passed through it grows
  a pointed tip — a ruler came out looking like a knife. Rectangles now use `sharp()`/`box()`
  (straight edges, no spline). Organic shapes still use `ink()`.

## Audio

The extract is cut from `../episodes/podqa-01.mp3` at 0:39.40 (the start of block B, measured in
`../podqa-01-video/cues.json`), so the panel beats fall on the same sentences as the painted version.
