// mix.mjs — voice + score → out/mix.wav. Measures each clip itself and writes the durations back into cues.js,
// so the subtitles and the picture always agree with the voice that actually exists.
import { readFileSync, writeFileSync } from 'node:fs';
import { VO, DUR } from '../src/cues.js';
// a tiny WAV reader, same behaviour as podcast-studio's, so this example stands alone
function readWavFile(file) {
  const b = readFileSync(file);
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4), size = b.readUInt32LE(pos + 4), start = pos + 8;
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(start), channels: b.readUInt16LE(start + 2), rate: b.readUInt32LE(start + 4), bits: b.readUInt16LE(start + 14) };
    else if (id === 'data') data = b.subarray(start, Math.min(start + size, b.length));
    pos = start + size + (size % 2);
  }
  const { channels: nch, bits, format, rate } = fmt, bytes = bits / 8;
  const frames = Math.floor(data.length / (bytes * nch));
  const channels = Array.from({ length: nch }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < nch; c++) {
    const o = (i * nch + c) * bytes;
    channels[c][i] = format === 3 ? (bits === 64 ? data.readDoubleLE(o) : data.readFloatLE(o))
      : bits === 8 ? (data[o] - 128) / 128 : bits === 16 ? data.readInt16LE(o) / 32768 : data.readInt32LE(o) / 2147483648;
  }
  return { rate, channels, frames };
}
const readWav = readWavFile;
const mono = ({ channels }) => channels[0];
function resample(x, from, to) {
  if (from === to) return x;
  const n = Math.round(x.length * to / from), out = new Float32Array(n), step = from / to;
  for (let i = 0; i < n; i++) { const p = i * step, j = Math.floor(p), f = p - j; out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f; }
  return out;
}

const RATE = 48000;
const N = Math.ceil(DUR * RATE);
const mixL = new Float32Array(N), mixR = new Float32Array(N);
const music = readWav('music/score.wav');

// voice bus (mono → both channels), with a small high-pass and a 3 ms edge fade so clips don't click
const voice = new Float32Array(N);
const measured = [];
for (const vo of VO) {
  const w = readWav(vo.file);
  const x = resample(mono(w), w.rate, RATE);
  const secs = x.length / RATE;
  measured.push({ id: vo.id, secs });
  const start = Math.round(vo.at * RATE);
  // one-pole high-pass at 90 Hz, twice
  const hp = (arr) => {
    const rc = 1 / (2 * Math.PI * 90), a = rc / (rc + 1 / RATE);
    let prev = 0, last = 0; const out = new Float32Array(arr.length);
    for (let pass = 0; pass < 2; pass++) {
      prev = 0; last = 0;
      for (let i = 0; i < arr.length; i++) { const v = pass === 0 ? arr[i] : out[i]; last = a * (last + v - prev); prev = v; out[i] = last; }
    }
    return out;
  };
  const y = hp(x);
  const fadeN = Math.round(0.006 * RATE);
  for (let i = 0; i < y.length; i++) {
    const e = Math.min(1, i / fadeN, (y.length - 1 - i) / fadeN);
    voice[start + i] += y[i] * Math.max(0, e) * 0.95;
  }
}

// ducking envelope: 1 → 0.42 while any voice is on, with 250 ms ramps
const duck = new Float32Array(N).fill(1);
for (const vo of VO) {
  const m = measured.find(v => v.id === vo.id);
  const a = Math.round((vo.at - 0.35) * RATE), b = Math.round((vo.at + m.secs + 0.35) * RATE), ramp = Math.round(0.25 * RATE);
  for (let i = Math.max(0, a - ramp); i < Math.min(N, b + ramp); i++) {
    const up = Math.min(1, Math.max(0, (i - (a - ramp)) / ramp));
    const down = Math.min(1, Math.max(0, ((b + ramp) - i) / ramp));
    duck[i] = Math.min(duck[i], 1 - 0.58 * Math.min(up, down));
  }
}

const m = { L: resample(mono(music), music.rate, RATE), R: resample(music.channels[1] ?? mono(music), music.rate, RATE) };
const MUSIC_GAIN = 0.42;
for (let i = 0; i < N; i++) {
  mixL[i] = voice[i] + (m.L[i] ?? 0) * MUSIC_GAIN * duck[i];
  mixR[i] = voice[i] + (m.R[i] ?? 0) * MUSIC_GAIN * duck[i];
}

// master: peak to -1.5 dBFS with a soft knee
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
const g = peak > 0 ? 0.84 / peak : 1;
const soft = v => Math.abs(v) < 0.6 ? v : Math.sign(v) * (0.6 + 0.4 * Math.tanh((Math.abs(v) - 0.6) / 0.4));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(RATE, 24);
buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, soft(mixL[i] * g))) * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, soft(mixR[i] * g))) * 32000), 46 + i * 4);
}
writeFileSync('out/mix.wav', buf);

// durations back into cues.js so subtitles stay in sync with what was actually spoken
let cues = readFileSync('src/cues.js', 'utf8');
for (const m2 of measured) {
  const re = new RegExp(`(id: '${m2.id}', at: [\\d.]+, file: '[^']+',)`);
  cues = cues.replace(re, `$1 dur: ${m2.secs.toFixed(2)},`);
}
writeFileSync('src/cues.js', cues);

console.log('out/mix.wav', `${(N / RATE).toFixed(1)} s`, `peak gain ${g.toFixed(2)}`);
let total = 0, prevEnd = 0;
for (const vo of VO) {
  const mm = measured.find(v => v.id === vo.id);
  total += mm.secs;
  console.log(`  ${vo.id}  at ${vo.at.toFixed(1)}s  ${mm.secs.toFixed(2)}s` + (vo.at < prevEnd ? '  ← OVERLAPS the previous clip' : ''));
  prevEnd = vo.at + mm.secs;
}
console.log(`  speech ${total.toFixed(1)} s of ${DUR} s (${Math.round((total / DUR) * 100)}%)`);
