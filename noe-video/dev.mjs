// dev.mjs — render stills for look development.
//   node dev.mjs --scene=title --times=1,3,5 --out=out/check/title
//   node dev.mjs --scene=all --times=2,8,14 --out=out/check/all
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './server.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const scene = args.scene || 'title';
const times = String(args.times || '1,3,5').split(',').map(Number);
const out = args.out || 'out/check';
const port = +(args.port || 8123);
const query = args.query || '';
const CHROME = '/home/user/opus-video-skills/noe-video/chromiumtest/package/bin/chromium';
const server = await startServer(port);
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--window-size=1920,1080', '--disable-dev-shm-usage', '--font-render-hinting=none', '--in-process-gpu', '--no-zygote'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 500)); });
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 800)));
await page.goto(`http://127.0.0.1:${port}/index.html${query}`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction('window.ready === true', { timeout: 180000 });
console.log('GPU:', await page.evaluate(() => window.getInfo().gpu));
console.log('duration:', await page.evaluate(() => window.DUR));
fs.mkdirSync(out, { recursive: true });
const scenes = scene === 'all' ? ['title', 'city', 'calling', 'construction', 'flood', 'reborn', 'rainbow', 'child', 'final'] : [scene];
for (const s of scenes) {
  await page.evaluate((s, t) => window.renderScene(s, t, 'image/png'), s, times[0]);
  for (const t of times) {
    const t0 = Date.now();
    const url = await page.evaluate((s, t) => window.renderScene(s, t, 'image/png'), s, t);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    const f = path.join(out, `${s}_${String(t).replace('.', '_')}.png`);
    fs.writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms  ${(buf.length / 1024).toFixed(0)} KB`);
  }
}
await browser.close();
server.close();
