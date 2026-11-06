// synth.mjs: intro stings, outro tags and a loopable music bed, generated in code.
// Everything is a pure function of time and of a hash-seeded noise table, so two runs give the same file.
import { writeFileSync } from 'node:fs';

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise = (seed, i) => hash(seed * 7919 + i) * 2 - 1;

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const TAU = Math.PI * 2;

// ADSR envelope, times in seconds
function adsr(t, { a = 0.01, d = 0.1, s = 0.7, r = 0.3, len = 1 }) {
  if (t < 0 || t > len) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * (t - a) / d;
  if (t < len - r) return s;
  return Math.max(0, s * (len - t) / r);
}

// A struck mallet tone: fundamental + soft partials, slightly detuned second voice for width.
function mallet(t, freq, len, { bright = 0.35, seed = 1 } = {}) {
  const e = adsr(t, { a: 0.004, d: len * 0.5, s: 0.18, r: len * 0.5, len });
  if (e <= 0) return 0;
  const w = TAU * freq * t;
  const body = Math.sin(w) + bright * 0.5 * Math.sin(2 * w) * Math.exp(-t * 6) + bright * 0.22 * Math.sin(3.01 * w) * Math.exp(-t * 9);
  const air = 0.05 * noise(seed, Math.floor(t * 22050)) * Math.exp(-t * 18);
  return (body + air) * e;
}

// A warm pad: three detuned saws through a gentle low-pass, slow attack.
function pad(t, freq, len, seed = 1) {
  const e = adsr(t, { a: Math.min(0.25, len * 0.15), d: 0.2, s: 0.8, r: Math.min(1.2, len * 0.4), len });
  if (e <= 0) return 0;
  let s = 0;
  for (let k = 0; k < 3; k++) {
    const det = 1 + (k - 1) * 0.004;
    const ph = freq * det * t + k * 0.31;
    const saw = 2 * (ph - Math.floor(ph)) - 1;
    s += saw / 3;
  }
  const lp = Math.sin(TAU * freq * 2 * t) * 0.06; // cheap "filter" colour
  return (s * 0.5 + lp) * e * (0.9 + 0.1 * noise(seed, Math.floor(t * 40)));
}

function sweep(t, len, seed = 1) { // filtered noise whoosh
  const e = adsr(t, { a: len * 0.6, d: 0.05, s: 0.9, r: len * 0.35, len });
  if (e <= 0) return 0;
  return noise(seed, Math.floor(t * 16000)) * e * 0.35 * Math.exp(-t * 2);
}

const place = (buf, rate, at, sample) => {
  const i = Math.round(at * rate);
  if (i >= 0 && i < buf.length) buf[i] += sample;
};

// Intro sting: rising arpeggio over a pad, ending on a soft swell. Returns { L, R }.
export function sting(rate = 44100, { root = 57, seconds = 5 } = {}) {
  const L = new Float32Array(Math.round(rate * seconds)), R = new Float32Array(Math.round(rate * seconds));
  const chord = [0, 7, 12, 16, 19]; // root, 5th, octave, maj3, 5th+octave
  for (let k = 0; k < chord.length; k++) {
    const at = 0.18 * k, f = midi(root + 12 + chord[k]), len = 2.2;
    for (let i = 0; i < Math.round(len * rate); i++) {
      const t = i / rate;
      const s = mallet(t, f, len, { bright: 0.4, seed: k + 1 }) * 0.28;
      place(L, rate, at + t, s * 1.0);
      place(R, rate, at + t, s * 0.85);
    }
  }
  for (const n of [0, 7, 15]) { // pad underneath
    for (let i = 0; i < Math.round(seconds * rate); i++) {
      const s = pad(i / rate, midi(root + n), seconds, n + 3) * 0.1;
      place(L, rate, i / rate, s);
      place(R, rate, i / rate, s * 0.92);
    }
  }
  for (let i = 0; i < Math.round(seconds * rate); i++) {
    const s = sweep(i / rate, seconds) * 0.08;
    place(L, rate, i / rate, s);
    place(R, rate, i / rate, -s * 0.6);
  }
  fade(L, rate, seconds * 0.35, 0.02);
  fade(R, rate, seconds * 0.35, 0.02);
  return { L, R };
}

