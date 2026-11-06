#!/usr/bin/env node
// Assemble segments/ + segments.json into the episode master.
//   node assemble.mjs                       -> out/<slug>.mp3 (+ chapters.txt)
//   node assemble.mjs --sting --bed         add the procedural signature and music bed
//   node assemble.mjs --gap=0.5 --out=out/x.mp3
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseScript, duration, run, FFMPEG, fmt, DEFAULT_GAP, OPENING_GAP, SPEAKER_GAP } from './lib/script.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };

const scriptPath = val('script', 'script.md');
const manPath = val('manifest', 'segments.json');
if (!existsSync(scriptPath)) { console.error(`error: cannot read ${scriptPath}`); process.exit(1); }
if (!existsSync(manPath)) {
  console.error(`error: ${manPath} not found.\n  run \`node tts.mjs\` to synthesize, or \`node tts.mjs --manifest\` to hand the text to an external TTS,\n  then \`node tts.mjs --finalize\` to measure the audio; then come back here.`);
  process.exit(1);
}
const { front, blocks } = parseScript(readFileSync(scriptPath, 'utf8'));
const man = JSON.parse(readFileSync(manPath, 'utf8'));
const segments = man.segments || [];
if (!segments.length) { console.error('error: segments.json has no segments — run `node tts.mjs --finalize` first'); process.exit(1); }
for (const s of segments) if (!existsSync(s.file)) { console.error(`error: missing audio for ${s.block}: ${s.file}`); process.exit(1); }

const gapBetween = Number(val('gap', DEFAULT_GAP));
const out = val('out', `out/${front.slug || 'episode'}.mp3`);
mkdirSync(dirname(out), { recursive: true });
mkdirSync('out/tmp', { recursive: true });

const blockOf = (s) => s.block;
const items = [];   // { file } | { silence: dur }
let prev = null;
for (const s of segments) {
  if (prev) {
    const gap = blockOf(s) !== blockOf(prev) ? (blockOf(prev) === blocks[0]?.id ? OPENING_GAP : gapBetween) : SPEAKER_GAP;
    items.push({ silence: gap });
  }
  items.push({ file: s.file });
  prev = s;
}

// ---- optional procedural signature sting ---------------------------------
if (flag('sting')) {
  const sting = 'out/tmp/sting.wav';
  const notes = [[392.0, 0.11, 0], [523.25, 0.09, 220], [659.25, 0.08, 440]];
  const inputs = [], filters = [], mixIns = [];
  notes.forEach(([f, vol, delay], i) => {
    inputs.push('-f', 'lavfi', '-i', `sine=frequency=${f}:duration=1.3:sample_rate=44100`);
    filters.push(`[${i}:a]volume=${vol},adelay=${delay}|${delay},afade=t=in:st=${delay / 1000}:d=0.05[a${i}]`);
    mixIns.push(`[a${i}]`);
  });
  filters.push(`${mixIns.join('')}amix=inputs=${notes.length}:normalize=0,afade=t=out:st=1.05:d=0.55,apad=pad_dur=0.35,`+
               `aformat=sample_rates=44100:channel_layouts=mono[out]`);
  await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[out]', '-ac', '1', '-ar', '44100', sting]);
  items.unshift({ file: sting });
  items.splice(1, 0, { silence: 0.25 });
  console.log(`sting: ${sting} (${(await duration(sting)).toFixed(2)}s, three-note pad, generated)`);
}

// ---- optional music bed ---------------------------------------------------
const bedFile = val('bed', existsSync('music/bed.mp3') ? 'music/bed.mp3' : existsSync('music/bed.wav') ? 'music/bed.wav' : '');
const bedLevel = Number(val('bed-db', -26));

// ---- build the ffmpeg graph ----------------------------------------------
const inputs = [], filters = [];
items.forEach((it, i) => {
  if (it.silence !== undefined) {
    inputs.push('-f', 'lavfi', '-t', String(it.silence), '-i', 'anullsrc=r=44100:cl=mono');
  } else {
    inputs.push('-i', it.file);
  }
  filters.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=mono[s${i}]`);
});
const chain = items.map((_, i) => `[s${i}]`).join('');
filters.push(`${chain}concat=n=${items.length}:v=0:a=1[cat]`);

let last = 'cat';
if (flag('bed') && bedFile) {
  inputs.push('-stream_loop', '-1', '-i', bedFile);
  const bedIdx = items.length;
  filters.push(`[${bedIdx}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=${bedLevel}dB,`+
               `afade=t=in:st=0:d=1.5,afade=t=out:st=9999:d=2[bed]`);
  filters.push(`[cat][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]`);
  last = 'mix';
} else if (flag('bed')) {
  console.log('! --bed given but no music/bed.mp3 or music/bed.wav found; skipping the bed');
}

filters.push(`[${last}]loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95[out]`);

console.log(`assembling ${items.filter(i => i.file).length} audio item(s) into ${out} …`);
await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs,
  '-filter_complex', filters.join(';'), '-map', '[out]',
  '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-ac', '1',
  '-metadata', `title=${front.title || ''}`, '-metadata', `artist=${front.show || ''}`,
  '-metadata', `album=${front.show || ''}`, '-metadata', `comment=${front.slug || ''}`,
  out]);

// ---- chapters -------------------------------------------------------------
const total = await duration(out);
let t = 0;
const lines = [];
for (const b of blocks) {
  const segs = segments.filter(s => s.block === b.id);
  const dur = segs.reduce((a, s) => a + (s.duration || 0), 0) + Math.max(0, segs.length - 1) * (gapBetween);
  lines.push(`${fmt(t)}  ${b.display}${b.label.includes('—') ? ' — ' + b.label.split('—').slice(1).join('—').trim() : ''}`);
  t += dur + (b === blocks[0] ? OPENING_GAP : gapBetween);
}
const chapters = `# ${front.title}\n${lines.join('\n')}\n`;
writeFileSync(out.replace(/\.mp3$/, '.chapters.txt'), chapters);

const speech = segments.reduce((a, s) => a + (s.duration || 0), 0);
console.log(`\n${out}  ${fmt(total)}  (${(total / 60).toFixed(1)} min)`);
console.log(`speech ${fmt(speech)}  ·  ${((speech / total) * 100).toFixed(0)}% of the runtime  ·  ${segments.length} segments`);
console.log(`loudness -16 LUFS / -1.5 dBTP · mono 44.1 kHz 192 kbps`);
console.log(`chapters -> ${out.replace(/\.mp3$/, '.chapters.txt')}`);
