const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const nf = new Intl.NumberFormat('it-IT');
const compact = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 });

let state = null;
let config = null;
let configTouched = false;
let view = 'overview';
let filter = 'pending';
let selectedId = null;
let toneHintTimer = null;
const edits = new Map(); // testo modificato a mano, per non perderlo al refresh

const TONE_HINTS = {
  gentile: 'Frasi brevi e pacate, nessuna esclamazione, ringrazia sempre.',
  caloroso: 'Più affettuoso, usa un “noi”, qualche punto esclamativo ogni tanto.',
  professionale: 'Formale ma umano, nessuna emoji, informazioni precise.',
  leggero: 'Un sorriso leggero, mai sarcasmo, sempre rispettoso.',
};

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const initials = (name = '?') =>
  name.trim().charAt(0).toUpperCase() || '?';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'adesso';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} g`;
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function ago(iso) {
  const t = timeAgo(iso);
  return t === 'adesso' ? t : `${t} fa`;
}

function inWords(seconds) {
  if (seconds == null) return '—';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 129600) return `${(seconds / 3600).toFixed(1)} h`;
  return `${Math.round(seconds / 86400)} g`;
}

function toast(message, isError = false) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('err', isError);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4200);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}

async function load({ silent = false } = {}) {
  try {
    const [data, cfg] = await Promise.all([
      api('/api/state'),
      api('/api/config').catch(() => null),
    ]);
    state = data;
    if (cfg) config = cfg.config;
    render();
  } catch (err) {
    if (!silent) toast(err.message, true);
  }
}

// ---------------------------------------------------------------- rendering
function render() {
  renderAccount();
  renderOverview();
  renderInbox();
  renderSettings();
  renderConnect();
  renderConfig();
  $('#nav-badge').textContent = state.summary.pending;
  $('#nav-badge').style.display = state.summary.pending ? 'grid' : 'none';
}

function renderAccount() {
  const a = state.account || {};
  $('#account-card').innerHTML = `
    <div class="avatar">${esc(initials(a.name || a.username))}</div>
    <div class="who">
      <b>${esc(a.name || a.username || 'Account')}</b>
      <small>@${esc(a.username || '—')} · ${nf.format(a.followers || 0)} follower</small>
    </div>`;
  $('#mode-note').textContent =
    state.mode === 'live'
      ? `Collegato il ${new Date(state.connectedAt).toLocaleDateString('it-IT')}.`
      : 'Account di prova: nessun dato reale finché non colleghi il tuo.';
}

function renderOverview() {
  const s = state.summary;
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  const delta = (a, b) => {
    const p = pct(a, b);
    if (p === null) return '<span class="d">nuovo</span>';
    if (p === 0) return '<span class="d">stabile</span>';
    return `<span class="d ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)}% · 7 gg</span>`;
  };

  const cards = [
    { cls: 'highlight', k: 'Follower', v: nf.format(s.followers), d: `<span class="d up">▲ ${s.newFollowers7}</span>`, sub: 'questa settimana' },
    { k: 'Like ricevuti', v: nf.format(s.likes7), d: delta(s.likes7, s.likesPrev7) },
    { k: 'Commenti', v: nf.format(s.comments7), d: delta(s.comments7, s.commentsPrev7) },
    { k: 'Copertura', v: compact.format(s.reach7), d: delta(s.reach7, s.reachPrev7) },
    { k: 'Da rispondere', v: nf.format(s.pending), d: `<span class="d${s.needsHuman ? ' down' : ''}">${s.needsHuman} per te</span>` },
    { k: 'Tempo di risposta', v: inWords(s.avgResponseSeconds), d: `<span class="d">ultimi 7 giorni</span>` },
  ];
  $('#stats').innerHTML = cards
    .map(
      (c) => `<div class="stat ${c.cls || ''}">
        <p class="k">${c.k}</p>
        <p class="v">${c.v}</p>
        ${c.sub ? `<p class="d">${c.sub}</p>` : c.d}
      </div>`
    )
    .join('');

  const metrics = state.metrics || [];
  lineChart($('#followers-chart'), metrics.map((m) => m.followers), '#2f6b4f');
  const first = metrics[0]?.followers || 0;
  const last = metrics[metrics.length - 1]?.followers || 0;
  const diff = last - first;
  $('#followers-delta').textContent = diff >= 0 ? `+${nf.format(diff)}` : nf.format(diff);
  $('#followers-delta').className = `delta${diff > 0 ? '' : ' flat'}`;

  barsChart($('#engagement-chart'), metrics.slice(-14));

  const sent = state.sentiment;
  const total = Object.values(sent).reduce((a, b) => a + b, 0) || 1;
  const rows = [
    ['positivo', 'Positivi'],
    ['neutro', 'Neutri'],
    ['negativo', 'Da gestire'],
    ['spam', 'Spam'],
  ];
  $('#sentiment').innerHTML = rows
    .map(
      ([key, label]) => `<div class="sent-row">
        <span>${label}</span>
        <span class="bar"><i class="${key}" style="width:${Math.round((sent[key] / total) * 100)}%"></i></span>
        <span>${sent[key] || 0}</span>
      </div>`
    )
    .join('');

  $('#activity').innerHTML = (state.activity || [])
    .slice(0, 12)
    .map((a) => `<li data-kind="${a.kind}"><div>${esc(a.text)}<time>${ago(a.at)}</time></div></li>`)
    .join('');

  const caps = [
    ['yes', 'Rispondere ai commenti', 'Sui tuoi post, reel e album. È il cuore di tutto questo.'],
    ['yes', 'Rispondere ai direct', 'Entro 24 ore dall’ultimo messaggio (7 con l’etichetta operatore umano).'],
    ['yes', 'Leggere follower, like e copertura', 'Numeri e andamento giornaliero, non i singoli profili.'],
    ['yes', 'Moderare', 'Nascondere o eliminare commenti, segnalare spam.'],
    ['warn', 'Rispondere “con calma”', state.settings.autoReply ? 'Invio automatico attivo solo per le bozze sicure, con un ritardo naturale.' : 'Invio automatico spento: ogni risposta passa da te.'],
    ['no', 'Mettere like da solo', 'L’API ufficiale non lo permette. I bot che lo fanno mettono a rischio l’account.'],
    ['no', 'Seguire o smettere di seguire', 'Stessa ragione: non è previsto dall’API.'],
  ];
  $('#capabilities').innerHTML = caps
    .map(([cls, title, text]) => `<div class="cap ${cls}"><b>${title}</b><small>${text}</small></div>`)
    .join('');
}

