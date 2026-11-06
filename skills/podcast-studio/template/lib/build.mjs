// build.mjs: assemble an episode from per-line clips into one master WAV plus timeline, cue sheet and waveform review image.
//
//   node lib/build.mjs                 build what exists (missing clips are skipped, the rest is timed from them)
//   node lib/build.mjs --check         also error on missing/extra clips and on lines that drift from the estimate
//   node lib/build.mjs --rate=44100    master sample rate (clips are resampled to it)
//
// Reads   voices.json, script.md, assets/voice/<line-id>.wav, assets/stingers/*.wav, music/bed.wav (optional)
// Writes  out/timeline.json, out/cues.csv, out/master.wav, out/check/waveform.png, out/duration.txt
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseScript } from './script.mjs';
import { readWav, mono, resample, writeWav } from './wav.mjs';
import { Canvas } from './png.mjs';
import { bed, loopTo, fade } from './synth.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = process.cwd();
const cfgFile = args.config || 'podcast.config.json';
const cfg = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {};
const rate = +(args.rate || cfg.rate || 44100);
const CHECK = !!args.check;

const voices = existsSync('voices.json') ? JSON.parse(readFileSync('voices.json', 'utf8')) : {};
const script = parseScript(cfg.script || 'script.md', { voices });
for (const w of script.warnings) console.log('warn: ' + w);

// ---- clip inventory -------------------------------------------------------------------------
const clipDir = cfg.clipDir || 'assets/voice';
mkdirSync(clipDir, { recursive: true });
const clipFile = id => join(clipDir, `${id}.wav`);
const problems = [];
const loaded = new Map(); // id -> { x, seconds }

for (const l of script.lines) {
  if (l.kind !== 'line') continue;
  const f = clipFile(l.id);
  if (!existsSync(f) || statSync(f).size < 44) { l.missing = true; continue; }
  const w = readWav(f);
  const x = resample(mono(w), w.rate, rate);
  loaded.set(l.id, { x, seconds: x.length / rate, bytes: statSync(f).size });
  const wps = +(cfg.wordsPerSecond || 2.7); // conversational pace; drift is measured against this
  const est = l.text.split(/\s+/).length / wps;
  l.seconds = x.length / rate;
  l.drift = l.seconds / est;
}

const extra = readdirSync(clipDir).filter(f => f.endsWith('.wav'))
  .map(f => f.replace(/\.wav$/, '')).filter(id => !script.lines.some(l => l.id === id));
if (extra.length) (CHECK ? problems : { push: () => {} }).push?.(`${extra.length} clip(s) no longer in the script (stale, ignored): ${extra.slice(0, 4).join(', ')}…`);

// ---- timing ---------------------------------------------------------------------------------
const gap = +(cfg.gap ?? 0.22);          // between two speakers
const paraGap = +(cfg.paragraphGap ?? 0.55); // where the script has a blank line
const beats = cfg.beats || { open: 2.4, chapter: 1.6, close: 3.2 };
const pad = +(cfg.pad ?? 0.35);          // silence before the first and after the last line

const timed = [];
let t = pad, prevWasGap = true;
script.chapters.forEach(c => { c.time = null; });

// intro sting + opening beat
const stingFile = cfg.sting || 'assets/stingers/sting.wav';
const stingLen = clipSeconds(stingFile);
t += Math.max(stingLen, beats.open);

let chapterIdx = 0;
const chapterAt = new Map(script.chapters.map((c, i) => [c.at, i]));
script.lines.forEach((l, i) => {
  if (chapterAt.has(i)) {
    if (chapterIdx > 0) t += beats.chapter;
    script.chapters[chapterAt.get(i)].time = t;
    chapterIdx++;
  }

  if (l.kind === 'pause') { t += l.seconds; prevWasGap = true; return; }
  const clip = loaded.get(l.id);
  const secs = clip ? clip.seconds : l.text.length / (cfg.charsPerSecond || 14);
  timed.push({ ...l, start: t, end: t + secs, missing: !clip });
  t += secs + (prevWasGap ? paraGap * 0.5 : gap);
  prevWasGap = false;
});
const bodyEnd = t - gap + pad * 0.6;
const tagFile = cfg.tag || 'assets/stingers/tag.wav';
const tagLen = clipSeconds(tagFile);
const duration = bodyEnd + Math.max(tagLen, beats.close);

