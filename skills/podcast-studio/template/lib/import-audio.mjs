// import-audio.mjs: bring audio the user already has (ElevenLabs, a phone recording, an interview) into a project.
//
//   node lib/import-audio.mjs <file.wav> --id=<line-id> [--id=<line-id> ...]     copy/convert one file to those ids
//   node lib/import-audio.mjs <file.mp3> --id=<line-id> --at=0:12.5              take a slice (needs ffmpeg)
//   node lib/import-audio.mjs <file.wav> --split=<id>=0:12.4,<id>=12.4:26.9       several slices from one file
//   node lib/import-audio.mjs --plan                                            print every line id with its text
//
// WAV is handled natively. Anything else (MP3, M4A, Opus, MP4) is converted through ffmpeg if it is installed:
// mono, 44.1 kHz, 16-bit PCM. The ids come from the line plan — never type them from memory:
//   node lib/lines.mjs --json     (pending)      node lib/lines.mjs --json --all     (every line)
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseScript } from './script.mjs';
import { readWav, mono } from './wav.mjs';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const cfg = existsSync('podcast.config.json') ? JSON.parse(readFileSync('podcast.config.json', 'utf8')) : {};
const voices = existsSync('voices.json') ? JSON.parse(readFileSync('voices.json', 'utf8')) : {};
const script = parseScript(cfg.script || 'script.md', { voices });
const rate = +(cfg.rate || 44100);
const clipDir = cfg.clipDir || 'assets/voice';
const lines = script.lines.filter(l => l.kind === 'line');

if (args.plan) {
  for (const l of lines) console.log(`${l.id}\t${l.speaker}\t${l.text.slice(0, 90)}`);
  process.exit(0);
}

const input = argv.find(a => !a.startsWith('--'));
if (!input) { console.log('usage: node lib/import-audio.mjs <audio> --id=<line-id> [--at=a:b] | --split=<id>=a:b,...'); process.exit(1); }
if (!existsSync(input)) { console.error(`no such file: ${input}`); process.exit(1); }
const isWav = /\.wav$/i.test(input);

const ids = String(args.id || '').split(',').filter(Boolean);
const slices = args.split
  ? String(args.split).split(',').map(s => { const [id, at] = s.split('='); const [a, b] = String(at).split(':'); return { id, a: +a, b: b === undefined ? undefined : +b }; })
  : ids.map(id => ({ id, ...sliceOf(args.at) }));

if (!slices.length) { console.error('no target ids: pass --id=<line-id> or --split=<id>=start:end'); process.exit(1); }
for (const s of slices) {
  if (!lines.some(l => l.id === s.id)) {
    console.error(`unknown line id: ${s.id}`);
    console.error(`known ids: ${lines.slice(0, 6).map(l => l.id).join(', ')} …  (node lib/import-audio.mjs --plan)`);
    process.exit(1);
  }
}
if (slices.some(s => s.a !== undefined) && !hasFfmpeg()) {
  console.error('slicing needs ffmpeg (it is not installed). Trim the file another way, or import the whole clip.');
  process.exit(1);
}

for (const s of slices) {
  const out = `${clipDir}/${s.id}.wav`;
  if (isWav && s.a === undefined) { copyFileSync(input, out); console.log(`${input} → ${out}`); continue; }
  if (s.a === undefined) { convert(input, out); console.log(`${input} → ${out} (converted)`); continue; }
  convert(input, out, s.a, s.b);
  console.log(`${input} [${s.a}–${s.b ?? 'end'}] → ${out}`);
}

function sliceOf(at) {
  if (!at) return {};
  const [a, b] = String(at).split(':');
  return { a: +a, b: b === undefined ? undefined : +b };
}
function hasFfmpeg() { return !spawnSync('ffmpeg', ['-version']).error; }
function convert(src, out, a, b) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...(a !== undefined ? ['-ss', String(a)] : []),
    ...(b !== undefined ? ['-t', String(b - a)] : []), '-i', src, '-ac', '1', '-ar', String(rate), '-c:a', 'pcm_s16le', out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`ffmpeg failed on ${src}`); process.exit(1); }
}

// Report what lands where, and whether the clips look usable (WAV only; converted files are checked on the next build).
let total = 0;
for (const s of slices) {
  const f = `${clipDir}/${s.id}.wav`;
  if (!existsSync(f)) continue;
  try {
    const w = readWav(f);
    const x = mono(w);
    let peak = 0, sq = 0;
    for (const v of x) { peak = Math.max(peak, Math.abs(v)); sq += v * v; }
    const rms = Math.sqrt(sq / Math.max(1, x.length));
    total += x.length / w.rate;
    const quiet = peak < 0.02 ? '  ← almost silent: check the slice or the source' : '';
    console.log(`  ${s.id}  ${(x.length / w.rate).toFixed(1)} s  peak ${(20 * Math.log10(peak || 1e-9)).toFixed(0)} dBFS  rms ${(20 * Math.log10(rms || 1e-9)).toFixed(0)} dBFS${quiet}`);
  } catch (e) {
    console.error(`  ${s.id}: ${e.message}`);
  }
}
console.log(`\n${slices.length} clip(s), ${(total / 60).toFixed(1)} min of speech. Next: node lib/build.mjs --check`);
