import { localDraft, reviewDraft, systemPrompt } from './persona.mjs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const TIMEOUT_MS = 25_000;

/**
 * Genera una bozza di risposta.
 * - se c'è ANTHROPIC_API_KEY usa il modello (con prompt di persona)
 * - altrimenti usa il motore locale di riserva, così la demo funziona offline
 * In entrambi i casi la bozza passa dal controllo di sicurezza (reviewDraft).
 */
export async function draftReply(item, settings, account) {
  const base = {
    id: item.id,
    reply: '',
    confidence: 0,
    action: 'reply',
    reason: '',
    engine: 'locale',
    createdAt: new Date().toISOString(),
  };

  let draft = base;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      draft = { ...base, ...(await askModel(item, settings, account)), engine: 'modello' };
    } catch (err) {
      draft = {
        ...localDraft(item, settings),
        ...base,
        ...localDraft(item, settings),
        engine: 'locale (modello non raggiungibile)',
        reason: `${localDraft(item, settings).reason}`,
        note: `Modello non raggiungibile: ${err.message}`,
      };
    }
  } else {
    draft = { ...base, ...localDraft(item, settings) };
  }

  return reviewDraft(draft, item, settings);
}

async function askModel(item, settings, account) {
  const context = [
    `Commento di @${item.author?.username || 'utente'}${item.author?.name ? ` (${item.author.name})` : ''}`,
    item.post?.caption ? `sul post: "${String(item.post.caption).slice(0, 220)}"` : '',
    item.kind === 'dm' ? 'Canale: direct message' : 'Canale: commento pubblico',
    `Testo: ${item.text || '(solo emoji)'}`,
    item.previousReply ? `Hai già risposto così: "${item.previousReply}" — non ripeterti.` : '',
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        temperature: 0.6,
        system: systemPrompt(settings, account),
        messages: [{ role: 'user', content: context }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
    return {
      reply: String(json.reply || '').slice(0, 900),
      confidence: Number(json.confidence) || 0.5,
      action: ['reply', 'ignore', 'escalate'].includes(json.action) ? json.action : 'reply',
      reason: String(json.reason || ''),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Orario di silenzio: tra le 23:00 e le 08:00 non si invia nulla da soli. */
export function inQuietHours(settings, now = new Date()) {
  const q = settings.quietHours;
  if (!q?.enabled) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = String(q.from || '23:00').split(':').map(Number);
  const [th, tm] = String(q.to || '08:00').split(':').map(Number);
  const from = fh * 60 + (fm || 0);
  const to = th * 60 + (tm || 0);
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/** Decide se la bozza può partire da sola, con le regole dell'utente. */
export function canAutoSend(draft, settings, now = new Date()) {
  if (!settings.autoReply) return { ok: false, why: 'invio automatico disattivato' };
  if (draft.action !== 'reply') return { ok: false, why: `azione richiesta: ${draft.action}` };
  if (draft.needsHuman) return { ok: false, why: 'serve una persona' };
  if (inQuietHours(settings, now)) return { ok: false, why: 'orario di silenzio' };
  if (draft.confidence < (settings.autoReplyMinConfidence ?? 0.8)) return { ok: false, why: 'confidenza bassa' };
  return { ok: true, why: '' };
}
