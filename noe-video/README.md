# Noè — La promessa di Dio

A 2:55 animated 3D-cartoon short about Noah, the ark and the rainbow, made entirely in code.

## Deliverable

- **Video:** `out/video.mp4` — 3840×2160 (4K), 24 fps, H.264 + AAC, Italian narration and orchestral score.
- **Poster:** `out/poster_title.png` — title frame.
- **Rainbow still:** `out/poster_rainbow.png` — the promise scene.

## Project layout

| Path | Purpose |
|---|---|
| `src/engine.js` | three.js toolkit: materials, outlines, sky, clouds, text, post-processing |
| `src/characters.js` | Noah, family and animals, with expressions and walk/hammer/listen cycles |
| `src/world.js` | ancient city, hills, trees, props |
| `src/ark.js` | the ark, sea, storm, rain, lightning, rainbow, renewed earth |
| `src/scenes.js` | the title, seven scenes and the final promise |
| `src/main.js` | timeline, renderer, `window.renderFrame(t)` |
| `render.mjs` | parallel, resumable frame render + ffmpeg encode |
| `dev.mjs` | render stills for look development |
| `audio/make_audio.py` | procedural orchestral score, narration placement, SFX and mix |
| `audio/mix.wav` | final 175 s stereo mix |

## Rebuild

```bash
./setup.sh                       # install npm deps + Chromium/SwiftShader
node dev.mjs --scene=title --times=3 --out=out/check/title
node render.mjs --workers=2 --renderScale=0.6667 --shadows=0
```

`render.mjs` renders 1280×720 frames (2 workers, resumable) and upscales them to 3840×2160 with lanczos while muxing `audio/mix.wav`. The 720p render is a deliberate trade-off for the software-WebGL environment; the final container is 4K.

## Audio

`audio/make_audio.py` synthesizes the score with numpy (strings, choir, harp, flute, brass, timpani, cymbal, piano), places the Italian narration clips at the scene starts, adds rain/thunder/waves/hammering/birds, ducks the music under the voice and writes `audio/mix.wav`.

Narration clips are in `audio/narration/` (generated with a warm Italian narrator).

## Story

The short follows the Genesis 6–9 narrative: a world that forgot God, Noah's call, the building of the ark, the flood, the dove and the olive branch, the rainbow covenant, and what the promise means for a child today. The final card reads:

> **LA PROMESSA DI DIO NON VIENE DIMENTICATA.**
> Genesi, capitoli 6-9.
