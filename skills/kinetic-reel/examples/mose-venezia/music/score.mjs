// score.mjs — the music, synthesized in Node from the same cues: felt piano, low pizzicato, air, a soft kick on the beat,
// and a rising sub under the gates. Writes music/score.wav (48 kHz, stereo, 16-bit).
import { writeFileSync } from 'node:fs';
import { S, DUR, BEAT } from '../src/cues.js';

const RATE = 48000;
const N = Math.ceil(DUR * RATE);
const L = new Float32Array(N), R = new Float32Array(N);
const TAU = Math.PI * 2;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise = (seed, i) => hash(seed * 7919 + i) * 2 - 1;

const put = (t, v, pan = 0) => {
  const i = Math.round(t * RATE);
  if (i < 0 || i >= N) return;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  L[i] += v * gl; R[i] += v * gr;
};

// A felt piano note: sine fundamental, two soft partials, a hammer noise tick, long exponential tail.
function piano(t0, note, { vel = 0.3, len = 3.2, pan = 0 } = {}) {
  const f = midi(note), start = Math.round(t0 * RATE), n = Math.round(len * RATE);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 1.6) * (1 - Math.exp(-t * 260));
    const s = Math.sin(TAU * f * t) + 0.33 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3)
      + 0.12 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 5);
    const hammer = noise(note, i) * Math.exp(-t * 90) * 0.05;
    const j = start + i;
    if (j < N) {
      const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
      L[j] += (s + hammer) * env * vel * gl;
      R[j] += (s + hammer) * env * vel * gr;
    }
  }
}

// Low pizzicato: a plucked string with a fast decay, used as the pulse under the gates.
function pizz(t0, note, { vel = 0.2, pan = 0 } = {}) {
  const f = midi(note), start = Math.round(t0 * RATE), n = Math.round(0.5 * RATE);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 9) * (1 - Math.exp(-t * 400));
    phase += TAU * f / RATE;
    const s = Math.sin(phase) + 0.5 * Math.sin(2 * phase) * Math.exp(-t * 20);
    const j = start + i;
    if (j < N) {
      const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
      L[j] += s * env * vel * gl; R[j] += s * env * vel * gr;
    }
  }
}

function kick(t0, vel = 0.5) {
  const start = Math.round(t0 * RATE), n = Math.round(0.32 * RATE);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = 52 + 90 * Math.exp(-t * 30);
    const env = Math.exp(-t * 12);
    const s = Math.sin(TAU * f * t) * env * vel;
    const j = start + i;
    if (j < N) { L[j] += s; R[j] += s; }
  }
}

function air(t0, len, { vel = 0.05, up = true } = {}) {
  const start = Math.round(t0 * RATE), n = Math.round(len * RATE);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE, p = i / n;
    const env = Math.sin(Math.PI * p) ** 1.6 * vel;
    const cutoff = 0.02 + 0.25 * (up ? p : 1 - p);
    lp += cutoff * (noise(3, i) - lp);
    const s = lp * env;
    const j = start + i;
    if (j < N) { L[j] += s * 0.7; R[j] += s * (1 - 0.7); }
  }
}

// sub swell: a slowly rising low tone, for the moment the gates come up
function swell(t0, len, { note = 26, vel = 0.16 } = {}) {
  const start = Math.round(t0 * RATE), n = Math.round(len * RATE), f = midi(note);
  for (let i = 0; i < n; i++) {
    const t = i / RATE, p = i / n;
    const env = Math.pow(p, 2.2) * Math.exp(-Math.max(0, p - 0.85) * 12);
    const s = Math.sin(TAU * f * t) * env * vel;
    const j = start + i;
    if (j < N) { L[j] += s; R[j] += s; }
  }
}

// --- arrangement -----------------------------------------------------------------------------
// Harmony: D minor. i – VI – III – VII (Dm – Bb – F – C), one chord per 4 beats, whole piece.
const CHORDS = [
  { root: 50, notes: [50, 57, 62, 65] }, // Dm
  { root: 46, notes: [46, 53, 58, 62] }, // Bb
  { root: 41, notes: [41, 48, 53, 57] }, // F
  { root: 48, notes: [48, 55, 60, 64] }, // C
];
const bars = Math.ceil(DUR / (BEAT * 4));
for (let b = 0; b < bars; b++) {
  const ch = CHORDS[b % 4];
  const t0 = b * BEAT * 4;
  // a slow broken figure, on the beat
  ch.notes.forEach((n, k) => piano(t0 + k * BEAT, n + 12, { vel: 0.12 - k * 0.012, len: 4.5, pan: -0.35 + k * 0.22 }));
  // bass note at the bar, held
  piano(t0, ch.root - 12, { vel: 0.16, len: 6, pan: 0 });
}

// pulse enters with the gates (raise) and leaves at the doubts
const pulseFrom = S.raise[0], pulseTo = S.doubts[0];
for (let t = pulseFrom; t < pulseTo; t += BEAT) {
  const inRaise = t < S.raise[1];
  pizz(t, t % (BEAT * 8) < BEAT * 4 ? 38 : 36, { vel: inRaise ? 0.13 : 0.09, pan: 0.15 });
  if (t >= S.result[0] && t < S.result[1]) kick(t, 0.42);
}

// gates: a rising sub + air from the first gate to the close, quiet under speech
swell(S.raise[0] + 1.0, 14.0, { note: 26, vel: 0.13 });
swell(S.doubts[0], 8.0, { note: 29, vel: 0.10 });
air(0.0, 3.2, { vel: 0.05 });
air(S.raise[0], 0.6, { vel: 0.16, up: false });   // the machinery's first breath
air(S.raise[1] - 0.5, 1.4, { vel: 0.07 });
air(S.doubts[0], 1.6, { vel: 0.06, up: false });

// accents on the cut points: a single high bell and a low thud
piano(S.cold[0] + 0.05, 74, { vel: 0.1, len: 5 });
piano(S.close[0] + 0.05, 62, { vel: 0.14, len: 6 });
piano(S.result[0] + 0.02, 69, { vel: 0.12, len: 3 });

// --- master ----------------------------------------------------------------------------------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? 0.72 / peak : 1;
for (let i = 0; i < N; i++) {
  // soft knee, then the fade at both ends
  const soft = v => Math.abs(v) < 0.5 ? v : Math.sign(v) * (0.5 + 0.5 * Math.tanh((Math.abs(v) - 0.5) / 0.5) * 0.9);
  const fi = Math.min(1, i / (0.6 * RATE));
  const fo = Math.min(1, (N - i) / (2.6 * RATE));
  L[i] = soft(L[i] * g) * fi * fo;
  R[i] = soft(R[i] * g) * fi * fo;
}

// 16-bit stereo WAV by hand (no dependencies)
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(RATE, 24);
buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32000), 46 + i * 4);
}
writeFileSync('music/score.wav', buf);
console.log(`music/score.wav  ${DUR.toFixed(1)} s  ${(buf.length / 1e6).toFixed(1)} MB`);
