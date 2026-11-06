// lines.mjs: what still needs a voice. The agent reads this, synthesises each line with its voice id, saves the WAV
// under assets/voice/<id>.wav, and runs build.mjs. Nothing here calls a speech service; it only reports the plan.
//
//   node lib/lines.mjs                pending lines, human-readable
//   node lib/lines.mjs --json         the same as JSON (id, speaker, voice, text, file, estSeconds)
//   node lib/lines.mjs --all          every line, pending or not
//   node lib/lines.mjs --id=<line-id> just that line's text
//   node lib/lines.mjs --stats        clip inventory: count, total speech, longest line, rate mismatch
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { parseScript } from './script.mjs';
import { readWav } from './wav.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const cfg = existsSync('podcast.config.json') ? JSON.parse(readFileSync('podcast.config.json', 'utf8')) : {};
const voices = existsSync('voices.json') ? JSON.parse(readFileSync('voices.json', 'utf8')) : {};
const script = parseScript(cfg.script || 'script.md', { voices });
const clipDir = cfg.clipDir || 'assets/voice';
const fileOf = id => `${clipDir}/${id}.wav`;
const present = id => existsSync(fileOf(id)) && statSync(fileOf(id)).size > 44;

const all = script.lines.filter(l => l.kind === 'line').map(l => ({
  id: l.id, speaker: l.speaker, voice: voices[l.speaker] || null, text: l.text,
  file: fileOf(l.id), estSeconds: +(l.text.length / (cfg.charsPerSecond || 14)).toFixed(1),
  done: present(l.id), where: l.where,
}));

if (args.stats) {
  const done = all.filter(l => l.done);
  let secs = 0, longest = null, rates = new Map();
  for (const l of done) {
    const w = readWav(l.file);
    const s = w.frames / w.rate;
    l._s = s; secs += s;
    if (!longest || s > longest._s) longest = l;
    rates.set(w.rate, (rates.get(w.rate) || 0) + 1);
  }
  console.log(`${script.episode}: ${all.length} lines, ${done.length} with clips, ${all.length - done.length} pending`);
  console.log(`speech ${(secs / 60).toFixed(1)} min, mean line ${(secs / Math.max(1, done.length)).toFixed(1)} s`);
  if (longest) console.log(`longest: ${longest._s.toFixed(1)} s — ${longest.speaker} "${longest.text.slice(0, 60)}…"`);
  console.log(`sample rates: ${[...rates].map(([r, n]) => `${r} Hz ×${n}`).join(', ') || 'none yet'}`);
  const slow = done.filter(l => l._s > 45);
  if (slow.length) console.log(`note: ${slow.length} line(s) over 45 s — split them in the script for easier revision`);
  process.exit(0);
}

if (args.id) {
  const l = all.find(x => x.id === args.id);
  if (!l) { console.error(`no line ${args.id}`); process.exit(1); }
  console.log(l.text);
  process.exit(0);
}

const wanted = args.all ? all : all.filter(l => !l.done);
if (args.json) {
  console.log(JSON.stringify({ episode: script.episode, rate: +(cfg.rate || 44100), lines: wanted }, null, 2));
} else {
  if (!wanted.length) { console.log('nothing pending — every line has a clip'); process.exit(0); }
  const byVoice = new Map();
  for (const l of wanted) {
    const k = l.speaker;
    if (!byVoice.has(k)) byVoice.set(k, []);
    byVoice.get(k).push(l);
  }
  console.log(`${wanted.length} line(s) to synthesise, in ${byVoice.size} voice(s). Save each as <file>, 44.1 kHz mono WAV.\n`);
  for (const [speaker, ls] of byVoice) {
    console.log(`== ${speaker}  voice: ${voices[speaker] || 'MISSING — add it to voices.json'}  (${ls.length} lines, ~${(ls.reduce((s, l) => s + l.estSeconds, 0) / 60).toFixed(1)} min)`);
    for (const l of ls) {
      console.log(`\n[${l.id}]  ~${l.estSeconds} s  → ${l.file}`);
      console.log(l.text.replace(/(.{76}\s)/g, '$1\n'));
    }
    console.log('');
  }
}
const pendingSpeakers = new Set(all.filter(l => !l.done).map(l => l.speaker));
for (const s of pendingSpeakers) if (!voices[s]) console.log(`error: voices.json has no entry for speaker "${s}"`);
if (pendingSpeakers.size && readdirSync(clipDir).length === 0) console.error(`hint: ${clipDir}/ is empty — this is the first pass`);
