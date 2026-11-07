// Builds the narration track and the timeline the film is cut to.
//   node build.mjs
// Reads narration.json, concatenates the ten generated lines with a beat between them, and writes
// timeline.json: one row per panel, with the exact audio window that panel answers.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const FF = process.env.FFMPEG || 'ffmpeg';
const LEAD = 1.2, GAP = 0.45, TAIL = 1.6;
mkdirSync('out', { recursive: true });

const { lines } = JSON.parse(readFileSync('narration.json', 'utf8'));

// one clip may carry more than one panel: these are the splits, as a fraction of the clip
const PANELS = [
  { panel: 'egypt',     clip: 1, from: 0,   to: 1 },
  { panel: 'pharaoh',   clip: 2, from: 0,   to: 1 },
  { panel: 'basket',    clip: 3, from: 0,   to: 1 },
  { panel: 'desert',    clip: 4, from: 0,   to: 1 },
  { panel: 'bush',      clip: 5, from: 0,   to: 1 },
  { panel: 'confront',  clip: 6, from: 0,   to: 1 },
  { panel: 'blood',     clip: 7, from: 0,   to: .26 },
  { panel: 'plagues',   clip: 7, from: .26, to: 1 },
  { panel: 'darkness',  clip: 8, from: 0,   to: .22 },
  { panel: 'departure', clip: 8, from: .22, to: 1 },
  { panel: 'chariots',  clip: 9, from: 0,   to: 1 },
  { panel: 'sea',       clip: 10, from: 0,  to: .42 },
  { panel: 'cross',     clip: 10, from: .42, to: 1 },
];

const dur = (f) => {
  const r = spawnSync(FF, ['-hide_banner', '-i', f], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) throw new Error('no duration for ' + f);
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
};
const durs = {};
for (const l of lines) durs[l.id] = +dur(`audio/l${l.id}.mp3`).toFixed(3);
console.log('clip durations', durs);

// silence beds, in the same format as the clips
const sil = (name, seconds) => {
  const f = `out/${name}.mp3`;
  if (!existsSync(f)) {
    execFileSync(FF, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
      `anullsrc=r=44100:cl=mono`, '-t', String(seconds), '-c:a', 'libmp3lame', '-q:a', '6', f]);
  }
  return f;
};
const parts = [sil('sil_lead', LEAD)];
const startOf = {};
let cursor = LEAD;
for (const l of lines) {
  startOf[l.id] = cursor;
  parts.push(`audio/l${l.id}.mp3`);
  cursor += durs[l.id];
  if (l.id !== lines[lines.length - 1].id) { parts.push(sil('sil_gap', GAP)); cursor += GAP; }
}
parts.push(sil('sil_tail', TAIL));
cursor += TAIL;

writeFileSync('out/concat.txt', parts.map(p => `file '${p.replace(/^out\//, '').replace(/^audio\//, '../audio/').replace(/^\.\.\/audio/, '../audio')}'`).join('\n'));

// the concat list lives in out/, so paths are relative to out/
const list = parts.map(p => `file '${p.startsWith('audio/') ? '../' + p : p.replace(/^out\//, '')}'`).join('\n') + '\n';
writeFileSync('out/concat.txt', list);
execFileSync(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/concat.txt',
  '-c:a', 'aac', '-b:a', '160k', 'audio/narration.m4a']);

const timeline = PANELS.map(p => {
  const c0 = startOf[p.clip], d = durs[p.clip];
  const start = +(c0 + d * p.from).toFixed(3);
  const end = +(p.to === 1 ? c0 + d : c0 + d * p.to).toFixed(3);
  return { panel: p.panel, clip: p.clip, start, end, dur: +(end - start).toFixed(3) };
});
// panels that share a clip must not overlap, and each one gets the tail beat of its own section
const withGaps = timeline.map((r, i) => {
  const next = timeline[i + 1];
  const end = next && next.clip === r.clip ? r.end : r.end + GAP;
  return { ...r, end: +end.toFixed(3) };
});
writeFileSync('timeline.json', JSON.stringify({ duration: +cursor.toFixed(3), panels: withGaps }, null, 2));
console.log('timeline', withGaps.map(r => `${r.panel} ${r.start}→${r.end}`).join(' · '));
console.log('total', cursor.toFixed(2) + 's', '→ audio/narration.m4a');