// ---- mix ------------------------------------------------------------------------------------
const n = Math.round(duration * rate);
const L = new Float32Array(n), R = new Float32Array(n);
// Equal-power pan: -1 hard left, 0 centre, +1 hard right.
const add = (x, at, gain, pan = 0) => {
  const i0 = Math.round(at * rate);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < x.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= n) continue;
    L[j] += x[i] * gl;
    R[j] += x[i] * gr;
  }
};
// Voice: high-pass (fixed-point DC/rumble removal), gentle level match, light limiting later.
const voiceGain = +(cfg.voiceGain ?? 0.92);
for (const s of timed) {
  const clip = loaded.get(s.id);
  if (!clip) continue;
  const x = highpass(clip.x, rate, 80);
  add(x, s.start, voiceGain);
}

const music = cfg.music || {};
if (music.enabled !== false) {
  const bedFile = music.file || 'assets/music/bed.wav';
  let src;
  if (existsSync(bedFile)) { const w = readWav(bedFile); src = { L: resample(mono(w), w.rate, rate), R: null }; src.R = src.L; }
  else { const b = bed(rate, { bpm: +(music.bpm || 100), bars: 4 }); src = { L: b.L, R: b.R }; console.log('note: no bed file; synthesised one in memory'); }
  const bedSecs = duration + 1.5;
  const looped = loopTo(src, bedSecs, rate, 1.4);
  const g = music.gain ?? 0.16;
  fade(looped.L, rate, 1.0, 2.0); fade(looped.R, rate, 1.0, 2.0);
  for (let i = 0; i < n; i++) { L[i] += looped.L[i] * g; R[i] += looped.R[i] * g; }
}
if (existsSync(stingFile) && stingLen) { const w = readWav(stingFile); add(resample(mono(w), w.rate, rate), pad * 0.4, cfg.stingGain ?? 0.8); }
if (existsSync(tagFile) && tagLen) { const w = readWav(tagFile); add(resample(mono(w), w.rate, rate), bodyEnd + 0.05, cfg.tagGain ?? 0.8); }

// ---- master ---------------------------------------------------------------------------------
// Speech-first loudness: peak-normalise, then a soft-knee limiter so the bed never fights the voice.
let peak = 0;
for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const target = Math.pow(10, -(cfg.truePeakDb ?? 1.5) / 20);
const pre = peak > 0 ? target / peak : 1;
const ceiling = +(cfg.ceiling ?? 0.94);
for (let i = 0; i < n; i++) {
  L[i] = softClip(L[i] * pre, ceiling);
  R[i] = softClip(R[i] * pre, ceiling);
}
const outWav = args.out || 'out/master.wav';
mkdirSync(dirname(outWav), { recursive: true });
writeWav(outWav, L, R, rate);

// ---- reports --------------------------------------------------------------------------------
mkdirSync('out/check', { recursive: true });
const timeline = {
  episode: script.episode, duration, rate, pad,
  chapters: script.chapters.map(c => ({ title: c.title, time: c.time })),
  segments: timed.map(s => ({ id: s.id, speaker: s.speaker, start: +s.start.toFixed(3), end: +s.end.toFixed(3),
    seconds: +(s.end - s.start).toFixed(3), missing: s.missing, where: s.where, text: s.text })),
  music: { enabled: music.enabled !== false, gain: music.gain ?? 0.16, file: existsSync(music.file || 'assets/music/bed.wav') ? (music.file || 'assets/music/bed.wav') : 'synthesised' },
};
writeFileSync('out/timeline.json', JSON.stringify(timeline, null, 2));
writeFileSync('out/duration.txt', duration.toFixed(2) + '\n');

const csv = ['start,end,seconds,speaker,chapter,text',
  ...timed.map(s => {
    const ch = [...script.chapters].reverse().find(c => c.time !== null && c.time <= s.start)?.title ?? '';
    return [s.start, s.end, (s.end - s.start), s.speaker, ch, `"${s.text.replace(/"/g, '""')}"`].join(',');
  })].join('\n');
writeFileSync('out/cues.csv', csv + '\n');

