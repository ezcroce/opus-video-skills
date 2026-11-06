// export.mjs: master WAV → MP3 (or AAC) with embedded chapters, using ffmpeg if the machine has it.
//
//   node lib/export.mjs [--format=mp3|m4a] [--bitrate=192k] [--out=out/episode.mp3] [--no-chapters]
//
// Chapters come from out/timeline.json, so they always match the mix. The WAV master stays the deliverable when
// ffmpeg is missing; this step is convenience, not a dependency.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const format = args.format || 'mp3';
const out = args.out || `out/episode.${format === 'm4a' ? 'm4a' : 'mp3'}`;

if (!existsSync('out/master.wav')) {
  console.error('no out/master.wav: run node lib/build.mjs first');
  process.exit(1);
}
const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (ff.error) {
  console.log('ffmpeg not installed: keeping out/master.wav as the deliverable.');
  console.log('install ffmpeg (brew install ffmpeg / apt install ffmpeg) and re-run to get an MP3 with chapters.');
  process.exit(0);
}

const tl = existsSync('out/timeline.json') ? JSON.parse(readFileSync('out/timeline.json', 'utf8')) : null;
let metaFile = null;
if (tl && !args['no-chapters']) {
  const chapters = tl.chapters.filter(c => typeof c.time === 'number');
  const list = [];
  if (!chapters.length || chapters[0].time > 0.5) list.push({ start: 0, end: chapters[0]?.time ?? tl.duration, title: 'Intro' });
  chapters.forEach((c, i) => {
    const next = chapters[i + 1]?.time ?? tl.duration;
    list.push({ start: c.time, end: next, title: c.title });
  });
  list.push({ start: tl.duration, end: tl.duration + 1, title: 'Outro' });
  const lines = [';FFMETADATA1', `title=${tl.episode}`];
  for (const ch of list) {
    if (ch.end <= ch.start) continue;
    lines.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(ch.start * 1000)}`, `END=${Math.round(ch.end * 1000)}`,
      `title=${ch.title.replace(/[=\\#;\n]/g, ' ')}`);
  }
  metaFile = 'out/chapters.ffmeta';
  writeFileSync(metaFile, lines.join('\n') + '\n');
}

const codec = format === 'm4a'
  ? ['-c:a', 'aac', '-b:a', args.bitrate || '192k', '-movflags', '+faststart']
  : ['-c:a', 'libmp3lame', '-b:a', args.bitrate || '192k', '-id3v2_version', '3', '-write_id3v1', '1'];
const cmd = ['-y', '-loglevel', 'error', '-i', 'out/master.wav', ...(metaFile ? ['-i', metaFile, '-map_metadata', '1'] : []),
  '-map', '0:a', ...codec, out];
const r = spawnSync('ffmpeg', cmd, { stdio: 'inherit' });
if (metaFile) unlinkSync(metaFile);
if (r.status !== 0) process.exit(r.status || 1);
console.log(`wrote ${out}${metaFile ? ' with chapter markers' : ''}`);
