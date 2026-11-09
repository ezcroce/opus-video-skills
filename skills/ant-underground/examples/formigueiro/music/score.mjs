// score.mjs — synthesizes the score from the same timeline the picture uses.
//
//   node music/score.mjs            -> assets/score.wav
//
// The world is underground and warm, so the score is a low drone with a slow
// pulse, a soft mallet that marks each shot change, and a breath of air that
// swells into the transitions. Everything is generated in code: no samples.
//
// Read cues.js for the shot list and the hit points, so the music is locked to
// the picture by construction.

import { writeFileSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SR = 44100;

// ---- read the timeline -------------------------------------------------------------------------
const cuesSrc = readFileSync(resolve(ROOT, 'src/cues.js'), 'utf8');
const num = (k, d) => {
  const m = cuesSrc.match(new RegExp(k + '\\s*:\\s*([0-9.]+)'));
  return m ? parseFloat(m[1]) : d;
};
const DUR = num('dur', 23);
const BPM = num('bpm', 96);
const shots = [...cuesSrc.matchAll(/\{ t:\s*([0-9.]+),\s*name:\s*'([^']+)'/g)]
  .map(m => ({ t: parseFloat(m[1]), name: m[2] }));

// ---- a tiny synth -------------------------------------------------------------------------------
const N = Math.round(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);

const add = (i, l, r) => {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
};

const TAU = Math.PI * 2;
const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

/** a sine with a slow pitch drift */
function drone(start, dur, freq, gain, pan = 0) {
  const s0 = Math.round(start * SR), n = Math.round(dur * SR);
  let ph = 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // a slow swell in and out
    const env = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.2);
    const f = freq * (1 + Math.sin(t * 0.7) * 0.002);
    ph += TAU * f / SR;
    const v = Math.sin(ph) * gain * env;
    const j = s0 + i;
    add(j, v * gl, v * gr);
  }
}

/** a soft mallet: a short sine with a fast decay — marks the shot changes */
function mallet(at, freq, gain = 0.34, decay = 1.1) {
  const s0 = Math.round(at * SR), n = Math.round(decay * 2.2 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (5.2 / decay)) * Math.min(1, t * 200);
    const v = (Math.sin(TAU * freq * t) * 0.7 + Math.sin(TAU * freq * 2.01 * t) * 0.22) * gain * env;
    add(s0 + i, v, v);
  }
}

/** a filtered-noise breath that swells into a transition */
function breath(at, dur, gain = 0.10, pan = 0) {
  const s0 = Math.round(at * SR), n = Math.round(dur * SR);
  let lp = 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, k = t / dur;
    const env = Math.sin(k * Math.PI) ** 1.6;
    const noise = rnd() * 2 - 1;
    lp += (noise - lp) * 0.035;                     // one-pole lowpass
    const v = lp * gain * env;
    add(s0 + i, v * gl, v * gr);
  }
}

/** a low sub pulse on the beat */
function pulse(at, freq, gain = 0.22, decay = 0.5) {
  const s0 = Math.round(at * SR), n = Math.round(decay * 3 * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (6.0 / decay));
    ph += TAU * (freq * (1 - t * 0.4)) / SR;
    const v = Math.sin(ph) * gain * env;
    add(s0 + i, v, v);
  }
}

// ---- the arrangement -----------------------------------------------------------------------------
// A low drone that moves with the picture. The pitch rises as the ant climbs:
// A1 in the anthill, C2 at the surface — the ladder, in the music too.
const droneNotes = [
  { at: 0,  freq: 55.0,  gain: 0.10 },   // A1
  { at: 9,  freq: 61.7,  gain: 0.11 },   // B1  - the climb
  { at: 14, freq: 65.4,  gain: 0.11 },   // C2  - the surface
  { at: 19, freq: 55.0,  gain: 0.12 },   // back to A1 for the outro
];
for (const d of droneNotes) drone(d.at, Math.min(DUR, DUR - d.at), d.freq, d.gain);

// a fifth above, quieter, for the underground shots
drone(0, 9.0, 82.4, 0.045, -0.2);
drone(9.0, 5.0, 98.0, 0.045, 0.2);
drone(14.0, 5.0, 98.0, 0.05, 0.0);

// a mallet on each shot change
const malletNotes = [0, 4, 9, 14, 19];
malletNotes.forEach((at, i) => {
  mallet(at + 0.02, [110, 98, 87, 131, 110][i] ?? 110, 0.30, 1.2);
  mallet(at + 0.02, [(110, 98, 87, 131, 110)[i] ?? 110] * 2, 0.10, 0.7);
});

// a breath that swells into every transition
for (const at of malletNotes.slice(1)) breath(at - 0.85, 0.9, 0.085, 0);

// the heartbeat pulse, under the underground scenes — it speeds up as she climbs
const beat = 60 / BPM;
let step = beat * 2;
for (let t = 0; t < DUR; t += step) {
  const inSurface = t >= 14 && t < 19;
  if (inSurface) continue;                       // the surface is brighter, quieter
  pulse(t, 41.2, inSurface ? 0.1 : 0.17, 0.55);
  // from the climb onward the pulse comes faster
  if (t >= 9) step = beat * 1.5;
}

// a high sparkle on the surface shot
for (let t = 14.2; t < 18.6; t += beat) {
  mallet(t, 523.25 * (rnd() > 0.5 ? 1 : 1.5), 0.045, 0.5);
}

// ---- write it -------------------------------------------------------------------------------------
function toWav(samplesL, samplesR) {
  const n = samplesL.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, samplesL[i]));
    const r = Math.max(-1, Math.min(1, samplesR[i]));
    buf.writeInt16LE((l * 32767) | 0, 44 + i * 4);
    buf.writeInt16LE((r * 32767) | 0, 44 + i * 4 + 2);
  }
  return buf;
}

// soft-clip and normalise
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0 ? 0.82 / peak : 1;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * norm * 1.1);
  R[i] = Math.tanh(R[i] * norm * 1.1);
}

mkdirSync(resolve(ROOT, 'assets'), { recursive: true });
const out = resolve(ROOT, 'assets/score.wav');
writeFileSync(out, toWav(L, R));
console.log(`wrote ${out}  (${DUR}s, ${BPM} BPM, ${shots.length} shots)`);
