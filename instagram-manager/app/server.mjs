import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { Store, uid } from './lib/store.mjs';
import { DEFAULT_SETTINGS, classify, reviewDraft } from './lib/persona.mjs';
import { draftReply, canAutoSend, inQuietHours } from './lib/ai.mjs';
import { demoSeed, nextDemoItem } from './lib/demo.mjs';
import * as ig from './lib/instagram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = process.env.IGM_DATA_FILE || path.join(ROOT, 'data', 'state.json');
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';
const ENV_FILE = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const MAX_AUTO_PER_HOUR = 20;
const MAX_MESSAGE_LENGTH = 400;

// ---------------------------------------------------------------------------
// .env (senza dipendenze)
// ---------------------------------------------------------------------------
for (const file of [path.join(ROOT, '.env'), path.join(__dirname, '..', '.env')]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

/**
 * Scrive nel file .env mantenendo commenti e righe esistenti.
 * Serve al pannello di configurazione: l'utente incolla le chiavi e noi le salviamo.
 */
function saveEnvFile(updates) {
  let text = '';
  if (fs.existsSync(ENV_FILE)) text = fs.readFileSync(ENV_FILE, 'utf8');
  else if (fs.existsSync(ENV_EXAMPLE)) text = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  else text = '# Configurazione di Custode\n';

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
    process.env[key] = value;
  }
  fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true });
  fs.writeFileSync(ENV_FILE, `${text.trim()}\n`);
  return ENV_FILE;
}

const store = new Store(DATA_FILE);
let state = store.load(() => demoSeed());
const save = () => store.save();

// ---------------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------------
const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
};

const fail = (res, code, message) => json(res, code, { ok: false, error: message });

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Corpo della richiesta troppo grande');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return { raw }; }
}

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const sum = (arr, k) => arr.reduce((a, b) => a + (Number(b[k]) || 0), 0);

function addActivity(kind, text) {
  state.activity.unshift({ at: new Date().toISOString(), kind, text });
  state.activity = state.activity.slice(0, 60);
}

function lastNDays(n) {
  const metrics = state.metrics || [];
  return metrics.slice(-n);
}

