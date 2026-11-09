#!/usr/bin/env node
/**
 * Custode — avvio "da app".
 *
 * Fa tre cose: avvia il server locale, apre una finestra dedicata (Chrome/Edge/Brave
 * in modalità --app, quindi senza barra degli indirizzi), e chiude tutto quando chiudi
 * la finestra. Se non trova un browser Chromium, apre il browser predefinito e resta vivo
 * finché non premi Ctrl+C.
 *
 *     node app/launcher.mjs            # apre la finestra
 *     node app/launcher.mjs --server   # solo server, senza finestra
 *     node app/launcher.mjs --port 5000
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const LOG_FILE = path.join(DATA_DIR, 'launcher.log');
const WINDOW_SIZE = '1360,900';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}`;
  try {
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch { /* non blocchiamo l'avvio per un log */ }
  console.log(parts.join(' '));
}

function portFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, host);
  });
}

async function alreadyRunning(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

async function pickPort(preferred) {
  for (let p = preferred; p < preferred + 25; p += 1) {
    if (await portFree(p)) return p;
  }
  throw new Error('Nessuna porta libera tra ' + preferred + ' e ' + (preferred + 24));
}

function exists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function findChromium() {
  const platform = process.platform;
  const candidates = [];

  if (platform === 'win32') {
    const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(root, 'Chromium', 'Application', 'chrome.exe'),
        path.join(root, 'Vivaldi', 'Application', 'vivaldi.exe'),
      );
    }
  } else if (platform === 'darwin') {
    const home = os.homedir();
    for (const base of ['/Applications', path.join(home, 'Applications')]) {
      candidates.push(
        path.join(base, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
        path.join(base, 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'),
        path.join(base, 'Brave Browser.app', 'Contents', 'MacOS', 'Brave Browser'),
        path.join(base, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(base, 'Vivaldi.app', 'Contents', 'MacOS', 'Vivaldi'),
      );
    }
  } else {
    for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser', 'vivaldi-stable']) {
      const found = spawnSync('which', [bin], { encoding: 'utf8' });
      if (found.status === 0 && found.stdout.trim()) candidates.push(found.stdout.trim());
    }
  }

  return candidates.find(exists) || null;
}

function openExternal(url) {
  const [cmd, cmdArgs] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  try {
    const p = spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true });
    p.on('error', () => {});
    p.unref();
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(port, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch { /* riprovo */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const preferred = Number(value('port', process.env.PORT || 4321));
  let port = preferred;
  let child = null;
  let ownsServer = false;

  if (await alreadyRunning(preferred)) {
    log(`Trovata un’istanza già attiva sulla porta ${preferred}: la riuso.`);
  } else {
    port = await pickPort(preferred);
    const serverPath = path.join(__dirname, 'server.mjs');
    child = spawn(process.execPath, [serverPath], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    ownsServer = true;
    child.stdout.on('data', (b) => fs.appendFileSync(LOG_FILE, b));
    child.stderr.on('data', (b) => {
      fs.appendFileSync(LOG_FILE, b);
      process.stderr.write(b);
    });
    child.on('exit', (code) => {
      if (code && code !== 0) log(`Server terminato con codice ${code}. Dettagli in ${LOG_FILE}`);
    });

    log(`Avvio del server sulla porta ${port}…`);
    const ready = await waitForServer(port);
    if (!ready) {
      log('Il server non ha risposto in tempo. Guarda data/launcher.log.');
      if (child) child.kill();
      process.exitCode = 1;
      return;
    }
  }

  // localhost (non 127.0.0.1): così combacia con il redirect URI documentato per Meta
  const url = `http://localhost:${port}/`;
  log(`Pronto: ${url}`);

  const shutdown = (code = 0) => {
    if (child && ownsServer && !child.killed) {
      log('Chiusura del server…');
      child.kill();
    }
    process.exit(code);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  process.on('uncaughtException', (err) => { log('Errore imprevisto:', err.message); shutdown(1); });

  if (flag('server')) {
    log('Modalità solo server: apri ' + url + ' nel browser. Ctrl+C per uscire.');
    return;
  }

  const browser = findChromium();
  if (!browser) {
    log('Nessun browser Chromium trovato: apro il browser predefinito.');
    openExternal(url);
    if (ownsServer) {
      log('La finestra del browser non è gestita da Custode: chiudi con Ctrl+C quando hai finito.');
      return;
    }
    return;
  }

  const profileDir = path.join(DATA_DIR, 'browser-profile');
  fs.mkdirSync(profileDir, { recursive: true });

  const browserArgs = [
    `--app=${url}`,
    `--window-size=${WINDOW_SIZE}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,MediaRouter',
    '--class=Custode',
  ];

  log('Apro la finestra dell’app…');
  const startedAt = Date.now();
  const app = spawn(browser, browserArgs, { stdio: 'ignore', windowsHide: false });

  let closed = false;
  app.on('exit', () => {
    if (closed) return;
    closed = true;
    // Se il browser delega a un processo già in esecuzione ed esce subito, non chiudiamo il server.
    if (Date.now() - startedAt < 4000) {
      log('Il browser è uscito subito: probabilmente ha passato l’URL a un’altra istanza.');
      if (!openExternal(url)) log('Apri manualmente ' + url);
      return;
    }
    log('Finestra chiusa: spengo il server.');
    shutdown(0);
  });

  app.on('error', (err) => {
    log('Impossibile aprire la finestra:', err.message);
    openExternal(url);
  });
}

main().catch((err) => {
  log('Errore di avvio:', err.message);
  process.exitCode = 1;
});
