# Technique — how the pixel buffer works

This is the machinery behind the look. Read it before changing anything in `src/pixel.js`,
`src/scene.js` or `src/font.js`.

## The buffer

`Pix` is a 180×320 grid of RGB floats plus an alpha channel. Everything is drawn at this size and
blown up ×6 at the very end with `imageSmoothingEnabled = false`.

```js
const pix = new Pix(W, H);      // 180 x 320
pix.set(x, y, '#441c17');       // opaque
pix.blend(x, y, '#f0a83c', .4); // source-over
pix.add(x, y, '#f0a83c', .6);   // additive — for light
```

`set` replaces, `blend` mixes in at an alpha, `add` adds light and clamps at 255. `add` is for
things that glow (flame, embers, the light pool); `blend` is for things that are painted.

The buffer is cleared at the start of every frame (`renderFrame` calls `pix.clear()`). Frames are
rendered in parallel and out of order, so a buffer that carries state between frames would show
it as flicker.

## Why float and not bytes

Because `add` accumulates. A byte buffer would clip at 255 and a glow would turn into a flat
white disc. With floats the falloff stays smooth, and `toCanvas` does the conversion once.

## The dither

A smooth vertical gradient across 180 pixels looks like a photographic gradient. The reference
**dithers** the sky: a 4×4 Bayer matrix decides, per pixel, whether the row takes the lighter or
the darker sky tone.

```js
const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
// threshold = B[y % 4][x % 4] / 16
```

The density of the dither rises toward the horizon (where the gradient is steepest) and falls off
at the top. `Pix.dither()` does this in one call; `drawSky` does it inline so the density can
follow the gradient.

Because the buffer is 180 wide, the 4-pixel Bayer cells are clearly visible — that is the point.
On a 1920-wide canvas the same pattern would be invisible.

## The noise lattice

The soil must look organic. Two ways to do it, one wrong:

**Wrong — per-row noise.** `noise1(y * 0.18)` sampled per row draws horizontal stripes, because
every pixel in a row gets the same value. It reads as a venetian blind.

**Right — a small lattice, bilinearly interpolated.** Sample a noise value at every 4th pixel and
interpolate between them:

```js
const LAT = 4;
const lx = x / LAT, lx0 = Math.floor(lx), fx = lx - lx0;
const v = (lat(lx0, ly0) * (1 - fx) + lat(lx0 + 1, ly0) * fx) * (1 - fy)
          + (lat(lx0, ly0 + 1) * (1 - fx) + lat(lx0 + 1, ly0 + 1) * fx) * fy;
```

A 4-pixel lattice still shows its cells as faint rectangles, so a **second, finer octave** (2 px,
hash-based) is mixed in at ~28% to break them up.

## The light pool

The lamp's pool of light is an **ellipse**, not a circle, and its falloff must reach exactly zero
at the boundary:

```js
const dx = (x - cx) / rx, dy = (y - cy) / ry;
const d = Math.sqrt(dx * dx + dy * dy);
if (d >= 1) continue;
const a = Math.pow(1 - d * d, 2.4) * strength;   // -> 0 at d = 1
```

And it falls **downward**: the vertical radius is squashed upwards (`dy < 0 ? dy * 4 : dy`), so
the light does not climb above the lamp. A glow in every direction flattens the whole frame.

## The pixel font

Each glyph is an array of strings, `#` for ink and `.` for transparent, in a 5×7 box:

```js
'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
```

The cell is 6 wide and 8 tall — one column and one row of side bearing, so letters sit apart
instead of touching. Drawing a glyph at scale *s* fills *s*×*s* buffer pixels per dot, which is
what makes the type look chunky at 1080 wide.

Accented capitals are a base glyph plus a mark drawn *above* it:

```js
'É': ['E', 'mark-up'],      // and MARKS['mark-up'] = ['...#.', '..#..']
```

So a caption containing an accent needs headroom above the line.

### Two-tone colouring

`drawText` splits the line into words and cycles a colour list across them, which is exactly the
reference's cream/amber alternation:

```js
caption(pix, 'QUER SER', y, { colors: [PAL.cream, PAL.amber] });
```

### Fit to the frame

`drawText` shrinks the scale until the line fits inside `fit` (default 86%) of the frame width.
A long line therefore comes out one size smaller — which is what the reference does, but if it
looks too small, split it into two lines rather than raising `fit`.

## The outline and shadow

Every caption pixel gets a dark outline on all four sides and a hard drop shadow one pixel down
and to the right. Without them, cream type on brown soil is unreadable at 1080 wide.

Order matters: outline first, then shadow, then the ink — otherwise the ink covers its own
outline.

## Rendering at full resolution

`render.mjs` does **not** screenshot the page. The page carries a scrub bar, and the viewport may
be smaller than the canvas, which would crop the frame. Instead the canvas is copied into a
fixed-position 1080×1920 element and that element is screenshotted:

```js
const c = tmp.getContext('2d');
c.imageSmoothingEnabled = false;
c.drawImage(document.getElementById('out'), 0, 0, W, H);
```

`imageSmoothingEnabled = false` on **both** canvases — the upscale to the buffer and the copy to
the shot canvas. If either is smoothed, the pixel grid turns into mush.

## Performance

A frame is ~40–60 ms in headless Chrome with a software GL stack. The cost is dominated by the
number of `set` calls: the soil alone is 180×320 = 57,600 per frame.

To go faster:

- Draw the soil at a lower resolution and scale it up (the noise is smooth enough to survive).
- Skip the second octave of the noise.
- Reduce the number of pebbles and embers.

Do **not** try to speed it up by drawing at full resolution — that defeats the style.