function computeView() {
  const last7 = lastNDays(7);
  const prev7 = (state.metrics || []).slice(-14, -7);
  const repliedItems = (state.items || []).filter((i) => i.status === 'replied' && i.repliedAt);
  const responseTimes = repliedItems
    .map((i) => (new Date(i.repliedAt) - new Date(i.createdAt)) / 1000)
    .filter((s) => s > 0);
  const avgResponse = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const pending = (state.items || []).filter((i) => ['new', 'drafted'].includes(i.status));
  const needsHuman = pending.filter(
    (i) => i.draft && (i.draft.needsHuman || i.draft.action !== 'reply' || (i.draft.confidence ?? 0) < 0.6)
  );
  const sentiment = { positivo: 0, neutro: 0, negativo: 0, spam: 0 };
  for (const i of state.items || []) sentiment[i.sentiment] = (sentiment[i.sentiment] || 0) + 1;

  const hourly = state.stats.hourly || {};
  const hourKey = new Date().toISOString().slice(0, 13);
  const autoThisHour = hourly[hourKey] || 0;

  return {
    mode: state.mode,
    connectedAt: state.connectedAt,
    account: state.account,
    settings: state.settings,
    items: [...(state.items || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    metrics: state.metrics,
    activity: state.activity,
    stats: state.stats,
    summary: {
      followers: state.account.followers ?? 0,
      newFollowers7: sum(last7, 'newFollowers'),
      newFollowersPrev7: sum(prev7, 'newFollowers'),
      likes7: sum(last7, 'likes'),
      likesPrev7: sum(prev7, 'likes'),
      comments7: sum(last7, 'comments'),
      commentsPrev7: sum(prev7, 'comments'),
      reach7: sum(last7, 'reach'),
      reachPrev7: sum(prev7, 'reach'),
      profileViews7: sum(last7, 'profileViews'),
      replied7: unrepliedCount().replied,
      pending: pending.length,
      needsHuman: needsHuman.length,
      avgResponseSeconds: avgResponse,
      autoThisHour,
      autoLimit: MAX_AUTO_PER_HOUR,
    },
    sentiment,
    capabilities: {
      metaConfigured: ig.isConfigured(),
      modelConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      scopes: ig.SCOPES,
      quietHours: state.settings.quietHours,
      inQuietHours: inQuietHours(state.settings),
    },
  };
}

function unrepliedCount() {
  const last7 = lastNDays(7);
  const total = sum(last7, 'comments');
  const replied = (state.items || []).filter(
    (i) => i.status === 'replied' && new Date(i.repliedAt || 0) > Date.now() - 7 * 86400_000
  ).length;
  return { total, replied, rate: total ? Math.min(1, replied / total) : 0 };
}

function findItem(id) {
  return (state.items || []).find((i) => i.id === id);
}

function enforceReplyLength(text) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) throw new Error('La risposta è vuota.');
  if (clean.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Troppo lunga: massimo ${MAX_MESSAGE_LENGTH} caratteri (ne hai ${clean.length}).`);
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Invio (demo o reale)
// ---------------------------------------------------------------------------
async function sendReply(item, message) {
  if (state.mode === 'live') {
    const token = state.token?.accessToken;
    if (!token) throw new Error('Account non collegato: token mancante.');
    if (item.kind === 'dm') await ig.sendMessage(token, state.account.id, item.author.id || item.author.username, message);
    else await ig.replyToComment(token, item.id, message);
  }
  item.reply = message;
  item.status = 'replied';
  item.repliedAt = new Date().toISOString();
  item.draft = null;
  item.autoSendAt = null;
  state.stats.sent = (state.stats.sent || 0) + 1;
  addActivity('reply', `Risposta inviata a @${item.author.username}.`);
  save();
  return item;
}

function bumpHourly() {
  const key = new Date().toISOString().slice(0, 13);
  state.stats.hourly = state.stats.hourly || {};
  state.stats.hourly[key] = (state.stats.hourly[key] || 0) + 1;
}

function nextAllowedSlot(settings) {
  const q = settings.quietHours;
  // Ritardo "umano": nessuno risponde in un decimo di secondo. Configurabile per le prove.
  const baseSeconds = Number(process.env.IGM_SEND_DELAY_SECONDS || (state.mode === 'demo' ? 75 : 120));
  const jitter = (baseSeconds * 0.6) * Math.random();
  if (!q?.enabled || !inQuietHours(settings)) return Date.now() + (baseSeconds + jitter) * 1000;
  const [h, m] = String(q.to || '08:00').split(':').map(Number);
  const next = new Date();
  next.setHours(h, m || 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime() + (baseSeconds + jitter) * 1000;
}

// ---------------------------------------------------------------------------
// Sincronizzazione
// ---------------------------------------------------------------------------
async function sync() {
  if (state.mode !== 'live') {
    // In demo: arriva un commento nuovo ogni tanto, per vedere il flusso.
    if (Math.random() < 0.55) state.items.push(nextDemoItem());
    const today = state.metrics[state.metrics.length - 1];
    if (today) {
      today.comments += 1;
      today.reach += Math.round(Math.random() * 40);
    }
    save();
    return { added: 1, mode: 'demo' };
  }

  const token = state.token?.accessToken;
  if (!token) throw new Error('Token assente: collega l’account.');
  const me = await ig.getMe(token, state.account.id);
  state.account = { ...state.account, ...me };

  const media = await ig.getMedia(token, state.account.id, 12);
  let added = 0;
  for (const m of media.data || []) {
    const comments = await ig.getComments(token, m.id);
    for (const c of comments.data || []) {
      if (c.username === state.account.username) continue;
      if (findItem(c.id)) continue;
      const { intent, sentiment } = classify(c.text || '');
      state.items.push({
        id: c.id,
        kind: 'comment',
        channel: 'Commento',
        author: { id: c.from?.id, username: c.username, name: c.username },
        text: c.text || '',
        post: { id: m.id, caption: m.caption || '', mediaUrl: m.media_url, permalink: m.permalink },
        permalink: c.permalink || m.permalink,
        createdAt: c.timestamp || new Date().toISOString(),
        likes: c.like_count || 0,
        intent,
        sentiment,
        status: (c.replies?.data || []).length ? 'replied' : 'new',
        reply: c.replies?.data?.[0]?.text || null,
        repliedAt: c.replies?.data?.[0]?.timestamp || null,
        hidden: false,
      });
      added += 1;
    }
  }

  const insight = await ig.getAccountInsights(
    token,
    state.account.id,
    Math.floor(Date.now() / 1000) - 7 * 86400,
    Math.floor(Date.now() / 1000)
  ).catch(() => null);
  if (insight) applyInsights(insight);

  addActivity('sync', `Sincronizzazione completata: ${added} nuovi contenuti.`);
  save();
  return { added, mode: 'live' };
}

function applyInsights(insight) {
  const byName = Object.fromEntries((insight.data || []).map((d) => [d.name, d]));
  const follower = byName.follower_count;
  const reach = byName.reach;
  const views = byName.profile_views;
  const series = follower?.values || [];
  for (const point of series) {
    const date = dayKey(point.end_time);
    const existing = state.metrics.find((m) => m.date === date);
    if (existing) existing.followers = point.value;
    else state.metrics.push({ date, followers: point.value, newFollowers: 0, likes: 0, comments: 0, reach: 0, profileViews: 0 });
  }
  for (const point of reach?.values || []) {
    const row = state.metrics.find((m) => m.date === dayKey(point.end_time));
    if (row) row.reach = point.value;
  }
  for (const point of views?.values || []) {
    const row = state.metrics.find((m) => m.date === dayKey(point.end_time));
    if (row) row.profileViews = point.value;
  }
  state.metrics.sort((a, b) => a.date.localeCompare(b.date));
  state.metrics = state.metrics.slice(-60);
}

// ---------------------------------------------------------------------------
// Bozze
// ---------------------------------------------------------------------------
async function makeDraft(item, { force = false } = {}) {
  if (item.status === 'replied' && !force) return item.draft;
  const draft = await draftReply(item, state.settings, state.account);
  item.draft = draft;
  item.status = item.status === 'spam' || item.status === 'hidden' ? item.status : 'drafted';

  const gate = canAutoSend(draft, state.settings);
  if (gate.ok && (state.stats.hourly?.[new Date().toISOString().slice(0, 13)] || 0) < MAX_AUTO_PER_HOUR) {
    item.autoSendAt = new Date(nextAllowedSlot(state.settings)).toISOString();
    item.autoSendWhy = inQuietHours(state.settings)
      ? 'In uscita al termine dell’orario di silenzio.'
      : `In uscita automaticamente tra poco (bozza sicura: ${Math.round(draft.confidence * 100)}%).`;
  } else {
    item.autoSendAt = null;
    item.autoSendWhy = gate.why;
  }
  save();
  return draft;
}

async function draftPending(limit = 6) {
  const pending = state.items.filter((i) => i.status === 'new').slice(0, limit);
  for (const item of pending) {
    try { await makeDraft(item); } catch (err) { console.error('Bozza fallita', item.id, err.message); }
  }
}

// Ticker: invia le bozze automatiche quando è il momento.
setInterval(() => {
  const now = Date.now();
  for (const item of state.items) {
    if (item.status !== 'drafted' || !item.autoSendAt) continue;
    if (new Date(item.autoSendAt).getTime() > now) continue;
    if (!state.settings.autoReply) { item.autoSendAt = null; continue; }
    const gate = canAutoSend(item.draft || {}, state.settings);
    if (!gate.ok) { item.autoSendAt = null; item.autoSendWhy = gate.why; continue; }
    if ((state.stats.hourly?.[new Date().toISOString().slice(0, 13)] || 0) >= MAX_AUTO_PER_HOUR) continue;
    try {
      sendReply(item, item.draft.reply).then(() => bumpHourly());
      state.stats.autoSent = (state.stats.autoSent || 0) + 1;
    } catch (err) {
      item.autoSendAt = null;
      item.autoSendWhy = `Invio non riuscito: ${err.message}`;
    }
  }
  save();
}, 15_000).unref();

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------
function verifySignature(raw, signature) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret || !signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

async function handleWebhook(payload) {
  const entries = payload.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      if (change.field === 'comments') {
        if (findItem(v.id)) continue;
        const { intent, sentiment } = classify(v.text || '');
        const item = {
          id: v.id,
          kind: 'comment',
          channel: 'Commento',
          author: { id: v.from?.id, username: v.from?.username || 'utente', name: v.from?.username || 'utente' },
          text: v.text || '',
          post: { id: v.media?.id, caption: v.media?.caption || '' },
          createdAt: new Date().toISOString(),
          likes: 0,
          intent,
          sentiment,
          status: 'new',
          reply: null,
          repliedAt: null,
          hidden: false,
        };
        state.items.push(item);
        addActivity('webhook', `Nuovo commento da @${item.author.username}.`);
        makeDraft(item).catch((e) => console.error('Bozza webhook', e.message));
      }
      if (change.field === 'messages') {
        for (const m of v.messages || []) {
          if (m.from?.id === state.account.id) continue;
          const id = `dm_${m.mid}`;
          if (findItem(id)) continue;
          const text = m.message?.text || '';
          const { intent, sentiment } = classify(text);
          const item = {
            id,
            kind: 'dm',
            channel: 'Direct',
            author: { id: m.from?.id, username: m.from?.username || 'utente', name: m.from?.username || 'utente' },
            text,
            post: null,
            createdAt: new Date().toISOString(),
            likes: 0,
            intent,
            sentiment,
            status: 'new',
            reply: null,
            repliedAt: null,
            hidden: false,
          };
          state.items.push(item);
          addActivity('webhook', `Nuovo direct da @${item.author.username}.`);
          makeDraft(item).catch((e) => console.error('Bozza webhook', e.message));
        }
      }
    }
  }
  save();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const staticTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.icns': 'image/icns',
};

function serveStatic(req, res, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  // /assets/ sta fuori da public/: contiene icone e manifest condivisi con i launcher.
  const isAsset = clean.startsWith('/assets/');
  const base = isAsset ? path.join(ROOT, 'assets') : PUBLIC;
  const file = isAsset ? path.join(ROOT, 'assets', rel.replace(/^assets\//, '')) : path.join(PUBLIC, rel);
  if (!file.startsWith(base)) return fail(res, 403, 'Percorso non valido');
  fs.readFile(file, (err, data) => {
    if (err) {
      if (clean !== '/' && !path.extname(clean)) return serveStatic(req, res, '/');
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Non trovato');
    }
    res.writeHead(200, {
      'content-type': staticTypes[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  const method = req.method || 'GET';

  try {
    // --- pagina e file statici
    if (method === 'GET' && !pathname.startsWith('/api/') && !['/webhook', '/auth/callback'].includes(pathname)) {
      return serveStatic(req, res, pathname);
    }

    // --- webhook Meta
    if (pathname === '/webhook' && method === 'GET') {
      const p = url.searchParams;
      if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end(p.get('hub.challenge') || '');
      }
      return fail(res, 403, 'Verifica webhook non riuscita');
    }

    if (pathname === '/webhook' && method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      const sig = req.headers['x-hub-signature-256'];
      if (process.env.IG_APP_SECRET && !verifySignature(raw, sig)) {
        return fail(res, 401, 'Firma webhook non valida');
      }
      try { await handleWebhook(JSON.parse(raw)); } catch (e) { console.error('Webhook', e.message); }
      return json(res, 200, { ok: true });
    }

    // --- OAuth
    if (pathname === '/api/auth/start' && method === 'GET') {
      if (!ig.isConfigured()) return fail(res, 400, 'Mancano IG_APP_ID, IG_APP_SECRET o IG_REDIRECT_URI nel file .env');
      const st = crypto.randomBytes(12).toString('hex');
      state.oauthState = st;
      save();
      res.writeHead(302, { location: ig.authUrl(st) });
      return res.end();
    }

    if (pathname === '/auth/callback' && method === 'GET') {
      const code = url.searchParams.get('code');
      const st = url.searchParams.get('state');
      const err = url.searchParams.get('error_description') || url.searchParams.get('error');
      const back = (msg) => {
        res.writeHead(302, { location: `/?connect=${encodeURIComponent(msg)}` });
        res.end();
      };
      if (err) return back(`Autorizzazione negata: ${err}`);
      if (!code || st !== state.oauthState) return back('Sessione di autorizzazione non valida, riprova.');
      try {
        const token = await ig.exchangeCode(code);
        const me = await ig.getMe(token.accessToken, token.userId);
        state.mode = 'live';
        state.token = token;
        state.account = {
          id: me.id,
          username: me.username,
          name: me.name || me.username,
          followers: me.followers_count ?? 0,
          follows: me.follows_count ?? 0,
          mediaCount: me.media_count ?? 0,
        };
        state.connectedAt = new Date().toISOString();
        state.oauthState = null;
        state.metrics = [];
        state.items = [];
        state.stats = { sent: 0, autoSent: 0, escalated: 0, ignored: 0 };
        addActivity('info', `Account @${state.account.username} collegato.`);
        save();
        await sync().catch((e) => console.error('Prima sync', e.message));
        return back('collegato');
      } catch (e) {
        return back(`Collegamento non riuscito: ${e.message}`);
      }
    }

    // --- Configurazione dell'app Meta, dal pannello
    if (pathname === '/api/config' && method === 'GET') {
      const c = ig.config();
      const secret = c.appSecret || '';
      return json(res, 200, {
        ok: true,
        config: {
          appId: c.appId,
          redirectUri: c.redirectUri || `http://localhost:${PORT}/auth/callback`,
          verifyToken: c.verifyToken,
          hasSecret: Boolean(secret),
          secretMask: secret ? `••••••••${secret.slice(-4)}` : '',
          configured: ig.isConfigured(),
          envFile: ENV_FILE,
        },
      });
    }

    if (pathname === '/api/config' && method === 'POST') {
      const body = await readBody(req);
      const updates = {};
      const appId = String(body.appId || '').trim();
      const appSecret = String(body.appSecret || '').trim();
      const redirectUri = String(body.redirectUri || '').trim();
      const verifyToken = String(body.verifyToken || '').trim();

      if (appId && !/^[0-9]{6,25}$/.test(appId)) return fail(res, 400, 'L’App ID è fatto solo di cifre.');
      if (appSecret && !/^[0-9a-fA-F]{20,}$/.test(appSecret)) {
        return fail(res, 400, 'L’App Secret sembra incompleto (sono circa 32 caratteri esadecimali).');
      }
      if (redirectUri && !/^https?:\/\/[^\s]+$/i.test(redirectUri)) {
        return fail(res, 400, 'Il redirect URI deve iniziare con http:// o https://');
      }
      if (verifyToken && verifyToken.length < 8) {
        return fail(res, 400, 'Il verify token deve avere almeno 8 caratteri.');
      }

      if (appId) updates.IG_APP_ID = appId;
      if (appSecret) updates.IG_APP_SECRET = appSecret;
      if (redirectUri) updates.IG_REDIRECT_URI = redirectUri;
      if (verifyToken) updates.IG_WEBHOOK_VERIFY_TOKEN = verifyToken;

      if (!Object.keys(updates).length) return fail(res, 400, 'Non c’è niente da salvare.');
      saveEnvFile(updates);
      addActivity('settings', 'Credenziali dell’app Meta salvate.');
      save();

      const notes = [];
      try {
        const uri = new URL(process.env.IG_REDIRECT_URI);
        if (Number(uri.port || (uri.protocol === 'https:' ? 443 : 80)) !== PORT) {
          notes.push(`Il redirect URI punta alla porta ${uri.port || '(predefinita)'} ma Custode è in ascolto sulla ${PORT}: allinea PORT nel .env o cambia l’URI.`);
        }
      } catch { /* già validato */ }

      return json(res, 200, { ok: true, configured: ig.isConfigured(), notes, envFile: ENV_FILE });
    }

    // --- API
    if (pathname === '/api/state' && method === 'GET') return json(res, 200, { ok: true, ...computeView() });
    if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok: true, mode: state.mode });

    if (pathname === '/api/settings' && method === 'POST') {
      const body = await readBody(req);
      state.settings = { ...state.settings, ...body, quietHours: { ...state.settings.quietHours, ...(body.quietHours || {}) } };
      save();
      addActivity('settings', 'Impostazioni aggiornate.');
      return json(res, 200, { ok: true, settings: state.settings });
    }

    if (pathname === '/api/sync' && method === 'POST') {
      const result = await sync();
      await draftPending();
      return json(res, 200, { ok: true, result, ...computeView() });
    }

    if (pathname === '/api/reset' && method === 'POST') {
      if (state.mode === 'live') return fail(res, 400, 'In modalità live non si resetta: scollega prima l’account.');
      state = store.reset(() => demoSeed());
      return json(res, 200, { ok: true, ...computeView() });
    }

    const itemMatch = pathname.match(/^\/api\/items\/([^/]+)\/(draft|reply|hide|ignore|spam|reopen)$/);
    if (itemMatch) {
      const [, rawId, action] = itemMatch;
      const id = decodeURIComponent(rawId);
      const item = findItem(id);
      if (!item) return fail(res, 404, 'Elemento non trovato');
      const body = method === 'POST' ? await readBody(req) : {};

      if (action === 'draft' && method === 'POST') {
        const draft = await makeDraft(item, { force: Boolean(body.regenerate) });
        return json(res, 200, { ok: true, item, draft });
      }

      if (action === 'reply' && method === 'POST') {
        const message = enforceReplyLength(body.message ?? item.draft?.reply);
        await sendReply(item, message);
        return json(res, 200, { ok: true, item });
      }

      if (action === 'hide' && method === 'POST') {
        if (state.mode === 'live') {
          const token = state.token?.accessToken;
          await ig.hideComment(token, item.id, Boolean(body.hide ?? true));
        }
        item.hidden = Boolean(body.hide ?? true);
        addActivity('moderation', `Commento di @${item.author.username} ${item.hidden ? 'nascosto' : 'di nuovo visibile'}.`);
        save();
        return json(res, 200, { ok: true, item });
      }

      if (action === 'ignore' && method === 'POST') {
        item.status = 'ignored';
        item.autoSendAt = null;
        state.stats.ignored = (state.stats.ignored || 0) + 1;
        addActivity('moderation', `Commento di @${item.author.username} ignorato (nessuna risposta).`);
        save();
        return json(res, 200, { ok: true, item });
      }

      if (action === 'spam' && method === 'POST') {
        item.status = 'spam';
        item.autoSendAt = null;
        if (state.mode === 'live' && process.env.IG_HIDE_SPAM === 'true') {
          await ig.hideComment(state.token?.accessToken, item.id, true).catch(() => {});
          item.hidden = true;
        }
        addActivity('moderation', `@${item.author.username} segnato come spam.`);
        save();
        return json(res, 200, { ok: true, item });
      }

      if (action === 'reopen' && method === 'POST') {
        item.status = 'drafted';
        item.reply = null;
        item.repliedAt = null;
        save();
        return json(res, 200, { ok: true, item });
      }
    }

    if (pathname === '/api/disconnect' && method === 'POST') {
      state = store.reset(() => demoSeed());
      return json(res, 200, { ok: true, ...computeView() });
    }

    return fail(res, 404, `Rotta sconosciuta: ${method} ${pathname}`);
  } catch (err) {
    console.error('Errore', method, pathname, err);
    return fail(res, 500, err.message || 'Errore interno');
  }
});

export function startServer({ port = PORT, host = HOST } = {}) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const url = `http://localhost:${port}`;
      console.log(`\n  Custode — Instagram Manager (modalità ${state.mode})`);
      console.log(`  Dashboard: ${url}`);
      if (state.mode === 'demo') console.log('  Nessun account collegato: stai vedendo l’account di prova @bottega.luce.');
      if (!process.env.ANTHROPIC_API_KEY) console.log('  ANTHROPIC_API_KEY assente: le bozze usano il motore locale.');
      console.log('');

      // Prima impressione: in demo prepariamo qualche bozza, così la casella non è vuota.
      if (state.mode === 'demo' && !state.items.some((i) => i.draft)) {
        draftPending(4).catch((err) => console.error('Bozze iniziali', err.message));
      }
      resolve({ server, port, url });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer().catch((err) => {
    console.error('Impossibile avviare il server:', err.message);
    process.exit(1);
  });
}
