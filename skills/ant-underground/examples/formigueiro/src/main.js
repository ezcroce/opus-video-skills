// main.js — the page entry point.
//
// The renderer asks the page for a frame at a given time; the page paints it
// into the visible canvas. window.renderFrame(t) is the only contract the
// renderer needs.

import { Pix, W, H, SCALE } from './pixel.js';
import { renderFrame } from './shots.js';

const cues = window.CUES;
const canvas = document.getElementById('out');
const ctx = canvas.getContext('2d', { alpha: false });
const scrub = document.getElementById('scrub');
const tt = document.getElementById('tt');

const pix = new Pix(W, H);
// the camera helpers in scene.js need a 2d context on the buffer
pix._ctx = pix._toImage().getContext('2d');

let current = 0;

function paint(t) {
  current = t;
  renderFrame(pix, t, cues);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pix.toCanvas(ctx, SCALE, 0);
  tt.textContent = `${t.toFixed(2)}s / ${cues.dur.toFixed(2)}s`;
}

/** the renderer's entry point */
window.renderFrame = t => { paint(t); return true; };
window.DUR = cues.dur;

if (scrub) {
  scrub.max = String(cues.dur);
  scrub.addEventListener('input', () => paint(parseFloat(scrub.value)));
}

paint(0);
window.__ready = true;