// Outro tag: three falling notes with a long tail.
export function tag(rate = 44100, { root = 57, seconds = 4 } = {}) {
  const L = new Float32Array(Math.round(rate * seconds)), R = new Float32Array(Math.round(rate * seconds));
  [12, 7, 0].forEach((n, k) => {
    const at = 0.34 * k, f = midi(root + n + 12), len = seconds - at - 0.1;
    for (let i = 0; i < Math.round(len * rate); i++) {
      const s = mallet(i / rate, f, len, { bright: 0.3, seed: 10 + k }) * 0.24;
      place(L, rate, at + i / rate, s);
      place(R, rate, at + i / rate, s * 0.9);
    }
  });
  for (let i = 0; i < Math.round(seconds * rate); i++) {
    const s = pad(i / rate, midi(root), seconds, 21) * 0.09;
    place(L, rate, i / rate, s);
    place(R, rate, i / rate, s * 0.95);
  }
  fade(L, rate, 0.01, seconds * 0.5);
  fade(R, rate, 0.01, seconds * 0.5);
  return { L, R };
}

// Loopable bed: four bars of a slow chord cycle plus a soft pulse on the beat. Seamless: the pads wrap.
export function bed(rate = 44100, { bpm = 100, bars = 4, root = 45 } = {}) {
  const beat = 60 / bpm, seconds = bars * 4 * beat;
  const L = new Float32Array(Math.round(rate * seconds)), R = new Float32Array(Math.round(rate * seconds));
  const cycle = [[0, 7, 15], [-3, 4, 12], [-5, 2, 11], [-7, 0, 9]]; // I – vi – IV – V-ish, in semitones
  const chordLen = seconds / cycle.length;
  cycle.forEach((notes, c) => {
    for (const n of notes) {
      for (let i = 0; i < Math.round(chordLen * rate); i++) {
        const t = i / rate;
        const s = pad(t, midi(root + n), chordLen, c * 7 + n) * 0.075;
        place(L, rate, c * chordLen + t, s);
        place(R, rate, c * chordLen + t, s * 0.9);
      }
    }
  });
  for (let b = 0; b < bars * 4; b++) { // a felt-piano pulse, not a drum
    const at = b * beat, f = midi(root + 24 + [0, 12, 7, 12][b % 4]);
    for (let i = 0; i < Math.round(beat * rate * 0.9); i++) {
      const s = mallet(i / rate, f, beat * 0.9, { bright: 0.15, seed: b }) * (b % 4 === 0 ? 0.1 : 0.055);
      place(L, rate, at + i / rate, s);
      place(R, rate, at + i / rate, s * 0.88);
    }
  }
  return { L, R, seconds };
}

// Repeat a loopable source to cover `totalSeconds`, equal-power crossfading each seam.
export function loopTo(src, totalSeconds, rate, crossfade = 1.2) {
  const n = Math.round(totalSeconds * rate);
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const len = src.L.length, xf = Math.min(Math.round(crossfade * rate), Math.floor(len / 4));
  for (let o = 0; o < n; o += len - xf) {
    for (let i = 0; i < len && o + i < n; i++) {
      const g = i < xf && o > 0 ? Math.sin((i / xf) * Math.PI / 2) : 1;
      outL[o + i] = outL[o + i] * (1 - g) + src.L[i] * g;
      outR[o + i] = outR[o + i] * (1 - g) + src.R[i] * g;
    }
  }
  return { L: outL, R: outR };
}

export function fade(x, rate, inSec = 0.02, outSec = 0.02) {
  const n = x.length, fi = Math.round(inSec * rate), fo = Math.round(outSec * rate);
  for (let i = 0; i < Math.min(fi, n); i++) x[i] *= i / fi;
  for (let i = 0; i < Math.min(fo, n); i++) x[n - 1 - i] *= i / fo;
  return x;
}

// CLI: node lib/synth.mjs --out=assets/music/bed.wav [--bpm=100] [--rate=44100]
if (process.argv[1] && process.argv[1].endsWith('synth.mjs')) {
  const { writeWav } = await import('./wav.mjs');
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
  const rate = +(args.rate || 44100), kind = args.kind || 'bed';
  const out = args.out || `assets/music/${kind}.wav`;
  const s = kind === 'sting' ? sting(rate) : kind === 'tag' ? tag(rate) : bed(rate, { bpm: +(args.bpm || 100) });
  writeWav(out, s.L, s.R, rate);
  console.log(`${out}  ${(s.L.length / rate).toFixed(1)} s`);
}
