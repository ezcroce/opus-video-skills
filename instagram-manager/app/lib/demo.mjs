import { DEFAULT_SETTINGS, classify } from './persona.mjs';

/**
 * Account di prova: serve a vedere e provare tutto senza credenziali Meta.
 * I dati sono inventati, ma la forma è quella che arriva dall'API vera.
 */

const ACCOUNT = {
  id: '17841400000000000',
  username: 'bottega.luce',
  name: 'Bottega Luce',
  followers: 4820,
  follows: 312,
  mediaCount: 96,
  bio: 'Ceramiche fatte a mano, a Padova. Piccole cose, fatte piano.',
};

const POSTS = [
  { id: 'p1', caption: 'La nuova linea di tazze “Mattino lento”. Ogni pezzo è tornito a mano.', emoji: '☕', from: '#e8ddd0', to: '#c9a98c', date: '3 giorni fa' },
  { id: 'p2', caption: 'Dietro le quinte: la fornace alle 6 del mattino.', emoji: '🔥', from: '#f3d9c8', to: '#d98b63', date: '6 giorni fa' },
  { id: 'p3', caption: 'Bocce e vasi. Il nostro piccolo mondo di argilla.', emoji: '🏺', from: '#dfe7dc', to: '#a9bfa0', date: '9 giorni fa' },
  { id: 'p4', caption: 'Il mercato di sabato in Piazza delle Erbe. Venite a trovarci.', emoji: '🧺', from: '#e6e0f0', to: '#b6a6d4', date: '12 giorni fa' },
];

const RAW = [
  { post: 'p1', author: ['chiara_mrt', 'Chiara Martinelli'], text: 'Ragazze ma che belle queste tazze 😍 le voglio tutte', hoursAgo: 1, likes: 12 },
  { post: 'p1', author: ['luca_leoni', 'Luca Leoni'], text: 'Quanto costa il set da due?', hoursAgo: 2, likes: 3 },
  { post: 'p2', author: ['giulia.padova', 'Giulia'], text: 'Che meraviglia vedere il lavoro dietro. Complimenti davvero per la cura', hoursAgo: 4, likes: 21 },
  { post: 'p1', author: ['marco_b', 'Marco Berton'], text: 'Ho ordinato il mese scorso e il pacco è arrivato rotto, ho scritto in direct due volte senza risposta. Un po’ deluso sinceramente', hoursAgo: 5, likes: 1 },
  { post: 'p3', author: ['anna_ceramica', 'Anna'], text: '🔥🔥', hoursAgo: 7, likes: 6 },
  { post: 'p1', author: ['francesca.vit', 'Francesca Vitali'], text: 'Seguimi per crescere insieme!! f4f follow back garantito 😎', hoursAgo: 8, likes: 0 },
  { post: 'p4', author: ['sandro_treviso', 'Sandro'], text: 'Ci sarete anche sabato prossimo al mercato?', hoursAgo: 10, likes: 4 },
  { post: 'p2', author: ['eleonora_', 'Eleonora B.'], text: 'quanto tempo ci vuole per una tazza su ordinazione?', hoursAgo: 26, likes: 2 },
  { post: 'p1', author: ['marta_zing', 'Marta'], text: 'Sono bellissime, ne ho regalata una a mia mamma e si è commossa. Grazie di cuore ❤️', hoursAgo: 30, likes: 17, replied: true },
  { post: 'p3', author: ['paolo_67', 'Paolo'], text: 'Belle ma i prezzi sono esagerati per della ceramica, secondo me', hoursAgo: 33, likes: 0 },
  { post: 'p4', author: ['irene.mkt', 'Irene'], text: 'Ciao! Collaborazioni? Scrivimi in dm per promo', hoursAgo: 36, likes: 0 },
  { post: 'p1', author: ['sofia_ler', 'Sofia'], text: 'Ciao, fate spedizioni all’estero?', hoursAgo: 48, likes: 5 },
  { post: 'p2', author: ['davide_zeta', 'Davide'], text: 'Il video della fornace è ipnotico, avete fatto un lavoro enorme', hoursAgo: 52, likes: 9, replied: true },
  { post: 'p3', author: ['helena_rose', 'Helena'], text: 'Posso venire a vedere il laboratorio? È aperto al pubblico?', hoursAgo: 60, likes: 3 },
];

