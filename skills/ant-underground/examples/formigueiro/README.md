# A FORMIGUEIRO — the worked example

A 23 s vertical pixel short: a young ant in the warm dark of the anthill is drawn up by a lamp she
cannot reach, and when she finally climbs into the light she finds the sky full of tall green
grass and a world of giants.

It uses the same engine as `template/` — the storyboard is in [STORYBOARD.md](STORYBOARD.md).

## What it shows that the template does not

| | |
|---|---|
| **A different palette** | The soil and sky are shifted cool — a blue sky over a cool brown anthill instead of the reference's orange over warm brown. The amber lamp and the violet mushrooms are carried over **unchanged**, on purpose: they are the style's signature, and they glow harder against a cooler world. |
| **A different story** | The reference's ant wants to *become* a queen. This one wants to *leave*. |
| **A motif carried through the shots** | The **ladder**: the ant climbs up the frame in every shot, and the drone's pitch rises with her (A1 → B1 → C2). By the last shot she is the biggest thing on screen. |
| **Music that speeds up** | The heartbeat pulse drops out at the surface and tightens from half-time to three-quarter during the climb. |

Everything else — the pixel buffer, the dither, the light pool, the bitmap font, the two-tone
captions — is the house engine, unchanged.

## Run it

```bash
npm install
node render.mjs --sheet=2.5,6.5,11.5,16.5,21 --cols=5 --w=360 --out=out/check/sheet.jpg
node music/score.mjs
ffmpeg -y -i assets/score.wav -c:a aac -b:a 192k assets/score.m4a
node render.mjs --frames --workers=4
node render.mjs --encode --audio=assets/score.m4a --out=out/reel.mp4
```

23 s, 1080×1920, 30 fps, ~1.27 Mbps, AAC 192 kbps at −15 LUFS. 690 frames in ~38 s
(54 ms/frame) on a software GL stack.

## The files that differ from the template

| File | What changed |
|---|---|
| `src/pixel.js` | the palette — a cooler set of ramps |
| `src/shots.js` | a new story, the climbing motif, new caption timings |
| `src/cues.js` | the same five-shot timeline |
| `music/score.mjs` | a drone that rises with the ant, a pulse that tightens |
| `STORYBOARD.md` | the plan this was built from |

`src/scene.js`, `src/props.js`, `src/font.js`, `render.mjs` and `index.html` are the house
versions, unchanged.
