// player.mjs: writes out/player.html — a self-contained review page for the episode (audio + chapter list +
// scrolling transcript). Hand it to the user so they can listen and judge pacing, not just look at numbers.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const tl = JSON.parse(readFileSync('out/timeline.json', 'utf8'));
const title = existsSync('script.md')
  ? (readFileSync('script.md', 'utf8').match(/^title:\s*(.*)$/m)?.[1] || tl.episode)
  : tl.episode;
const voices = existsSync('voices.json') ? JSON.parse(readFileSync('voices.json', 'utf8')) : {};
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const chapters = tl.chapters.filter(c => typeof c.time === 'number');
const rows = tl.segments.map(s => `
      <li class="line${s.missing ? ' missing' : ''}" data-start="${s.start}" data-end="${s.end}">
        <button class="t" onclick="seek(${s.start})">${mmss(s.start)}</button>
        <span class="who">${s.speaker}</span>
        <span class="say">${escapeHtml(s.text)}</span>
      </li>`).join('');

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${escapeHtml(title)} — review</title>
<style>
  :root { --paper:#f4efe4; --ink:#22282c; --dim:#8a8f8c; --accent:#c4583c; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.55 ui-sans-serif, -apple-system, Segoe UI, Helvetica, sans-serif; }
  header { position:sticky; top:0; background:var(--paper); border-bottom:1px solid #d8d2c4; padding:18px 28px 14px; z-index:2; }
  h1 { margin:0 0 8px; font-size:20px; letter-spacing:.01em; }
  .meta { color:var(--dim); font-size:13px; }
  audio { width:100%; margin-top:12px; }
  main { max-width:820px; margin:0 auto; padding:24px 28px 120px; }
  ol.chapters { list-style:none; padding:0; margin:0 0 28px; display:flex; flex-wrap:wrap; gap:8px; }
  ol.chapters button { font:inherit; font-size:13px; border:1px solid #cfc8b8; background:transparent; color:inherit;
    padding:6px 10px; border-radius:999px; cursor:pointer; }
  ol.chapters button:hover { border-color:var(--accent); color:var(--accent); }
  ol.lines { list-style:none; padding:0; margin:0; }
  .line { display:grid; grid-template-columns:52px 96px 1fr; gap:12px; padding:7px 0; border-bottom:1px dotted #ddd6c6; }
  .line .t { font:inherit; font-size:12px; color:var(--dim); background:none; border:0; padding:0; text-align:left; cursor:pointer; }
  .line .who { font-size:11px; letter-spacing:.09em; color:var(--accent); padding-top:3px; }
  .line .say { font-size:15px; }
  .line.now { background:#efe7d6; }
  .line.missing .say { color:#b4432c; text-decoration:underline wavy; }
  .line.missing::after { content:"no clip"; grid-column:3; font-size:11px; color:#b4432c; }
</style>
<header>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${mmss(tl.duration)} · ${tl.segments.length} lines · ${chapters.length} chapters · music ${tl.music.enabled ? 'on' : 'off'}${tl.segments.some(s => s.missing) ? ' · <b>timing preview: some lines have no clip yet</b>' : ''}</div>
  <audio id="a" controls preload="metadata" src="master.wav"></audio>
</header>
<main>
  <ol class="chapters">${chapters.map(c => `<li><button onclick="seek(${c.time})">${mmss(c.time)} ${escapeHtml(c.title)}</button></li>`).join('')}</ol>
  <ol class="lines">${rows}
  </ol>
</main>
<script>
  const a = document.getElementById('a'), lines = [...document.querySelectorAll('.line')];
  const seek = t => { a.currentTime = t; a.play(); };
  a.addEventListener('timeupdate', () => {
    const t = a.currentTime;
    let cur = null;
    for (const el of lines) if (t >= +el.dataset.start && t < +el.dataset.end) cur = el;
    if (!cur) return;
    if (!cur.classList.contains('now')) {
      lines.forEach(l => l.classList.remove('now'));
      cur.classList.add('now');
      cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
</script>
</html>`;
writeFileSync('out/player.html', html);
console.log('out/player.html  (open it, or serve the folder: python3 -m http.server)');
void voices;

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}
