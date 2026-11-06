#!/usr/bin/env node
// Validate script.md: front matter, block structure, spoken syntax, duration budget.
//   node check_script.mjs [--script=script.md] [--strict] [--json]
import { readFileSync } from 'node:fs';
import { parseScript, fmt } from './lib/script.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.find(a => a === `--${n}`) !== undefined;
const val = (n, d) => (args.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;

const scriptPath = val('script', 'script.md');
let voices = {};
try { voices = JSON.parse(readFileSync('voices.json', 'utf8')); } catch { /* optional */ }
const speakers = Object.keys(voices.voices || voices).filter(k => k !== 'language' && k !== 'provider' && k !== 'settings');

let md;
try { md = readFileSync(scriptPath, 'utf8'); } catch { console.error(`error: cannot read ${scriptPath}`); process.exit(2); }

const { front, blocks, errors, warnings, estimate } = parseScript(md, speakers);

if (flag('json')) {
  console.log(JSON.stringify({ front, blocks: blocks.map(b => ({ id: b.id, words: b.words, chars: b.chars, turns: b.turns.length })), estimate, errors, warnings }, null, 2));
} else {
  console.log(`\n${front.title || '(untitled)'}  —  ${front.show || '?'}  [${front.language || '?'}]`);
  console.log('─'.repeat(64));
  for (const b of blocks) {
    const bar = '█'.repeat(Math.max(1, Math.round(b.share * 40)));
    console.log(`${b.id.padEnd(16)} ${String(b.words).padStart(4)} words  ${b.chars.toString().padStart(5)} ch  ${fmt(b.estimate).padStart(6)}  ${bar} ${Math.round(b.share * 100)}%`);
  }
  console.log('─'.repeat(64));
  console.log(`estimate ${fmt(estimate.total)} at ${estimate.wpm} wpm  ·  ${blocks.length} blocks  ·  target ${fmt(estimate.target)}  cap ${fmt(estimate.cap)}`);
  for (const w of warnings) console.log(`\n  ! ${w}`);
  for (const e of errors) console.log(`\n  x ${e}`);
  console.log(errors.length ? `\n${errors.length} error(s), ${warnings.length} warning(s)` : `\nok — ${warnings.length} warning(s)`);
}

if (errors.length) process.exit(1);
if (flag('strict') && warnings.length) { console.error('\n--strict: warnings are errors'); process.exit(1); }