function renderInbox() {
  $('#tone-label').textContent = labelForTone(state.settings.tone).toLowerCase();
  const items = filteredItems();
  const list = $('#inbox-list');

  if (!items.length) {
    list.innerHTML = `<div class="empty" style="border:0;min-height:180px">Niente da fare qui. Respira.</div>`;
    $('#inbox-detail').innerHTML = `<div class="empty"><p>Nessun elemento in questa vista.</p></div>`;
    selectedId = null;
    return;
  }
  if (!items.some((i) => i.id === selectedId)) selectedId = items[0].id;

  list.innerHTML = items
    .map((i) => {
      const tag = statusTag(i);
      return `<button class="row ${i.id === selectedId ? 'is-selected' : ''}" data-id="${esc(i.id)}">
        <span class="mini-avatar">${esc(initials(i.author?.name || i.author?.username))}</span>
        <span class="meta">
          <b>@${esc(i.author?.username || 'utente')}</b>
          <p>${esc(i.text || '(solo emoji)')}</p>
        </span>
        <span class="side">${tag}<time>${timeAgo(i.createdAt)}</time></span>
      </button>`;
    })
    .join('');

  $$('.row', list).forEach((row) =>
    row.addEventListener('click', () => {
      selectedId = row.dataset.id;
      renderInbox();
    })
  );

  renderDetail(items.find((i) => i.id === selectedId));
}

