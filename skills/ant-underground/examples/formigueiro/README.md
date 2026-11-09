# A FORMIGUEIRO — the worked example

A 23 s vertical pixel short in the same four-beat structure as the reference, about a different
colony on a colder planet.

It uses the same engine as `template/` — the storyboard is in [STORYBOARD.md](STORYBOARD.md).

## The story

```
ESTE FORMIGUEIRO / FORMIGAS      the claim
EL QUER / TRABALHAR               the want
TRABALHA AQUI / QUEM COMENTA      the invitation
DEBAIXO / ELA CAVOU               the tease
```

Note what the second half does: the reference's invitation was **"quem segue"** (follow), this
one is **"quem comenta"** (comment) — the same grammatical move, aimed at a different button. And
the comment is framed as **being given a job**, which is what the reference does with *"quem
comenta, que trabalho terá"*. The reward is a role in the world, not a prize.

## What it shows that the template does not

| | |
|---|---|
| **A different palette** | The soil and sky are shifted cool — a blue sky over a cool brown anthill instead of the reference's orange over warm brown. The amber lamp and the violet mushrooms are carried over **unchanged**, on purpose: they are the style's signature, and they glow harder against a cooler world. |
| **A different motive** | The reference's ant wants to *become* an ant; this one wants to *work*, and the colony needs workers. That is why the comment is the reward — a commenter gets a job. |
| **A different button** | Follow → comment. Same structure, different target. |
| **A motif carried through the shots** | The **ladder**: the ant climbs up the frame between shots 3 and 4, and the drone's pitch rises with her (A1 → B1 → C2). |
| **Music that speeds up** | The heartbeat pulse drops out at the surface and tightens from half-time to three-quarter during the climb. |

Everything else — the pixel buffer, the dither, the light pool, the bitmap font, the two-tone
captions, the four beats — is the house engine, unchanged.

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
(55 ms/frame) on a software GL stack.

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
