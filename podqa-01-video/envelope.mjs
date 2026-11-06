// Speech envelope from the episode audio: one value per video frame, so the mouth can follow the voice.
//   node envelope.mjs   ->  envelope.json  { fps, frames: [[open, spread], ...] }
// open   = mouth opening 0..1 (RMS in dB, fast attack, slow release, silenced below the noise floor)
// spread = lip spread 0..1 (zero-crossing rate: bright/front vowels open wider than dark ones)
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const AUDIO = process.env.AUDIO || '../episodes/podqa-01.mp3';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = Number(process.env.FPS || 24);
const SR = 8000;

const raw = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', AUDIO, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
if (raw.status !== 0) { console.error(String(raw.stderr)); process.exit(1); }
const buf = raw.stdout;
const n = Math.floor(buf.length / 4);
const pcm = new Float32Array(buf.buffer, buf.byteOffset, n);

const hop = SR / FPS;
const dur = n / SR;
const frames = Math.ceil(dur * FPS);

const dbToOpen = (db) => Math.max(0, Math.min(1, (db + 42) / 34));   // -42 dB floor, -8 dB fully open
let open = 0;
const out = [];
for (let i = 0; i < frames; i++) {
  const a = Math.floor(i * hop), b = Math.min(n, Math.floor((i + 1) * hop));
  let sum = 0, zc = 0, prev = pcm[a] || 0;
  for (let j = a; j < b; j++) {
    const v = pcm[j];
    sum += v * v;
    if ((v >= 0) !== (prev >= 0)) zc++;
    prev = v;
  }
  const len = Math.max(1, b - a);
  const rms = Math.sqrt(sum / len);
  const db = rms > 1e-7 ? 20 * Math.log10(rms) : -90;
  const target = dbToOpen(db);
  // fast attack (the mouth is already moving), slow release (it does not snap shut)
  open += (target - open) * (target > open ? .55 : .18);
  const zcr = zc / len;
  const spread = Math.max(0, Math.min(1, (zcr - .04) * 4.2));
  out.push([+open.toFixed(3), +(spread * (open > .05 ? 1 : 0)).toFixed(3)]);
}

writeFileSync('envelope.json', JSON.stringify({ fps: FPS, duration: dur, frames: out }));
const loud = out.filter(([o]) => o > .15).length;
console.log(`envelope.json  ${frames} frames @ ${FPS}fps  (${dur.toFixed(2)}s)  ${(loud / frames * 100).toFixed(0)}% voiced`);
console.log(`  open    mean ${(out.reduce((a, f) => a + f[0], 0) / frames).toFixed(3)}  max ${Math.max(...out.map(f => f[0])).toFixed(3)}`);
console.log(`  spread  mean ${(out.reduce((a, f) => a + f[1], 0) / frames).toFixed(3)}`);
