// Shared parser for script.md + small helpers for the pipeline.
// Used by check_script.mjs, tts.mjs and assemble.mjs.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Words per minute used by the duration estimator. Portuguese is slower than English.
export const WPM = { 'pt-BR': 140, 'pt': 140, 'en': 150, 'es': 145, 'fr': 150, 'de': 130 };
export const DEFAULT_GAP = 0.35;      // between blocks
export const OPENING_GAP = 0.7;       // after the opening block
export const SPEAKER_GAP = 0.25;      // between two hosts inside one block

const ALIASES = { 'INTRODUCAO': 'ABERTURA', 'INTRO': 'ABERTURA', 'DESPEDIDA': 'FINALIZACAO', 'FECHAMENTO': 'FINALIZACAO' };

export function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function stripAccents(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export function wordCount(text) {
  return (text.replace(/[—–]/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

export function parseScript(md, knownSpeakers = []) {
  const errors = [], warnings = [];

  // ---- front matter -------------------------------------------------------
  const front = {};
  let body = md;
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    body = md.slice(fm[0].length);
    for (const line of fm[1].split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!m) { warnings.push(`front matter: cannot parse "${line.trim()}"`); continue; }
      let raw = m[2].trim();
      const q = raw.match(/^(["'])([\s\S]*?)\1\s*(#.*)?$/);
      if (q) raw = q[2];                       // quoted value, optional trailing comment
      else raw = raw.replace(/\s+#.*$/, '');  // unquoted value with trailing comment
      let v = raw.trim();
      if (/^-?\d+$/.test(v)) v = Number(v);
      front[m[1]] = v;
    }
  } else {
    errors.push('missing front matter (--- ... ---) at the top of script.md');
  }
  for (const k of ['slug', 'title', 'show', 'host', 'language', 'target_seconds']) {
    if (front[k] === undefined) errors.push(`front matter: missing "${k}"`);
  }
  if (front.slug && !/^[a-z0-9-]+$/.test(String(front.slug))) errors.push(`front matter: slug "${front.slug}" must be a-z0-9-`);
  if (front.target_seconds !== undefined && !(Number(front.target_seconds) > 0)) errors.push('front matter: target_seconds must be a positive number');

  // ---- blocks -------------------------------------------------------------
  const speakers = new Map(knownSpeakers.map(s => [stripAccents(String(s)).toUpperCase(), s]));
  const blocks = [];
  let cur = null, turn = null;

  const pushTurn = () => { if (turn && turn.text.trim()) cur.turns.push(turn); turn = null; };

  let inComment = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (inComment) { if (line.includes('-->')) inComment = false; continue; }   // inside a multi-line comment
    if (/^\s*<!--/.test(line)) { if (!line.includes('-->')) inComment = true; continue; }
    if (/^\s*>/.test(line)) continue;                                    // quoted notes
    if (/^\s*```/.test(line)) continue;                                  // fence lines

    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      if (h[0].startsWith('# ')) continue;                               // document title
      pushTurn();
      const label = h[1].replace(/^\[|\]$/g, '').trim();
      const head = label.split(/\s+[—–]\s+|\s+-\s+|:\s+/)[0].trim();
      let id = stripAccents(head).toUpperCase();
      id = ALIASES[id] || id;
      // display keeps the heading as written ("FINALIZAÇÃO"); id/head are normalised for logic.
      const entry = { id: slugify(id), label: label, display: head, head: id, turns: [] };
      if (!/^[A-Z][A-Z0-9 ]*$/.test(stripAccents(head).toUpperCase())) warnings.push(`block heading "${label}" is not an ALL-CAPS block name`);
      if (blocks.some(b => b.id === entry.id)) errors.push(`duplicate block: ${entry.id}`);
      blocks.push(entry);
      cur = entry; turn = null;
      continue;
    }

    if (!cur) { if (line.trim()) warnings.push(`text outside any block: "${line.trim().slice(0, 40)}…"`); continue; }

    const sp = line.match(/^([A-Za-zÀ-ÖØ-Þ][\wÀ-ÿ .'-]{0,22}):\s*(.*)$/);
    if (sp && (speakers.size === 0 || speakers.has(stripAccents(sp[1]).toUpperCase()) || /^[A-Z0-9 _-]{2,}$/.test(sp[1]))) {
      pushTurn();
      const key = stripAccents(sp[1]).toUpperCase();
      const name = speakers.get(key) || sp[1];
      if (speakers.size && !speakers.has(key)) errors.push(`unknown speaker "${sp[1]}" (not in voices.json)`);
      turn = { speaker: name, text: sp[2].trim() };
      continue;
    }
    if (!turn) { if (line.trim()) warnings.push(`line before any "SPEAKER:" turn in ${cur.id}: "${line.trim().slice(0, 40)}…"`); continue; }
    turn.text += (line.trim() ? (turn.text ? '\n' : '') + line.trim() : '\n\n');
  }
  pushTurn();

  if (blocks.length === 0) errors.push('no blocks found — a block is a line starting with "## NAME"');

  // ---- per-block checks ---------------------------------------------------
  const markdown = [
    [/\*\*|__/, 'bold/italic markers'],
    [/\[[^\]]*\]\([^)]*\)/, 'link syntax'],
    [/^\s*[-*+]\s+/m, 'list items'],
    [/\|.*\|/, 'table syntax'],
    [/`/, 'backticks'],
  ];
  const ttsHazards = [
    [/\d/, 'bare digits'],
    [/%/, 'percent sign'],
    [/R\$|US\$|\$/, 'currency sign'],
    [/\s&\s/, 'ampersand'],
    [/\s\+\s/, 'plus sign'],
    [/→|->/, 'arrow'],
    [/\bvs\.?\b/i, '"vs" abbreviation'],
    [/\b[A-Z]{2,5}\b/, 'all-caps abbreviation (QA, LLM, API…)'],
    [/\[[^\]]+\]/, 'bracketed stage cue'],
  ];

  for (const b of blocks) {
    const text = b.turns.map(t => t.text).join('\n\n');
    b.text = text;
    b.speech = text.replace(/\s+/g, ' ').trim();
    b.words = wordCount(b.speech);
    b.chars = b.speech.length;
    if (!b.speech) errors.push(`block ${b.id} has no speech text`);
    for (const [re, what] of markdown) if (re.test(text)) errors.push(`block ${b.id}: ${what} inside speech — the voice reads punctuation, not markup`);
    if (b.chars > 1800) warnings.push(`block ${b.id}: ${b.chars} characters (keep under 1800; ElevenLabs cuts around 2500)`);
    const hazards = new Set();
    for (const [re, what] of ttsHazards) if (re.test(b.speech)) hazards.add(what);
    if (hazards.size) warnings.push(`block ${b.id}: TTS may misspell ${[...hazards].join(', ')} — write it the way it is spoken`);
    for (const t of b.turns) {
      for (const s of t.text.split(/(?<=[.!?…])\s+/)) {
        const w = wordCount(s);
        if (w > 30) warnings.push(`block ${b.id}: ${w}-word sentence — split it ("${s.slice(0, 48)}…")`);
      }
    }
  }

  // ---- timing -------------------------------------------------------------
  const wpm = WPM[front.language] || 145;
  const gaps = blocks.length > 1
    ? blocks.slice(0, -1).reduce((a, b, i) => a + (i === 0 ? OPENING_GAP : DEFAULT_GAP), 0)
    : 0;
  const speechSeconds = blocks.reduce((a, b) => a + b.words / wpm * 60, 0);
  const total = speechSeconds + gaps;
  for (const b of blocks) {
    b.estimate = b.words / wpm * 60;
    b.share = speechSeconds ? b.estimate / speechSeconds : 0;
  }

  const target = Number(front.target_seconds) || 0;
  const cap = Number(front.cap_seconds) || 300;
  if (blocks.length && total > cap) errors.push(`estimated ${fmt(total)} exceeds cap_seconds (${fmt(cap)}) — cut a promise point`);
  else if (target && total > target * 1.15) warnings.push(`estimated ${fmt(total)} is over target (${fmt(target)} +15%)`);
  else if (target && total < target * 0.7) warnings.push(`estimated ${fmt(total)} is well under target (${fmt(target)}) — thin for the runtime`);

  const signoff = front.signoff ? String(front.signoff).trim() : null;
  const last = blocks[blocks.length - 1];
  if (last) last.isLast = true;
  if (signoff && last) {
    const tail = stripAccents(last.speech).toLowerCase();
    const want = stripAccents(signoff).toLowerCase().replace(/[.!?…]+$/, '');
    if (!tail.includes(want)) warnings.push(`last block does not end with the fixed sign-off: "${signoff}"`);
  }

  if (blocks.length >= 3) {
    const expected = { 0: 0.12, [blocks.length - 1]: 0.12 };
    blocks.forEach((b, i) => {
      const want = expected[i] !== undefined ? expected[i] : (1 - 0.24) / Math.max(1, blocks.length - 2);
      if (Math.abs(b.share - want) > 0.15) warnings.push(`block ${b.id} carries ${Math.round(b.share * 100)}% of the runtime (expected ~${Math.round(want * 100)}%)`);
    });
  }

  return { front, blocks, errors, warnings, estimate: { wpm, speechSeconds, gaps, total, target, cap } };
}

export function fmt(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function loadJSON(file) { return JSON.parse(readFileSync(file, 'utf8')); }
export function exists(f) { return existsSync(f); }

// ---- ffmpeg helpers -------------------------------------------------------
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`)));
  });
}

// ffprobe is not always present (minimal builds), so parse `ffmpeg -i` instead.
export async function duration(file) {
  const p = spawn(FFMPEG, ['-hide_banner', '-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  p.stderr.on('data', d => { err += d; });
  await new Promise(r => p.on('close', r));
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`cannot read duration of ${file}`);
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}