function statusTag(item) {
  if (item.status === 'spam') return '<span class="tag spam">spam</span>';
  if (item.status === 'ignored') return '<span class="tag ignored">ignorato</span>';
  if (item.status === 'replied') return '<span class="tag replied">risposto</span>';
  if (item.draft?.needsHuman) return '<span class="tag human">per te</span>';
  if (item.draft) return `<span class="tag drafted">bozza</span>`;
  return '<span class="tag new">nuovo</span>';
}

function filteredItems() {
  const items = state.items || [];
  if (filter === 'all') return items;
  if (filter === 'replied') return items.filter((i) => i.status === 'replied');
  if (filter === 'spam') return items.filter((i) => ['spam', 'ignored', 'hidden'].includes(i.status));
  return items.filter((i) => ['new', 'drafted'].includes(i.status));
}

function renderDetail(item) {
  if (!item) return;
  const box = $('#inbox-detail');
  const draft = item.draft;
  const isDone = item.status === 'replied';

  const conf = draft ? Math.round((draft.confidence || 0) * 100) : 0;
  const confClass = conf >= 80 ? '' : conf >= 60 ? 'low' : 'bad';

  const postChip = item.post
    ? `<div class="post-chip">
         <div class="post-thumb" style="--from:${esc(item.post.from || '#e8ddd0')};--to:${esc(item.post.to || '#c9a98c')}">${esc(item.post.emoji || '◍')}</div>
         <p>${esc(item.post.caption || 'Post')}</p>
       </div>`
    : `<div class="post-chip"><div class="post-thumb">✉︎</div><p>Messaggio diretto</p></div>`;

  const autoNote = item.autoSendAt
    ? `<div class="auto-note" data-send-at="${esc(item.autoSendAt)}"><span>⏱</span><div>${esc(item.autoSendWhy || 'In uscita automaticamente.')} <b>${countdown(item.autoSendAt)}</b></div></div>`
    : draft && !state.settings.autoReply
      ? `<div class="auto-note off"><span>✋</span><div>Invio automatico spento: questa risposta aspetta il tuo clic.</div></div>`
      : item.autoSendWhy
        ? `<div class="auto-note off"><span>⏸</span><div>Non parte da sola: ${esc(item.autoSendWhy)}.</div></div>`
        : '';

  const replyBlock = isDone
    ? `<p class="draft-label"><span>Risposta inviata ${ago(item.repliedAt)}</span></p>
       <div class="quote" style="border-color:#cfe0d4">${esc(item.reply || '')}</div>`
    : draft
      ? `<div class="draft-label">
           <span>Bozza di risposta</span>
           <span class="confidence ${confClass}">${conf}% sicura</span>
         </div>
         <textarea class="reply" id="reply-text" maxlength="400" placeholder="Scrivi la risposta…">${esc(edits.has(item.id) ? edits.get(item.id) : (draft.reply || ''))}</textarea>
         <div class="counter" id="counter"></div>
         ${draft.issues?.length ? `<ul class="issues">${draft.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
         ${draft.reason ? `<p class="reason">Perché: ${esc(draft.reason)}</p>` : ''}`
      : `<p class="draft-label"><span>Nessuna bozza ancora — puoi scrivere tu</span></p>
         <textarea class="reply" id="reply-text" maxlength="400" placeholder="Scrivi la risposta…">${esc(edits.get(item.id) || '')}</textarea>
         <div class="counter" id="counter"></div>
         <p class="muted" style="font-size:.85rem;margin-top:8px">Oppure genera una bozza: leggo il commento, il tono scelto e quello che mi hai detto di poter rispondere.</p>`;

  const actions = isDone
    ? `<button class="btn small" data-act="reopen">Riapri</button>
       <button class="btn small danger" data-act="hide">${item.hidden ? 'Mostra' : 'Nascondi'} commento</button>`
    : `<button class="btn primary" data-act="send" ${draft && !draft.reply ? 'disabled' : ''}>
         ${item.kind === 'dm' ? 'Invia direct' : 'Invia risposta'}
       </button>
       <button class="btn" data-act="draft">${draft ? 'Rigenera' : 'Genera bozza'}</button>
       <button class="btn ghost" data-act="ignore">Ignora</button>
       <button class="btn ghost danger" data-act="spam">Spam</button>
       <button class="btn ghost danger" data-act="hide">${item.hidden ? 'Mostra' : 'Nascondi'}</button>`;

  box.innerHTML = `<div class="detail-card">
      <div class="detail-top">
        <div class="mini-avatar">${esc(initials(item.author?.name || item.author?.username))}</div>
        <div class="who">
          <b>${esc(item.author?.name || item.author?.username || '')}</b>
          <small>@${esc(item.author?.username || '')} · ${esc(item.channel || 'Commento')} · ${ago(item.createdAt)}</small>
        </div>
        <div style="margin-left:auto">${statusTag(item)}</div>
      </div>
      <div class="detail-body">
        <p class="quote">${esc(item.text || '(solo emoji)')}</p>
        ${postChip}
        ${replyBlock}
      </div>
      ${autoNote}
      <div class="actions">${actions}</div>
    </div>`;

  const textarea = $('#reply-text');
  if (textarea) {
    const counter = $('#counter');
    const update = () => {
      counter.textContent = `${textarea.value.length} / 400`;
      counter.classList.toggle('over', textarea.value.length > 400);
    };
    update();
    textarea.addEventListener('input', () => {
      update();
      edits.set(item.id, textarea.value);
    });
  }

  $$('[data-act]', box).forEach((btn) => btn.addEventListener('click', () => doAction(btn.dataset.act, item)));
}

function countdown(iso) {
  const s = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
  if (s <= 1) return 'adesso';
  if (s < 60) return `tra ${s} s`;
  return `tra ${Math.ceil(s / 60)} min`;
}

async function doAction(act, item) {
  try {
    if (act === 'send') {
      const text = $('#reply-text');
      const message = text ? text.value : (item.draft?.reply || '');
      if (!message.trim()) return toast('Scrivi qualcosa prima di inviare.', true);
      await api(`/api/items/${encodeURIComponent(item.id)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      edits.delete(item.id);
      toast('Risposta inviata.');
    } else if (act === 'draft') {
      edits.delete(item.id);
      toast('Sto scrivendo la bozza…');
      await api(`/api/items/${encodeURIComponent(item.id)}/draft`, {
        method: 'POST',
        body: JSON.stringify({ regenerate: Boolean(item.draft) }),
      });
    } else if (act === 'ignore') {
      await api(`/api/items/${encodeURIComponent(item.id)}/ignore`, { method: 'POST', body: '{}' });
      toast('Segnato come ignorato.');
    } else if (act === 'spam') {
      await api(`/api/items/${encodeURIComponent(item.id)}/spam`, { method: 'POST', body: '{}' });
      toast('Segnato come spam.');
    } else if (act === 'hide') {
      await api(`/api/items/${encodeURIComponent(item.id)}/hide`, {
        method: 'POST',
        body: JSON.stringify({ hide: !item.hidden }),
      });
      toast(item.hidden ? 'Commento di nuovo visibile.' : 'Commento nascosto.');
    } else if (act === 'reopen') {
      await api(`/api/items/${encodeURIComponent(item.id)}/reopen`, { method: 'POST', body: '{}' });
    }
    await load({ silent: true });
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------------------------------------------------------------- settings
function renderSettings() {
  if ($('#settings-form').dataset.dirty === 'true') return;
  const s = state.settings;
  const select = $('#tone-select');
  if (!select.options.length) {
    select.innerHTML = Object.entries(TONE_HINTS)
      .map(([k, v]) => `<option value="${k}">${labelForTone(k)}</option>`)
      .join('');
  }
  select.value = s.tone;
  $('#tone-hint').textContent = TONE_HINTS[s.tone] || '';
  const form = $('#settings-form');
  form.elements.signature.value = s.signature || '';
  form.elements.emojiLevel.value = s.emojiLevel || 'poche';
  form.elements.answerFacts.value = s.answerFacts || '';
  form.elements.autoReply.checked = Boolean(s.autoReply);
  form.elements.autoReplyMinConfidence.value = s.autoReplyMinConfidence ?? 0.8;
  $('#threshold-label').textContent = `Invio automatico solo sopra il ${Math.round((s.autoReplyMinConfidence ?? 0.8) * 100)}% di sicurezza.`;
  form.elements['quietHours.enabled'].checked = Boolean(s.quietHours?.enabled);
  form.elements.quietFrom.value = s.quietHours?.from || '23:00';
  form.elements.quietTo.value = s.quietHours?.to || '08:00';
  form.elements.escalateWords.value = (s.escalateWords || []).join(', ');
  $('#quiet-enabled').closest('.switch').style.opacity = s.quietHours?.enabled ? '1' : '.6';

  const chip = $('#quiet-chip');
  chip.textContent = state.capabilities.inQuietHours
    ? `Silenzio fino alle ${s.quietHours?.to}`
    : s.quietHours?.enabled
      ? `Silenzio ${s.quietHours?.from}–${s.quietHours?.to}`
      : 'Nessun orario di silenzio';
}

function labelForTone(key) {
  return { gentile: 'Gentile e calmo', caloroso: 'Caloroso e vicino', professionale: 'Professionale e chiaro', leggero: 'Leggero e ironico' }[key] || key;
}

// ---------------------------------------------------------------- connect
function renderConnect() {
  const caps = state.capabilities;
  const isLive = state.mode === 'live';
  $('#connect-actions').innerHTML = `
    <button class="btn" id="sync-top">Sincronizza</button>
    ${caps.metaConfigured
      ? `<a class="btn primary" href="/api/auth/start">${isLive ? 'Ricollega account' : 'Collega Instagram'}</a>`
      : `<button class="btn primary" id="why-not">Prima configura l’app Meta</button>`}
  `;
  $('#sync-top')?.addEventListener('click', doSync);
  $('#why-not')?.addEventListener('click', () => {
    $('#config-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('#config-form')?.elements.appId?.focus(), 350);
    toast('Servono App ID e App Secret: li trovi in developers.facebook.com, sezione Impostazioni → Di base.');
  });

  $('#connect-status').innerHTML = `
    <div class="status-line"><span class="pill ${isLive ? 'ok' : 'warn'}">${isLive ? 'collegato' : 'demo'}</span>
      <span>${isLive ? `@${esc(state.account.username)} — dati reali` : 'Account di prova @bottega.luce — nessun dato reale'}</span></div>
    <div class="status-line"><span class="pill ${caps.metaConfigured ? 'ok' : 'off'}">${caps.metaConfigured ? 'pronto' : 'da configurare'}</span>
      <span>Credenziali app Meta (.env)</span></div>
    <div class="status-line"><span class="pill ${caps.modelConfigured ? 'ok' : 'off'}">${caps.modelConfigured ? 'attivo' : 'motore locale'}</span>
      <span>${caps.modelConfigured ? 'Modello linguistico configurato' : 'Nessuna ANTHROPIC_API_KEY: le bozze usano il motore locale, prudente ma rigido'}</span></div>
  `;

  $('#checklist').innerHTML = [
    ['Account professionale', isLive],
    ['App Meta con Instagram Login', caps.metaConfigured],
    ['Redirect URI e webhook', caps.metaConfigured],
    ['Token valido', Boolean(state.token?.accessToken) || !isLive],
  ]
    .map(([label, ok]) => `<div class="check-item"><span class="mark ${ok ? 'yes' : 'no'}">${ok ? '✓' : '·'}</span><span>${label}</span></div>`)
    .join('');

  $('#scopes').innerHTML = caps.scopes.map((s) => `<code>${esc(s)}</code>`).join('');
}

function renderConfig() {
  if (!config) return;
  const form = $('#config-form');
  if (!form) return;

  $('#config-pill').textContent = config.configured ? 'pronta' : 'da configurare';
  $('#config-pill').className = `pill ${config.configured ? 'ok' : 'off'}`;

  if (!configTouched) {
    form.elements.appId.value = config.appId || '';
    form.elements.redirectUri.value = config.redirectUri || `${location.origin}/auth/callback`;
    form.elements.verifyToken.value = config.verifyToken || '';
    form.elements.appSecret.value = '';
    form.elements.appSecret.placeholder = config.hasSecret
      ? `salvato (${config.secretMask}) — lascia vuoto per non cambiarlo`
      : 'incollalo qui';
  }
}

async function doSync() {
  const btn = $('#sync-btn');
  btn.disabled = true;
  btn.textContent = 'Sincronizzo…';
  try {
    await api('/api/sync', { method: 'POST', body: '{}' });
    await load({ silent: true });
    toast('Sincronizzato. Nuove bozze pronte.');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sincronizza ora';
  }
}

// ---------------------------------------------------------------- charts
function lineChart(el, values, color) {
  if (!values.length) {
    el.innerHTML = '<p class="muted small">Ancora nessun dato.</p>';
    return;
  }
  const w = 320, h = 100, pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1),
    h - pad - ((v - min) / span) * (h - 2 * pad),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${(w - pad).toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;
  const lastPt = pts[pts.length - 1];
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Andamento follower">
    <path d="${area}" fill="${color}" opacity=".13"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastPt[0].toFixed(1)}" cy="${lastPt[1].toFixed(1)}" r="3" fill="${color}"/>
  </svg>`;
}

function barsChart(el, rows) {
  if (!rows.length) {
    el.innerHTML = '<p class="muted small">Ancora nessun dato.</p>';
    return;
  }
  const w = 320, h = 100, pad = 3;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.likes, r.comments)));
  const slot = (w - 2 * pad) / rows.length;
  const barW = Math.max(2, slot * 0.3);
  const parts = rows
    .map((r, i) => {
      const x = pad + i * slot + slot * 0.2;
      const lh = (r.likes / max) * (h - 2 * pad);
      const ch = (r.comments / max) * (h - 2 * pad);
      return `<rect x="${(x).toFixed(1)}" y="${(h - pad - lh).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, lh).toFixed(1)}" rx="1.6" fill="#cfa96a"/>
              <rect x="${(x + barW + 1.5).toFixed(1)}" y="${(h - pad - ch).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, ch).toFixed(1)}" rx="1.6" fill="#2f6b4f"/>`;
    })
    .join('');
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Like e commenti per giorno">${parts}</svg>`;
}

// ---------------------------------------------------------------- events
function setView(next) {
  view = next;
  $$('.view').forEach((v) => v.classList.toggle('is-hidden', v.id !== `view-${next}`));
  $$('.nav-item').forEach((n) => n.classList.toggle('is-active', n.dataset.view === next));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.nav-item').forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.view)));

$$('#filters button').forEach((btn) =>
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    $$('#filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
    selectedId = null;
    renderInbox();
  })
);

$('#sync-btn').addEventListener('click', doSync);
$('#quiet-chip')?.addEventListener('click', () => setView('settings'));

$('#tone-select').addEventListener('change', (e) => {
  $('#tone-hint').textContent = TONE_HINTS[e.target.value] || '';
});

$('#settings-form').addEventListener('input', (e) => {
  e.currentTarget.dataset.dirty = 'true';
  const form = e.currentTarget;
  if (e.target.name === 'autoReplyMinConfidence') {
    $('#threshold-label').textContent = `Invio automatico solo sopra il ${Math.round(Number(e.target.value) * 100)}% di sicurezza.`;
  }
  if (e.target.name === 'quietHours.enabled') {
    $('#quiet-enabled').closest('.switch').style.opacity = e.target.checked ? '1' : '.6';
  }
  if (form._statusTimer) clearTimeout(form._statusTimer);
  form._statusTimer = setTimeout(() => {
    $('#settings-status').textContent = 'Modifiche non salvate.';
  }, 10);
});

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const payload = {
    tone: form.elements.tone.value,
    signature: form.elements.signature.value.trim(),
    emojiLevel: form.elements.emojiLevel.value,
    answerFacts: form.elements.answerFacts.value.trim(),
    autoReply: form.elements.autoReply.checked,
    autoReplyMinConfidence: Number(form.elements.autoReplyMinConfidence.value),
    quietHours: {
      enabled: form.elements['quietHours.enabled'].checked,
      from: form.elements.quietFrom.value || '23:00',
      to: form.elements.quietTo.value || '08:00',
    },
    escalateWords: form.elements.escalateWords.value
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean),
  };
  try {
    await api('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
    form.dataset.dirty = 'false';
    $('#settings-status').textContent = 'Salvato.';
    toast('Impostazioni salvate.');
    await load({ silent: true });
    $('#settings-status').textContent = 'Salvato.';
  } catch (err) {
    toast(err.message, true);
  }
});

