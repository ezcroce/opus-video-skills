/**
 * Client per la Instagram Platform (API ufficiale di Meta, login con Instagram).
 * Docs: https://developers.facebook.com/docs/instagram-platform
 *
 * Regola di questo file: una funzione = una chiamata documentata.
 * Niente scraping, niente endpoint non ufficiali: sono la via più rapida
 * per farsi bloccare l'account.
 */

const OAUTH_BASE = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
const API_VERSION = process.env.IG_API_VERSION || 'v23.0';

export const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
  'instagram_business_manage_insights',
];

export function config() {
  return {
    appId: process.env.IG_APP_ID || '',
    appSecret: process.env.IG_APP_SECRET || '',
    redirectUri: process.env.IG_REDIRECT_URI || '',
    verifyToken: process.env.IG_WEBHOOK_VERIFY_TOKEN || '',
  };
}

export function isConfigured() {
  const c = config();
  return Boolean(c.appId && c.appSecret && c.redirectUri);
}

export function authUrl(state) {
  const c = config();
  const params = new URLSearchParams({
    client_id: c.appId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: SCOPES.join(','),
    state,
  });
  return `${OAUTH_BASE}?${params.toString()}`;
}

export async function exchangeCode(code) {
  const c = config();
  const body = new URLSearchParams({
    client_id: c.appId,
    client_secret: c.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: c.redirectUri,
    code,
  });
  const res = await fetch(TOKEN_URL, { method: 'POST', body });
  if (!res.ok) throw new Error(`Scambio codice fallito: HTTP ${res.status} ${await safeText(res)}`);
  const short = await res.json(); // { access_token, user_id, permissions }
  const long = await longLived(short.access_token);
  return {
    accessToken: long.access_token || short.access_token,
    expiresAt: long.expires_in ? Date.now() + long.expires_in * 1000 : null,
    userId: String(short.user_id || ''),
  };
}

async function longLived(token) {
  const url = `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(config().appSecret)}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return { access_token: token };
  return res.json();
}

/** Rinnovo del token long-lived (va fatto almeno ogni 60 giorni). */
export async function refreshToken(token) {
  const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Rinnovo token fallito: HTTP ${res.status}`);
  return res.json();
}

async function graphGet(path, token, params = {}) {
  const url = new URL(`${GRAPH}/${API_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status} ${await safeText(res)}`);
  return res.json();
}

async function graphPost(path, token, body) {
  const url = new URL(`${GRAPH}/${API_VERSION}${path}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: token }),
  });
  if (!res.ok) throw new Error(`POST ${path} -> HTTP ${res.status} ${await safeText(res)}`);
  return res.json();
}

async function graphDelete(path, token) {
  const url = new URL(`${GRAPH}/${API_VERSION}${path}`);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} -> HTTP ${res.status} ${await safeText(res)}`);
  return res.json();
}

async function safeText(res) {
  try { return (await res.text()).slice(0, 300); } catch { return ''; }
}

// --- Lettura ---------------------------------------------------------------

export async function getMe(token, igUserId) {
  const fields = 'id,username,name,profile_picture_url,followers_count,follows_count,media_count';
  if (igUserId) return graphGet(`/${igUserId}`, token, { fields });
  return graphGet('/me', token, { fields });
}

export async function getMedia(token, igUserId, limit = 20) {
  return graphGet(`/${igUserId}/media`, token, ({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
    limit,
  }));
}

/** Commenti di un post. `replies` incluso per capire cosa abbiamo già risposto. */
export async function getComments(token, mediaId) {
  return graphGet(`/${mediaId}/comments`, token, ({
    fields: 'id,text,username,timestamp,like_count,replies{id,text,username,timestamp}',
    limit: 50,
  }));
}

/** Insight dell'account: follower e reach nel periodo. */
export async function getAccountInsights(token, igUserId, since, until) {
  return graphGet(`/${igUserId}/insights`, token, ({
    metric: 'follower_count,reach,profile_views',
    period: 'day',
    since,
    until,
  }));
}

// --- Azioni ----------------------------------------------------------------

export async function replyToComment(token, commentId, message) {
  return graphPost(`/${commentId}/replies`, token, { message });
}

export async function hideComment(token, commentId, hide = true) {
  return graphPost(`/${commentId}`, token, { hide: String(hide) });
}

export async function deleteComment(token, commentId) {
  return graphDelete(`/${commentId}`, token);
}

export async function sendMessage(token, igUserId, recipientId, message) {
  return graphPost(`/${igUserId}/messages`, token, {
    recipient: JSON.stringify({ id: recipientId }),
    message: JSON.stringify({ text: message }),
  });
}

/** Risposta privata a chi ha commentato (una sola, entro 7 giorni). */
export async function privateReply(token, igUserId, commentId, message) {
  return graphPost(`/${igUserId}/messages`, token, {
    recipient: JSON.stringify({ comment_id: commentId }),
    message: JSON.stringify({ text: message }),
  });
}
