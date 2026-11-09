# Measured from the reference reel (6 screenshots, 400×480 portrait crops)

Method: `tools/palette.py` (exact + 8-step-quantised colour clusters),
`tools/inspect-stills.py` (banding, ink coverage), and nearest-neighbour
upscales to confirm the pixel grid. Values below are what the screenshots
actually contain — screen-photo resampling adds noise, so the ramps are read
off the largest flat clusters.

## Format

- Portrait, roughly 9:16, the reel's own caption band at the bottom.
- **Pixel art** on a low-res grid, but *not* flat: each pixel carries a soft
  gradient (the "modern lighting" look). Sky is dithered, sprites are flat
  with 1–2 ramp steps.
- The screenshot shows the dither clearly: a checkerboard of two sky tones
  rather than a smooth ramp.

## Palette

### Soil / underground ramp (the dominant mass) — warm brown-red, very dark

| Hex | RGB | HSL | Role |
|---|---|---|---|
| `#441c17` | 68, 28, 23 | 6° 49% 17% | mid soil |
| `#451d18` | 69, 29, 24 | 6° 48% 18% | mid soil (lit) |
| `#371811` | 55, 24, 17 | 11° 52% 14% | deep soil |
| `#391913` | 57, 25, 19 | 9° 50% 14% | deep soil (lit) |
| `#301810` | 48, 24, 16 | 15° 50% 12% | darkest soil |
| `#301008` | 48, 16, 8 | 11° 71% 10% | deepest shadow |
| `#4b2318` | 75, 35, 24 | 8° 52% 19% | mid-lit soil |

### Sky / surface ramp — orange, light and hot

| Hex | RGB | HSL | Role |
|---|---|---|---|
| `#e98c54` | 233, 140, 84 | 22° 77% 62% | bright sky / sunlit |
| `#ea8d55` | 234, 141, 85 | 22° 78% 62% | brightest sky |
| `#db7145` | 219, 113, 69 | 17° 67% 56% | mid sky |
| `#dc7346` | 220, 115, 70 | 17° 68% 56% | mid sky (lit) |
| `#c85b3b` | 200, 91, 59 | 13° 56% 50% | sky shade |
| `#c95c3c` | 201, 92, 60 | 13° 56% 51% | sky shade (lit) |

### Vegetation — green ramp (only in the surface scene)

| Hex | RGB | HSL | Role |
|---|---|---|---|
| `#485010` | 72, 80, 16 | 67° 66% 18% | deep grass |
| `#8aa83c` | 138, 168, 60 | 74° 45% 45% | mid grass |
| `#a8c84c` | 168, 200, 76 | 71° 43% 54% | lit grass |
| `#c4dc70` | 196, 220, 112 | 68° 51% 65% | highlight blade |

### Accents

| Hex | RGB | Role |
|---|---|---|
| `#f0a83c` → `#ffe08a` | amber | the lamp / ember glow, and the amber half of the caption |
| `#b088e8` → `#e0c0ff` | violet | mushroom caps and their glow |
| `#e8e0d0` | cream | the other half of the caption, ant mandibles |
| `#8a9098` → `#c8d0d8` | steel | pebbles, the raindrop/cloud prop |

## Composition

- **Surface scene** (upper third): dithered orange sky, a green canopy of tall
  vertical stalks, a dark green ridge line, a red-brown ground band, then the
  underground.
- **Underground** (lower two thirds): dark brown soil with a horizontal
  boundary line, root strands hanging down, scattered grey pebbles, small
  amber embers.
- The boundary is a hard, near-straight horizontal line at ~55–60% height.
- The ant and the hanging lamp sit on/above that line.

## Key props

- **Ant**: dark red-brown body, six legs, cream/white mandibles, a lighter
  gaster. Small (~20 px tall at source scale). Carries a pale sickle blade
  in one scene.
- **Hanging lamp**: a black chain descending from the top of frame, ending
  in a wide dark dome/mushroom cap, ringed with amber flame pixels, with
  violet flame licks on both sides. The glow spills warm light onto the
  soil below.
- **Violet mushroom**: a dark violet dome cap on a pale stem, with a violet
  glow underneath. Two of them, plus scattered in the underground.
- **Roots**: thin pale-brown branching strands hanging from the surface
  line down into the soil.
- **Ember**: small amber dots that drift.

## Typography

- Chunky pixel font, ~5×7 to 6×8 grid, all caps, no lowercase.
- Two-tone per line: some words **cream** (`#e8e0d0`), others **amber**
  (`#f0a83c`), with a **dark brown outline** and a hard drop shadow.
- Centred, sitting in the bottom band with generous margin.
- A one-word accent line can sit alone (e.g. `FORMIGAS` in the egg card).
- The accents are diacritics that the pixel font must support: `É` in
  `GÉU`, `Ã` in `VIRA FORMIGA` (shown as `VIRA FORMIGA`), `Ç` in `CAVOU`.

## Story beats visible in the stills

Reading the captions in order, the reel is narrated by the ant **in the second person, in the
present tense** — it is telling the viewer what the viewer just did by following:

1. `ESTE FORMIGUEIRO / FORMIGAS` — **the claim**. A title card over a surface +
   underground split, with a golden ring/egg emblem between the two lines.
2. `QUER SER` + `VIRA FORMIGA` — **the want**, in the first person. Underground,
   the lamp hangs above and two violet mushrooms flank the frame.
3. `VIRA FORMIGA` + `QUEM SEGUE` — **the invitation**. The same words as the
   end of shot 2, but now the subject has dropped: *you* become an ant. The
   lamp is bigger and lower — the light is overhead, because "quem segue" means
   arriving from above.
4. `DO GÉU` + `ELA CAVOU` — **the tease**. The surface, green stalks, the ant
   digging with a pale blade. The subject changes again: *she* dug.
5. `ESTE FORMIGUEIRO / FORMIGAS` — the closing card, the emblem shrinking away.

The reel is a vertical, captioned, pixel-art short with a warm underground
palette and a single amber light source. Its subject is **the viewer**, not the
ant — see [../references/storytelling.md](../references/storytelling.md).
