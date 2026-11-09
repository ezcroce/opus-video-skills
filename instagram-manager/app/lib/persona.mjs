/**
 * La "personalità" dell'assistente.
 *
 * Tutto ciò che riguarda il tono vive qui: il prompt per il modello e il
 * motore locale di riserva (usato in demo o quando non c'è una chiave API).
 * Se vuoi cambiare il carattere delle risposte, questo è l'unico file da toccare.
 */

export const TONES = {
  gentile: {
    label: 'Gentile e calmo',
    hint: 'Frasi brevi e pacate, nessuna esclamazione, ringrazia sempre.',
    openers: ['Ciao {name}, grazie di cuore per il messaggio.', 'Ciao {name}, che bello leggerti.', 'Ciao {name}, grazie per esserti fermato qui.'],
    closers: ['Un abbraccio.', 'A presto.', 'Buona giornata.'],
  },
  caloroso: {
    label: 'Caloroso e vicino',
    hint: 'Più affettuoso, usa un "noi", qualche punto esclamativo ogni tanto.',
    openers: ['Ciao {name}! Che piacere trovarti qui.', 'Ciao {name}! Grazie davvero di esserci.', 'Ciao {name}, che bella sorpresa!'],
    closers: ['Un abbraccio grande!', 'A presto, mi raccomando.', 'Buona giornata!'],
  },
  professionale: {
    label: 'Professionale e chiaro',
    hint: 'Formale ma umano, nessuna emoji, informazioni precise.',
    openers: ['Gentile {name}, grazie per il suo messaggio.', 'Buongiorno {name}, la ringrazio per averci scritto.', 'Gentile {name}, grazie per il suo commento.'],
    closers: ['Resto a disposizione.', 'Cordiali saluti.', 'Grazie ancora e buona giornata.'],
  },
  leggero: {
    label: 'Leggero e ironico',
    hint: 'Un sorriso leggero, mai sarcasmo, sempre rispettoso.',
    openers: ['Ciao {name}, ci hai fatto sorridere.', 'Ciao {name}! Grazie, davvero.', 'Ciao {name}, che bello averti qui.'],
    closers: ['A presto!', 'Buona giornata, e sorridi.', 'Ci vediamo qui.'],
  },
};

export const DEFAULT_SETTINGS = {
  tone: 'gentile',
  signature: '',
  language: 'it',
  autoReply: false,        // l'invio automatico è spento di proposito
  autoReplyMinConfidence: 0.8,
  quietHours: { enabled: true, from: '23:00', to: '08:00' },
  escalateWords: ['rimborso', 'avvocato', 'truffa', 'denuncia', 'allergia', 'offeso', 'vergogna'],
  neverSayWords: ['assolutamente no', 'non è possibile'],
  emojiLevel: 'poche',     // 'nessuna' | 'poche' | 'libere'
  answerFacts: 'Spediamo in tutta Italia in 2–3 giorni lavorativi. Per informazioni su ordini e resi scrivimi in direct.',
};

