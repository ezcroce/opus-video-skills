// font.js — a chunky bitmap font, the way the reference captions are set.
//
// Each glyph is a bitmap of rows of characters ('#' = ink, '.' = transparent).
// The house style is 5x7 in a 6x8 cell: one column and one row of side bearing,
// so letters sit apart instead of touching.
//
// The reference captions need Latin caps plus a few accents (É, Ã, Ç, Õ, Á,
// À, Â, Ê) — those are baked into the glyph table so a caption can be typed
// with real accents and still render on the pixel grid.

import { mix, PAL } from './pixel.js';

const G = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],

  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '–': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#.##.'],
  '…': ['.....', '.....', '.....', '.....', '.....', '#.#.#', '.....'],
};

// accented capitals: base glyph plus a mark row above (the cell grows by 2 rows)
const ACC = {
  'Á': ['A', 'mark-up'], 'À': ['A', 'mark-up'], 'Â': ['A', 'mark-circ'],
  'Ã': ['A', 'mark-tilde'], 'É': ['E', 'mark-up'], 'Ê': ['E', 'mark-circ'],
  'Í': ['I', 'mark-up'], 'Ó': ['O', 'mark-up'], 'Ô': ['O', 'mark-circ'],
  'Õ': ['O', 'mark-tilde'], 'Ú': ['U', 'mark-up'], 'Ü': ['U', 'mark-dia'],
  'Ç': ['C', 'mark-cedilla'], 'Ñ': ['N', 'mark-tilde'],
};

const MARKS = {
  'mark-up':     ['...#.', '..#..'],
  'mark-circ':   ['..#..', '.###.'],
  'mark-tilde':  ['.###.', '#...#'],
  'mark-dia':    ['#.#.#'],
  'mark-cedilla': ['..#..'],
};

export const CELL_W = 6;    // 5 ink columns + 1 side bearing
export const CELL_H = 8;    // 7 ink rows    + 1 side bearing
export const LINE_H = 11;   // baseline spacing between caption lines

/** width in low-res pixels of a string */
export function measure(text, tracking = 1) {
  if (!text) return 0;
  return text.length * CELL_W * tracking - tracking;
}

/**
 * Draw a caption line.
 *
 * @param pix     Pix buffer
 * @param text    the line
 * @param x       left edge (low-res px)
 * @param y       top edge of the glyph cell (low-res px)
 * @param colors  array of colors; the text is split into words and coloured
 *                in a cycle, which is how the reference captions alternate
 *                cream and amber word by word
 * @param opts    { tracking, outline, shadow, scale, fit }
 *
 * `fit` is the fraction of the frame width the line may occupy. When the text
 * would overflow, the scale drops until it fits — a long title line is set
 * smaller rather than running off the frame, which is what the reference does.
 */
export function drawText(pix, text, x, y, colors = [PAL.cream], opts = {}) {
  const tracking = opts.tracking ?? 1;
  const outline = opts.outline ?? true;
  const shadow = opts.shadow ?? true;
  let scale = opts.scale ?? 1;
  const fit = opts.fit ?? 0.86;

  // shrink to fit the frame
  const maxW = Math.floor(pix.w * fit);
  const wAt = s => measure(String(text), tracking) * s;
  while (scale > 1 && wAt(scale) > maxW) scale--;

  const words = String(text).split(' ');
  const palette = colors.length ? colors : [PAL.cream];

  // measure the whole line first so it can be centred
  const total = wAt(scale);
  let cx = opts.center ? Math.round((pix.w - total) / 2) : x;

  let wordIndex = 0;
  for (const word of words) {
    const color = palette[wordIndex % palette.length];
    wordIndex++;
    for (const ch of word.toUpperCase()) {
      const acc = ACC[ch];
      const base = acc ? acc[0] : ch;
      const rows = G[base];
      if (rows) {
        // the accent mark sits above the glyph
        if (acc) {
          const mark = MARKS[acc[1]];
          if (mark) {
            for (let m = 0; m < mark.length; m++) {
              for (let i = 0; i < mark[m].length; i++) {
                if (mark[m][i] !== '#') continue;
                px_(pix, cx + (i + 1) * scale, y + m * scale, color, outline, shadow, scale);
              }
            }
          }
        }
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            if (rows[r][c] !== '#') continue;
            px_(pix, cx + (c + 1) * scale, y + (r + 1) * scale, color, outline, shadow, scale);
          }
        }
      }
      cx += CELL_W * tracking * scale;
    }
    cx += CELL_W * tracking * scale;   // the space
  }
  return total;
}

function px_(pix, x, y, color, outline, shadow, scale) {
  if (outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          pix.set(x + dx * scale + sx, y + dy * scale + sy, PAL.ink);
        }
      }
    }
  }
  if (shadow) {
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        pix.set(x + scale + sx, y + scale + sy, PAL.ink);
      }
    }
  }
  for (let sy = 0; sy < scale; sy++) {
    for (let sx = 0; sx < scale; sx++) {
      pix.set(x + sx, y + sy, color);
    }
  }
}

/** convenience: a two-tone caption in the house style, centred */
export function caption(pix, text, y, opts = {}) {
  return drawText(pix, text, 0, y, opts.colors ?? [PAL.cream, PAL.amber],
    { center: true, scale: 2, ...opts });
}
