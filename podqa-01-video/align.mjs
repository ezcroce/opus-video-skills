// Align the episode's sentences to time, so shots can be cut to the voice.
// Reads the chapter file and segments.json produced by the podcast pipeline.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const CHAPTERS = '../episodes/podqa-01.chapters.txt';
const SEGMENTS = '../skills/podcast-prompt-pipeline/examples/podqa-01/segments.json';
const AUDIO = '../episodes/podqa-01.mp3';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

function dur(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error('cannot probe ' + file);
  return +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
}
const total = dur(AUDIO);
const man = JSON.parse(readFileSync(SEGMENTS, 'utf8'));
const OPENING_GAP = 0.7, GAP = 0.35, SPEAKER_GAP = 0.25;

// Block starts come from the segments and the assembler's gaps, not from the chapter file,
// so a chapter file that drifted can't silently shift every cue.
const order = ['abertura', 'curiosidade-1', 'curiosidade-2', 'finalizacao'];
const groups = order.map(id => ({ id, segs: man.segments.filter(s => s.block === id) })).filter(g => g.segs.length);
const speechAll = groups.reduce((a, g) => a + g.segs.reduce((x, s) => x + s.duration, 0), 0);
const intraAll = groups.reduce((a, g) => a + Math.max(0, g.segs.length - 1) * SPEAKER_GAP, 0);
const betweenAll = Math.max(0, groups.length - 1) * 0 ;
const lead = total - (speechAll + intraAll + (groups.length > 1 ? OPENING_GAP + (groups.length - 2) * GAP : 0));
const blocks = [];
{
  let t = lead;
  groups.forEach((g, i) => {
    const speech = g.segs.reduce((a, s) => a + s.duration, 0) + Math.max(0, g.segs.length - 1) * SPEAKER_GAP;
    blocks.push({ start: +t.toFixed(3), end: +(t + speech).toFixed(3), id: g.id, label: g.id });
    t += speech + (i === 0 ? OPENING_GAP : GAP);
  });
}
console.log(`lead (sting + gap): ${lead.toFixed(2)}s`);
const SLUG = { ABERTURA: 'abertura', 'CURIOSIDADE 1': 'curiosidade-1', 'CURIOSIDADE 2': 'curiosidade-2', FINALIZAÇÃO: 'finalizacao' };
const byBlock = {};
for (const s of man.segments) (byBlock[s.block] ||= []).push(s);

const out = { audio: AUDIO, duration: +total.toFixed(3), blocks: [] };
for (const b of blocks) {
  const key = b.id;
  const segs = byBlock[key] || [];
  const speech = segs.reduce((a, s) => a + s.duration, 0);
  const text = segs.map(s => s.text).join(' ');
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const weights = sentences.map(s => s.length);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = b.start;
  const cues = sentences.map((s, i) => {
    const d = speech * weights[i] / sum;
    const c = { t: +acc.toFixed(3), d: +d.toFixed(3), text: s };
    acc += d;
    return c;
  });
  out.blocks.push({ id: key, start: b.start, end: +b.end.toFixed(3), speech: +speech.toFixed(3), cues });
}

mkdirSync('out', { recursive: true });
writeFileSync('cues.json', JSON.stringify(out, null, 2));
console.log(`${total.toFixed(2)}s, ${out.blocks.length} blocks, ${out.blocks.reduce((a, b) => a + b.cues.length, 0)} sentences`);
for (const b of out.blocks) console.log(`  ${b.start.toFixed(2)}–${b.end.toFixed(2)}  ${b.id.padEnd(14)} ${b.cues.length} cues`);