// --- configurazione dell'app: eventi
const configForm = $('#config-form');
configForm?.addEventListener('input', () => { configTouched = true; });
configForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $('#config-status');
  status.textContent = 'Salvo…';
  try {
    const res = await api('/api/config', {
      method: 'POST',
      body: JSON.stringify({
        appId: form.elements.appId.value.trim(),
        appSecret: form.elements.appSecret.value.trim(),
        redirectUri: form.elements.redirectUri.value.trim(),
        verifyToken: form.elements.verifyToken.value.trim(),
      }),
    });
    configTouched = false;
    form.elements.appSecret.value = '';
    await load({ silent: true });
    status.textContent = res.configured
      ? 'Salvato. Ora puoi premere “Collega Instagram”.'
      : 'Salvato, ma mancano ancora dei valori.';
    toast(res.notes?.length ? res.notes[0] : 'Configurazione salvata.');
  } catch (err) {
    status.textContent = '';
    toast(err.message, true);
  }
});

$('#gen-token')?.addEventListener('click', () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  configForm.elements.verifyToken.value = token;
  configTouched = true;
  toast('Token generato: copialo anche nella configurazione del webhook su Meta.');
});

$('#config-help')?.addEventListener('click', () => {
  toast('developers.facebook.com → la tua app → Impostazioni → Di base (App ID e Secret), poi Instagram → Impostazioni API con login Instagram (redirect URI).');
});

// ricarica periodica, senza disturbare chi sta scrivendo
setInterval(() => {
  const active = document.activeElement;
  const typing = active && ['TEXTAREA', 'INPUT', 'SELECT'].includes(active.tagName);
  if (typing || view === 'settings') return;
  if (configTouched && view === 'connect') return;
  load({ silent: true });
}, 25_000);

// aggiorna i contatori "tra X min" ogni secondo
setInterval(() => {
  $$('.auto-note b').forEach((b) => {
    const iso = b.closest('.auto-note')?.dataset?.sendAt;
    if (iso) b.textContent = countdown(iso);
  });
}, 1000);

// messaggi di ritorno dall'OAuth
const params = new URLSearchParams(location.search);
if (params.has('connect')) {
  const msg = params.get('connect');
  setTimeout(() => toast(msg === 'collegato' ? 'Account collegato. Sto leggendo i commenti.' : msg, msg !== 'collegato'), 400);
  history.replaceState({}, '', '/');
}

load();
