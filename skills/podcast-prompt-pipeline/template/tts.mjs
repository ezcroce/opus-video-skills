#!/usr/bin/env node
// Synthesize every block of script.md into segments/, then write segments.json.
//   node tts.mjs                 synthesize with the provider in voices.json
//   node tts.mjs --manifest      no provider: emit segments.json for an external TTS
//   node tts.mjs --only=curiosidade-1
//   node tts.mjs --list          show providers and voices it can see
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseScript, duration, run, FFMPEG, slugify } from './lib/script.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };

const cfg = existsSync('voices.json') ? JSON.parse(readFileSync('voices.json', 'utf8')) : { provider: 'manifest', language: 'pt-BR', voices: {} };
const provider = val('provider', process.env.TTS_PROVIDER || cfg.provider || 'manifest');
const language = cfg.language || 'pt-BR';
const voices = cfg.voices || {};
const settings = cfg.settings || {};

if (flag('list')) {
  console.log(`provider (configured): ${provider}`);
  console.log(`voices:                ${Object.entries(voices).map(([k, v]) => `${k} -> ${v.voice || v}`).join(', ') || '(none)'}`);
  console.log(`env:                   ELEVENLABS_API_KEY ${process.env.ELEVENLABS_API_KEY ? 'set' : '-'}  OPENAI_API_KEY ${process.env.OPENAI_API_KEY ? 'set' : '-'}  say ${hasBin('say') ? 'yes' : 'no'}  espeak-ng ${hasBin('espeak-ng') ? 'yes' : 'no'}`);
  console.log(`ffmpeg:                ${FFMPEG}`);
  process.exit(0);
}

function hasBin(bin) {
  return spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' }).status === 0;
}

const scriptPath = val('script', 'script.md');
const md = readFileSync(scriptPath, 'utf8');
const { front, blocks, errors } = parseScript(md, Object.keys(voices));
if (errors.length) { console.error('error: script.md has errors — run `node check_script.mjs`:\n  ' + errors.join('\n  ')); process.exit(1); }

// One synthesis request per contiguous run of the same speaker.
const only = val('only', '');
const segments = [];
for (const b of blocks) {
  if (only && b.id !== only && b.head.toLowerCase() !== only.toLowerCase()) continue;
  let group = null;
  for (const t of b.turns) {
    if (!group || group.speaker !== t.speaker) { group = { speaker: t.speaker, text: '' }; b.groups = b.groups || []; b.groups.push(group); }
    group.text += (group.text ? ' ' : '') + t.text.replace(/\s+/g, ' ').trim();
  }
  for (const g of b.groups) {
    const i = String(segments.length + 1).padStart(2, '0');
    segments.push({ index: i, block: b.id, speaker: g.speaker, text: g.text, file: `segments/${i}-${b.id}-${slugify(g.speaker)}.wav` });
  }
}

const tip = (msg) => console.log(`  ${msg}`);

if (provider === 'manifest' || flag('manifest')) {
  mkdirSync('segments', { recursive: true });
  writeFileSync('segments.json', JSON.stringify({ language, voiceHint: cfg.voiceHint || '', segments }, null, 2));
  console.log(`wrote segments.json with ${segments.length} segment(s).`);
  console.log('Synthesize each `text` and save it to its `file` path (wav/mp3), then run:');
  console.log('  node tts.mjs --finalize      # measures the files and rewrites segments.json');
  console.log('  node assemble.mjs');
  process.exit(0);
}

if (flag('finalize')) {
  const man = JSON.parse(readFileSync('segments.json', 'utf8'));
  let total = 0;
  for (const s of man.segments) {
    if (!existsSync(s.file)) { console.error(`missing ${s.file}`); process.exit(1); }
    s.duration = +(await duration(s.file)).toFixed(3);
    s.chars = s.text.length;
    total += s.duration;
    console.log(`  ${s.file.padEnd(46)} ${s.duration.toFixed(2)}s`);
  }
  man.totalSpeech = +total.toFixed(3);
  writeFileSync('segments.json', JSON.stringify(man, null, 2));
  console.log(`speech total ${total.toFixed(1)}s over ${man.segments.length} segment(s)`);
  process.exit(0);
}

mkdirSync('segments', { recursive: true });
let done = 0;

for (const s of segments) {
  const v = voices[s.speaker] || voices[front.host] || Object.values(voices)[0];
  if (!v) { console.error(`error: no voice configured for ${s.speaker} in voices.json`); process.exit(1); }
  const voiceId = typeof v === 'string' ? v : v.voice;
  console.log(`[${s.index}/${segments.length}] ${s.block} · ${s.speaker} · ${s.text.length} ch`);

  if (provider === 'elevenlabs') {
    if (!process.env.ELEVENLABS_API_KEY) { console.error('error: ELEVENLABS_API_KEY is not set'); process.exit(1); }
    const body = {
      text: s.text,
      model_id: (typeof v === 'object' && v.model) || settings.model || 'eleven_multilingual_v2',
      voice_settings: {
        stability: settings.stability ?? 0.4,
        similarity_boost: settings.similarity_boost ?? 0.8,
        style: settings.style ?? 0.15,
        use_speaker_boost: settings.use_speaker_boost ?? true,
      },
    };
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) { console.error(`elevenlabs ${r.status}: ${await r.text()}`); process.exit(1); }
    const tmp = s.file.replace(/\.wav$/, '.mp3');
    await writeFile(tmp, Buffer.from(await r.arrayBuffer()));
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', '44100', s.file]);
  } else if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) { console.error('error: OPENAI_API_KEY is not set'); process.exit(1); }
    const body = {
      model: (typeof v === 'object' && v.model) || settings.model || 'gpt-4o-mini-tts',
      voice: voiceId || 'alloy',
      input: s.text,
      response_format: 'wav',
    };
    if (settings.instructions) body.instructions = settings.instructions;
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) { console.error(`openai ${r.status}: ${await r.text()}`); process.exit(1); }
    const tmp = s.file.replace(/\.wav$/, '.src.wav');
    await writeFile(tmp, Buffer.from(await r.arrayBuffer()));
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', '44100', s.file]);
  } else if (provider === 'say') {
    const aiff = s.file.replace(/\.wav$/, '.aiff');
    await run('say', ['-v', voiceId || 'Luciana', '-r', String(settings.wpm || 175), '-o', aiff, s.text]);
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', aiff, '-ac', '1', '-ar', '44100', s.file]);
  } else if (provider === 'espeak-ng') {
    await run('espeak-ng', ['-v', voiceId || 'pt-br', '-s', String(settings.wpm || 165), '-w', s.file, s.text]);
  } else {
    console.error(`error: unknown provider "${provider}" (elevenlabs | openai | say | espeak-ng | manifest)`);
    process.exit(1);
  }
  s.duration = +(await duration(s.file)).toFixed(3);
  done++;
}

// Merge with any segments left over from a previous run (needed for --only).
const manPath = 'segments.json';
let prev = { segments: [] };
if (existsSync(manPath)) { try { prev = JSON.parse(readFileSync(manPath, 'utf8')); } catch { /* ignore */ } }
const byFile = new Map((prev.segments || []).map(s => [s.file, s]));
for (const s of segments) byFile.set(s.file, s);
const all = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));

writeFileSync(manPath, JSON.stringify({ language, generatedAt: new Date().toISOString(), voiceNote: cfg.voiceHint || '', segments: all }, null, 2));
console.log(`\nsynthesized ${done} segment(s) -> segments.json (${all.length} total)`);
console.log('next: node assemble.mjs');