// waveform: one thumbnail per line, so a missing or clipped line is visible at a glance
const W = 1600, H = 420, c = new Canvas(W, H);
const perSec = W / duration;
c.rect(0, 0, W, 22, [32, 30, 28]);
for (const ch of script.chapters) if (ch.time !== null) {
  c.vline(Math.round(ch.time * perSec), 22, H, [200, 60, 40]);
}
const mid = 22 + (H - 22) / 2, half = (H - 22) / 2 - 6;
const step = Math.max(1, Math.floor(n / W));
for (let x = 0; x < W; x++) {
  const i0 = Math.floor((x / perSec) * rate), i1 = Math.min(n, i0 + Math.ceil(step * (rate / (n / W))));
  let lo = 0, hi = 0;
  for (let i = i0; i < i1; i++) { const v = L[i] * 0.5 + R[i] * 0.5; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  c.vline(x, mid + lo * half, mid + hi * half, [70, 110, 120]);
}
for (const s of timed) { // red tick at each line start, labelled order
  const x = Math.round(s.start * perSec);
  c.vline(x, mid - half, mid + half, s.missing ? [200, 60, 40] : [32, 30, 28], s.missing ? 0.9 : 0.35);
}
c.save('out/check/waveform.png');

// ---- report ---------------------------------------------------------------------------------
const total = timed.reduce((s, x) => s + (x.end - x.start), 0);
const missing = timed.filter(s => s.missing);
const speaking = total / duration;
console.log(`episode      ${script.episode}`);
console.log(`duration     ${duration.toFixed(1)} s   (${(duration / 60).toFixed(1)} min)`);
console.log(`segments     ${timed.length} lines, ${script.words} words, speech ${(total / 60).toFixed(1)} min, ${(speaking * 100).toFixed(0)}% of the episode`);
console.log(`chapters     ${script.chapters.length}`);
// Drift: a line far from the pace of the rest of the episode usually means a re-take (a stumble kept in, a pause
// the voice added). Reported, never blocked — pacing is a taste decision.
const drift = timed.filter(s => s.drift && (s.drift > 1.6 || s.drift < 0.55));
for (const s of drift.slice(0, 10)) {
  console.log(`pace         ${s.where} ${s.speaker}: ${s.seconds.toFixed(1)} s for ${s.text.split(/\s+/).length} words (${s.drift.toFixed(2)}× the usual pace)`);
}
if (drift.length > 10) console.log(`pace         … ${drift.length - 10} more lines off pace`);
const clips = timed.filter(s => !s.missing);
if (clips.length) {
  const wpsMean = clips.reduce((n, s) => n + s.text.split(/\s+/).length, 0) /
    Math.max(0.001, clips.reduce((n, s) => n + (s.end - s.start), 0));
  console.log(`pace         ${wpsMean.toFixed(2)} words/s (${(wpsMean * 60).toFixed(0)} wpm)`);
}
if (!clips.length) console.log(`note         no clips yet: this master is silence at the script's estimated length (a timing preview)`);
if (missing.length) {
  console.log(`missing      ${missing.length} line(s) have no clip yet:`);
  for (const m of missing.slice(0, 8)) console.log(`  ${m.where}  ${m.speaker}  ${m.text.slice(0, 70)}${m.text.length > 70 ? '…' : ''}`);
  if (missing.length > 8) console.log(`  … ${missing.length - 8} more`);
  console.log(`  → node lib/lines.mjs               (prints the lines to synthesise)`);
}
if (CHECK && (missing.length || extra.length)) {
  console.log('\ncheck failed: synthesise the missing clips, or rebuild the timeline without --check to preview timing.');
  process.exitCode = 1;
} else if (!missing.length) {
  console.log(`ok           all ${timed.length} clips present`);
}
console.log(`wrote        ${outWav}, out/timeline.json, out/cues.csv, out/check/waveform.png`);
void ROOT;

function clipSeconds(file) {
  if (!existsSync(file)) return 0;
  const w = readWav(file);
  return w.frames / w.rate;
}

function highpass(x, sr, hz) { // one-pole high-pass, run twice for a 12 dB/oct slope
  const rc = 1 / (2 * Math.PI * hz), a = rc / (rc + 1 / sr), out = new Float32Array(x.length);
  let prev = 0, last = 0;
  for (let pass = 0; pass < 2; pass++) {
    prev = 0; last = 0;
    for (let i = 0; i < x.length; i++) {
      const v = pass === 0 ? x[i] : out[i];
      last = a * (last + v - prev);
      prev = v;
      out[i] = last;
    }
  }
  return out;
}
function softClip(v, ceil) { // tanh knee only above -6 dBFS, transparent below
  const a = Math.abs(v);
  if (a <= ceil * 0.5) return v;
  const s = Math.sign(v);
  return s * (ceil * 0.5 + (ceil * 0.5) * Math.tanh((a - ceil * 0.5) / (ceil * 0.5)));
}