const DM = [
  { author: ['martina.x', 'Martina'], text: 'Ciao! Ho visto la vostra tazza verde, è ancora disponibile?', hoursAgo: 3 },
  { author: ['andrea_g', 'Andrea'], text: 'Buonasera, ho bisogno della fattura dell’ordine 1042. Potete inviarmela?', hoursAgo: 6 },
];

function iso(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 3600_000).toISOString();
}

function buildMetrics(days = 14) {
  const out = [];
  let followers = ACCOUNT.followers - 96;
  const base = [4, 6, 3, 9, 5, 11, 7, 4, 8, 6, 12, 9, 5, 7];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const idx = days - 1 - i;
    const gain = base[idx % base.length];
    followers += gain;
    out.push({
      date: d.toISOString().slice(0, 10),
      followers,
      newFollowers: gain,
      likes: 40 + ((idx * 37) % 70),
      comments: 6 + ((idx * 7) % 14),
      reach: 700 + ((idx * 173) % 700),
      profileViews: 60 + ((idx * 23) % 90),
      repliesSent: 3 + ((idx * 5) % 9),
    });
  }
  return out;
}

export function demoSeed() {
  const settings = { ...DEFAULT_SETTINGS };

  const items = RAW.map((r, i) => {
    const post = POSTS.find((p) => p.id === r.post);
    const { intent, sentiment } = classify(r.text);
    const item = {
      id: `c_demo_${i + 1}`,
      kind: 'comment',
      channel: 'Commento',
      author: { username: r.author[0], name: r.author[1] },
      text: r.text,
      post: { id: post.id, caption: post.caption, emoji: post.emoji, from: post.from, to: post.to },
      permalink: 'https://www.instagram.com/p/demo/',
      createdAt: iso(r.hoursAgo),
      likes: r.likes,
      intent,
      sentiment,
      status: r.replied ? 'replied' : intent === 'spam' ? 'spam' : 'new',
      draft: null,
      reply: r.replied ? 'Grazie Marta, questo messaggio ci ha scaldato la giornata. Un abbraccio.' : null,
      repliedAt: r.replied ? iso(r.hoursAgo - 1) : null,
      hidden: false,
    };
    return item;
  });

  DM.forEach((d, i) => {
    const { intent, sentiment } = classify(d.text);
    items.push({
      id: `d_demo_${i + 1}`,
      kind: 'dm',
      channel: 'Direct',
      author: { username: d.author[0], name: d.author[1] },
      text: d.text,
      post: null,
      createdAt: iso(d.hoursAgo),
      likes: 0,
      intent,
      sentiment,
      status: 'new',
      draft: null,
      reply: null,
      repliedAt: null,
      hidden: false,
    });
  });

  return {
    version: 1,
    mode: 'demo',
    connectedAt: new Date().toISOString(),
    account: ACCOUNT,
    token: null,
    settings,
    items,
    metrics: buildMetrics(),
    activity: [
      { at: iso(0.2), kind: 'info', text: 'Demo avviata: l’account @bottega.luce è simulato, nessun dato reale.' },
      { at: iso(1), kind: 'reply', text: 'Risposta inviata a @marta_zing.' },
      { at: iso(30), kind: 'reply', text: 'Risposta inviata a @davide_zeta.' },
    ],
    stats: { sent: 2, autoSent: 0, escalated: 0, ignored: 0 },
  };
}

export function nextDemoItem() {
  const sample = [
    { text: 'Bellissime! Le spedite anche a Bologna?', author: ['carla_bg', 'Carla'] },
    { text: 'Che bravi, mi piace molto il vostro stile', author: ['teo_88', 'Matteo'] },
    { text: 'Ho pagato 15 giorni fa e non ho più notizie, potete controllare?', author: ['sara_fr', 'Sara'] },
  ][Math.floor(Math.random() * 3)];
  const { intent, sentiment } = classify(sample.text);
  const post = POSTS[Math.floor(Math.random() * POSTS.length)];
  return {
    id: `c_live_${Date.now().toString(36)}`,
    kind: 'comment',
    channel: 'Commento',
    author: { username: sample.author[0], name: sample.author[1] },
    text: sample.text,
    post: { id: post.id, caption: post.caption, emoji: post.emoji, from: post.from, to: post.to },
    createdAt: new Date().toISOString(),
    likes: 0,
    intent,
    sentiment,
    status: 'new',
    draft: null,
    reply: null,
    repliedAt: null,
    hidden: false,
  };
}
