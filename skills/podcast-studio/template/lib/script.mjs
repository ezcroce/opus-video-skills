// script.mjs: turn an episode's Markdown script into a timeline of lines, chapters and pauses.
// The format is documented in references/script-format.md; this file is the reference implementation.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SPEAKER = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 _-]{0,20}):\s*(.+)$/;

export function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!m) return { meta, body: src };
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    meta[k] = v === '' ? '' : isNaN(+v) ? v : +v;
  }
  return { meta, body: src.slice(m[0].length) };
}

// Stable id: same speaker + same text → same id, so editing one line only invalidates that line's clip.
export const lineId = (episodeId, speaker, text) =>
  `${episodeId}-${speaker.toLowerCase().replace(/[^a-z0-9]+/g, '')}-${createHash('sha1')
    .update(`${speaker}\u0000${text}`).digest('hex').slice(0, 8)}`;

export function parseScript(file, { voices = {}, episodeId = null } = {}) {
  const src = readFileSync(file, 'utf8');
  const { meta, body } = parseFrontMatter(src);
  const ep = episodeId || meta.episode || file.replace(/^.*\//, '').replace(/\.md$/, '');
  const lines = [], chapters = [], warnings = [];
  let current = null, inComment = false;

  body.split(/\r?\n/).forEach((raw, n) => {
    const line = raw.replace(/\s+$/, '');
    const where = `${file.replace(/^.*\//, '')}:${n + 1}`;
    if (inComment) { if (line.includes('-->')) inComment = false; current = null; return; }
    if (/^\s*<!--/.test(line)) { inComment = !line.includes('-->'); current = null; return; }
    if (!line.trim()) { current = null; return; }

    const pause = line.match(/^\[(beat|pause)\s*([\d.]+)\s*(s|sec|s)?\]$/i);
    if (pause) { lines.push({ kind: 'pause', seconds: +pause[2] }); current = null; return; }

    const chapter = line.match(/^##+\s+(.*)$/);
    if (chapter) { chapters.push({ title: chapter[1].trim(), at: lines.length }); current = null; return; }

    if (/^#{1}\s/.test(line) || /^>\s?/.test(line)) { current = null; return; }

    if (/^\s{2,}\S/.test(line) && current && current.text) { // continuation of the previous line
      current.text += ' ' + line.trim();
      return;
    }

    const m = line.match(SPEAKER);
    if (m) {
      const speaker = m[1].trim().toUpperCase();
      if (Object.keys(voices).length && !voices[speaker]) {
        warnings.push(`${where}: speaker "${speaker}" is not in voice/voices.json — line ignored`);
        current = null;
        return;
      }
      const text = m[2].trim();
      current = { kind: 'line', speaker, text, where, index: lines.length };
      lines.push(current);
      return;
    }
    warnings.push(`${where}: not a speaker line, a chapter or a [beat] — ignored: ${line.trim().slice(0, 60)}`);
    current = null;
  });

  // ids are assigned after parsing so continuations are complete
  for (const l of lines) if (l.kind === 'line') l.id = lineId(ep, l.speaker, l.text);

  const words = lines.filter(l => l.kind === 'line').reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  const chars = lines.filter(l => l.kind === 'line').reduce((n, l) => n + l.text.length, 0);
  return { episode: String(ep), meta, lines, chapters, warnings, words, chars, file };
}

// Speech estimate before any clip exists: ~14 characters per second of read speech (varies by language and voice).
export const estimateSeconds = (text, charsPerSecond = 14) => text.length / charsPerSecond;