export function systemPrompt(settings, account) {
  const tone = TONES[settings.tone] || TONES.gentile;
  return [
    `Sei la persona che risponde ai commenti e ai direct di ${account?.name || 'questo account'} (@${account?.username || 'account'}) su Instagram.`,
    'Scrivi come una persona gentile e calma, mai come un centralino automatico.',
    `Tono richiesto: ${tone.label}. ${tone.hint}`,
    settings.language === 'it' ? 'Rispondi in italiano.' : `Rispondi in ${settings.language}.`,
    'Regole non negoziabili:',
    '- Massimo 320 caratteri, 1–3 frasi. Niente muri di testo.',
    '- Ringrazia o riconosci quello che la persona ha scritto, con parole sue.',
    '- Mai inventare prezzi, disponibilità, tempi di consegna o promesse: se la domanda chiede un dato che non conosci, invita con garbo a scrivere in direct.',
    '- Niente emoji se non richiesto; al massimo una.',
    '- Se la persona è arrabbiata, non giustificarti in modo difensivo: riconosci il dispiacere e proponi un contatto diretto.',
    '- Non rispondere a insulti, spam o provocazioni: in quel caso restituisci reply vuota e action "ignore".',
    `Fatti che puoi usare se servono: ${settings.answerFacts}`,
    settings.signature ? `Chiudi con: ${settings.signature}` : 'Non firmare con un nome se non è necessario.',
    '',
    'Rispondi SOLO con un oggetto JSON valido, senza markdown:',
    '{"reply": "...", "confidence": 0.0, "reason": "perché questa risposta", "action": "reply" | "ignore" | "escalate"}',
    'confidence è quanto sei sicuro che la risposta sia corretta e sicura da pubblicare (0–1).',
    'Usa action "escalate" quando serve una persona vera (dati personali, lamentele serie, domande su soldi o salute).',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Analisi locale del messaggio: sentiment + intent
// ---------------------------------------------------------------------------

const NEGATIVE = /\b(pessim|schifo|delus|arrabbiat|truff|fregat|rotto|non funziona|inaccettabil|maleducat|orribil|vergogn|problema|ritard|non mi (è )?arrivat|senza risposta|non ho (più )?notizie|nessuna risposta|esagerat|troppo car|non vale (il prezzo|questo)|pessima qualit|pacco rotto|non risponde|nessuno risponde)/i;
const POSITIVE = /\b(bellissim|bell[aei]|stupend|meraviglios|adoro|fantastic|bravissim|grazie|complimenti|top|capolavoro|innamorat|wow|che bello|adorabil|stupendi)/i;
const QUESTION = /(\?|come (si|faccio)|quanto (costa|viene)|dove (si|posso)|quando|info|disponibil|prezzo|spedizion|taglia|orari|avete|fattura|ordine|pagamento|come funziona)/i;
const SPAM = /(seguimi|f4f|follow ?back|link in bio.*link in bio|guadagn|cripto|investi|dm ?per ?collab|promo|sconto imperdibile|\$\$\$|compra follower|collab a pagamento)/i;
const PROMISE = /\b(prometto|garantisco|sicuramente|al 100%)\b/i;

export function classify(text = '') {
  const t = text.toLowerCase();
  if (SPAM.test(t)) return { intent: 'spam', sentiment: 'spam' };
  if (NEGATIVE.test(t)) return { intent: 'reclamo', sentiment: 'negativo' };
  if (QUESTION.test(t)) return { intent: 'domanda', sentiment: POSITIVE.test(t) ? 'positivo' : 'neutro' };
  if (POSITIVE.test(t)) return { intent: 'complimento', sentiment: 'positivo' };
  if (t.replace(/[^\p{L}]/gu, '').length < 3) return { intent: 'emoji', sentiment: 'positivo' };
  return { intent: 'saluto', sentiment: 'neutro' };
}

function pick(arr, seedText) {
  // scelta stabile: stesso commento -> stessa risposta, finché non rigeneri
  let h = 0;
  for (const ch of seedText) h = (h * 31 + ch.codePointAt(0)) % 100000;
  return arr[h % arr.length];
}

const NAME_STOP = new Set([
  'the', 'official', 'real', 'il', 'la', 'lo', 'un', 'una', 'nuovo', 'nuova', 'cliente',
  'user', 'utente', 'account', 'shop', 'store', 'info', 'ceramica', 'studio', 'art',
]);

/** Prova a ricavare un nome proprio dallo username: "chiara_mrt" -> "Chiara". */
export function prettyName(author) {
  const raw = (author?.name || author?.username || '').split(/[\s._-]+/).filter(Boolean)[0] || '';
  if (!raw || raw.length < 2 || NAME_STOP.has(raw.toLowerCase())) return '';
  if (!/^[\p{L}][\p{L}']*$/u.test(raw)) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Motore di riserva: nessuna chiamata di rete, risposte costruite a mano.
 * Non è un modello linguistico, ma è prudente, coerente e non inventa nulla.
 */
export function localDraft(item, settings) {
  const tone = TONES[settings.tone] || TONES.gentile;
  const name = prettyName(item.author);
  const ciao = name ? `Ciao ${name}, ` : 'Ciao, ';
  const { intent, sentiment } = item;
  const raw = pick(tone.openers, item.text + settings.tone).replace('{name}', name || '');
  const greet = name ? raw : raw.replace(/Ciao\s*,/, 'Ciao,');
  const close = pick(tone.closers, item.text + 'close');
  const sign = settings.signature ? ` ${settings.signature}` : '';

  if (intent === 'spam') {
    return {
      reply: '', confidence: 0.95, action: 'ignore',
      reason: 'Sembra spam o scambio di follow: meglio non rispondere e segnarlo.',
    };
  }

  if (intent === 'reclamo') {
    return {
      reply: `${ciao}mi dispiace davvero per quello che racconti e grazie per avercelo scritto qui. Scrivimi in direct con il numero d’ordine o una foto: guardo io la situazione e ti rispondo con calma, con una soluzione concreta.${sign}`,
      confidence: 0.62, action: 'escalate',
      reason: 'C’è un dispiacere: la risposta può partire, ma la pratica va seguita da te.',
    };
  }

  if (intent === 'domanda') {
    const qGreet = `${ciao}grazie per la domanda.`;
    const asksPrice = /(quanto|prezzo|costo|€|euro)/i.test(item.text);
    const asksOrder = /(fattura|ordine|pagamento|rimborso|reso|tracciam|tracking)/i.test(item.text);

    if (asksOrder) {
      return {
        reply: `${ciao}grazie per avermelo scritto. Per questa cosa devo guardare i dettagli con te: mandami in direct il numero d’ordine e la controlliamo subito.${sign}`,
        confidence: 0.6, action: 'escalate',
        reason: 'Richiesta su un ordine specifico: serve una persona con i dati sotto mano.',
      };
    }
    if (asksPrice) {
      return {
        reply: `${qGreet} I prezzi e le disponibilità cambiano spesso, quindi preferisco non darti un numero sbagliato: scrivimi in direct e te li confermo uno per uno.${sign}`,
        confidence: 0.55, action: 'escalate',
        reason: 'Domanda su prezzo: il bot non deve inventare cifre.',
      };
    }
    return {
      reply: `${qGreet} ${settings.answerFacts} Se ti serve altro, sono qui.${sign}`,
      confidence: 0.8, action: 'reply',
      reason: 'Domanda informativa coperta dalle informazioni che hai fornito.',
    };
  }

  if (intent === 'complimento') {
    return {
      reply: `${greet} Messaggi così fanno davvero piacere: li leggo tutti, uno per uno.${sign}`,
      confidence: 0.92, action: 'reply',
      reason: 'Complimento: ringraziamento semplice e sincero.',
    };
  }

  if (intent === 'emoji') {
    return {
      reply: `Grazie${name ? ' ' + name : ''}!${settings.emojiLevel === 'nessuna' ? '' : ' ✨'}${sign}`,
      confidence: 0.9, action: 'reply',
      reason: 'Solo emoji: bastano poche parole gentili.',
    };
  }

  return {
    reply: `${greet} Buona giornata e grazie di essere qui.${sign}`,
    confidence: 0.75, action: 'reply',
    reason: 'Saluto generico.',
  };
}

export function reviewDraft(draft, item, settings) {
  const issues = [];
  const text = (draft.reply || '').toLowerCase();

  if (draft.action === 'reply' && (draft.reply || '').trim().length < 12) issues.push('risposta troppo corta');
  if ((draft.reply || '').length > 400) issues.push('risposta troppo lunga');
  if (/\d+([.,]\d+)?\s?(€|euro)/i.test(draft.reply || '') && !settings.answerFacts.match(/\d+([.,]\d+)?\s?(€|euro)/i)) {
    issues.push('contiene un prezzo non verificato');
  }
  if (PROMISE.test(text)) issues.push('contiene una promessa assoluta');
  for (const w of settings.escalateWords || []) {
    if (w && (item.text || '').toLowerCase().includes(w.toLowerCase())) issues.push(`parola da gestire a mano: “${w}”`);
  }
  for (const w of settings.neverSayWords || []) {
    if (w && text.includes(w.toLowerCase())) issues.push(`frase da evitare: “${w}”`);
  }
  if (item.sentiment === 'negativo' && draft.action === 'reply' && !/(dispiace|mi spiace|capisco|hai ragione)/i.test(text)) {
    issues.push('tono poco empatico per un reclamo');
  }

  const confidence = Math.max(0, Math.min(1, Number(draft.confidence) || 0) - (issues.length ? 0.25 : 0));
  return {
    ...draft,
    confidence: Number(confidence.toFixed(2)),
    issues,
    needsHuman: draft.action !== 'reply' || issues.length > 0 || confidence < (settings.autoReplyMinConfidence ?? 0.8),
  };
}
