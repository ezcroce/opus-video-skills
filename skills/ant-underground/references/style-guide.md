# Style guide — the underground pixel reel

The look: **pixel art with modern lighting**. The artwork is authored on a tiny grid, but each
pixel carries a soft gradient, the sky is dithered, and the single light source blooms. It is not
flat pixel art (a spreadsheet) and it is not a smooth illustration (a photograph). It sits between.

Everything below was measured from the reference frames — see
[../docs/reference-measurements.md](../docs/reference-measurements.md) for the raw numbers.

## Format

| | |
|---|---|
| Aspect | 9:16 vertical (1080×1920) |
| Working buffer | 180×320, upscaled ×6 with nearest-neighbour |
| Frame rate | 30 fps |
| Length | 15–30 s is the sweet spot; the reference is 23 s in 5 shots |

Vertical is not a crop of a horizontal film — it is a different composition. The reference puts
the subject in the middle band and the caption in the bottom fifth, with the sky (when present) in
the top quarter.

## Palette

The world is built from **five ramps**. Keep each ramp narrow (3–5 steps) and let the ramps, not
extra hues, carry the range.

### Soil (the dominant mass) — warm brown-red, very dark

| Hex | Role |
|---|---|
| `#4b2318` | the lit crust just under the surface |
| `#441c17` / `#451d18` | mid soil |
| `#371811` / `#391913` | deep soil |
| `#301810` | darkest soil |
| `#301008` | the deepest shadow |

### Sky (the surface) — orange

| Hex | Role |
|---|---|
| `#ea8d55` / `#e98c54` | bright sky, the sunlit top |
| `#dc7346` / `#db7145` | mid sky |
| `#c95c3c` / `#c85b3b` | the horizon shade |

### Vegetation — green

| Hex | Role |
|---|---|
| `#485010` | deep grass, the ridge in shadow |
| `#8aa83c` | mid grass |
| `#a8c84c` | lit grass |
| `#c4dc70` | the highlight on a blade tip |

### Accents — used sparingly, they carry the eye

| Hex | Role |
|---|---|
| `#f0a83c` → `#ffe08a` | the lamp flame, the embers, the amber half of a caption |
| `#b088e8` → `#e0c0ff` | the mushroom caps and their glow |
| `#e8e0d0` | the cream half of a caption, the ant's mandibles |
| `#8a9098` → `#c8d0d8` | the pebbles |

The accent colours are the only saturated hues in the frame. Because the soil and sky are both
warm and desaturated, a violet mushroom reads instantly.

## Composition

- **The underground is 90% of the frame.** The sky, when it appears, is the top quarter.
- **The boundary is a hard, nearly straight horizontal line.** Not a curve, not a fade — a hard
  edge with a lighter crust just under it. That edge is what makes the ground read as solid.
- **The lamp hangs in the upper third**, its chain running off the top of frame.
- **The subject sits in the middle third**, in the lamp's pool of light.
- **The caption sits in the bottom fifth**, centred, with generous margin.
- **Negative space is the point.** The reference is mostly empty dark soil; the subject and the
  caption are small in it. Do not fill the frame.

## Light

One light source. The lamp hangs above and throws a warm pool **downward**.

- The spill falls *down*. An omnidirectional glow washes the soil above the lamp flat and kills
  the depth. Squash the falloff upwards: `dy < 0 ? dy * 4 : dy`.
- The pool must reach **exactly zero** at its edge, or it reads as a rectangle.
- Everything else is lit by the ambient ramp: the soil's own gradient, the grass rim, the ember
  dots. Nothing else glows.

## Motion

| Element | Motion |
|---|---|
| Embers | drift upward, wrapping, at slightly different speeds — the only constant movement |
| Roots | sway very slightly, out of phase with each other |
| Grass stalks | lean, with the lean increasing toward the tip (a quadratic bend) |
| The lamp | sways on its chain; the chain's links read as small notches |
| The ant | a six-legged walk cycle — three legs per side, in a triangle, lifting in phase |
| Captions | rise 3 px into place while fading in, then fade out before the next shot |

Everything else is **still**. A still frame is the reference: this is a quiet, slow reel.

## The ant

Nine pixels tall at scale 1, sixteen at scale 2 (which is what the reel uses).

- Three body segments that read as three: gaster (rounded, rear), thorax (darker, middle), head.
- Six legs, dark, in a triangle gait.
- **Cream mandibles** — the brightest thing on the ant, and the eye's anchor.
- A dark red-brown body (`#7a2a1c` body, `#4a1810` dark, `#a8422a` lit).
- A soft shadow puddle under it, or it floats.

## Typography

- Chunky bitmap font, **5×7 in a 6×8 cell**, all caps, no lowercase.
- **Two-tone, word by word**: some words cream (`#e8e0d0`), the next amber (`#f0a83c`).
- A **dark outline** and a hard drop shadow — without them the type dissolves into the soil.
- Set at scale 2 in the reel (each glyph 12×16 px in the 180-wide buffer).
- Centred in the lower band. Two lines, 24 px apart, the second arriving ~1.2 s after the first.
- Accents (É, Ã, Ç, Õ, Á, À, Â, Ê) sit *above* the glyph, so leave room above a line that has one.

## What the captions are for

The reel tells its story **only through the captions**. The visuals are the world; the words are
the plot. So:

- Every shot carries a line, and the line lands on the shot, not before or after it.
- Two lines per shot is the rhythm: the first sets it up, the second lands it.
- The captions must leave the screen before the next shot's arrive.
