# Instagram Manager

Un assistente che si occupa della parte più faticosa di Instagram: leggere commenti e direct, rispondere
**con calma e gentilezza**, e tenere d'occhio come sta la community. Funziona con l'API ufficiale di Meta,
quindi non rischia di farti bloccare l'account.

Si apre come una piccola dashboard locale: un pannello, nessun servizio da pagare, nessun dato che esce dal
tuo computer — tranne le chiamate a Meta e, se la attivi, al modello linguistico.

---

## Cosa fa

| | |
|---|---|
| **Legge** | commenti sui tuoi post, reel e album; direct in arrivo; follower, like, copertura e visualizzazioni profilo |
| **Scrive** | una bozza di risposta per ogni conversazione, nel tono che scegli (gentile e calmo, caloroso, professionale, leggero) |
| **Decide quando fermarsi** | se la bozza è incerta, se compare una parola che hai segnato come delicata, o se qualcuno è arrabbiato, la risposta **aspetta te** |
| **Modera** | nasconde commenti, segna spam, archivia |
| **Riferisce** | quanti commenti restano senza risposta, in quanto tempo rispondi, come si sente la community |

Il principio è semplice: **l'assistente prepara, tu approvi**. L'invio automatico esiste, ma è spento di
default e, quando lo accendi, parte solo per le bozze sopra la soglia di sicurezza che scegli — con un
ritardo di uno o due minuti, perché nessuno risponde in due decimi di secondo.

## Provarlo subito (senza account)

```bash
cd instagram-manager
npm start            # oppure: node app/server.mjs
```

Apri <http://localhost:4321>. Non servono credenziali: la dashboard lavora su un account di prova
(`@bottega.luce`, ceramiche a Padova) con due settimane di dati, commenti realistici, un reclamo, un
commento spam e due direct. Il pulsante **Sincronizza** fa arrivare nuove conversazioni, **Casella** mostra
le bozze, **Impostazioni** cambia tono e permessi.

Per vedere l'invio automatico in azione: Impostazioni → attiva *Invio automatico* → torna in Casella e
genera una bozza su un complimento. Comparirà "In uscita automaticamente tra poco" con il conto alla rovescia.

## Collegare il tuo account

Serve, una volta sola:

1. un **account professionale** (Business o Creator) — gratuito, si fa dall'app di Instagram;
2. un'**app Meta** gratuita con il prodotto *Instagram* e *Instagram Login*;
3. due valori copiati nel file `.env` (`IG_APP_ID`, `IG_APP_SECRET`) e l'URL di callback.

```bash
cp .env.example .env     # poi compila i campi
npm start
```

Nella dashboard, sezione **Collegamento** → *Collega Instagram*: si apre la pagina di autorizzazione di
Instagram, accetti i permessi, e l'app inizia a leggere i tuoi contenuti.

La procedura completa, con i nomi esatti dei menu e i permessi da selezionare, è in
[docs/setup-instagram-api.md](docs/setup-instagram-api.md). Se qualcosa non torna, la sezione
[docs/limiti-e-regole.md](docs/limiti-e-regole.md) spiega cosa l'API permette e cosa no.

## Come scrive

La personalità sta tutta in `app/lib/persona.mjs`: prompt del modello, toni, e un motore locale di riserva
(usato quando `ANTHROPIC_API_KEY` non è impostata, così la demo funziona anche offline).

Prima di mostrarti una bozza, ogni risposta passa da un controllo automatico che segnala:

- prezzi o disponibilità inventati;
- promesse assolute ("garantisco", "al 100%");
- tono poco empatico davanti a un reclamo;
- risposte troppo lunghe o troppo corte;
- le parole che hai messo nella lista "gestisco io" (rimborso, avvocato, allergia…).

Se una di queste cose compare, la bozza viene marcata **per te** e non parte da sola, qualunque sia
l'impostazione di invio automatico.

## Cosa non fa, e perché

- **Non mette like.** L'API ufficiale non espone questa azione. I bot che la simulano usano automazioni non
  autorizzate, violano i Termini di Instagram e portano a limitazioni o sospensioni. I like si leggono come
  numeri, non si mettono.
- **Non segue o smette di seguire.** Stessa ragione.
- **Non scarica la lista dei follower.** L'API dà il totale e l'andamento giornaliero, non i singoli profili.
- **Non pubblica post.** Qui si gestiscono conversazioni, non il calendario editoriale.

## Privacy

Tutto sta in `data/state.json` sul tuo computer: testi dei commenti, bozze, impostazioni. Non c'è nessun
server intermedio. Se attivi il modello linguistico, il testo del singolo commento viene inviato all'API di
Anthropic per scrivere la bozza; senza chiave, nulla esce dalla macchina. Il file `.env` e la cartella
`data/` sono già esclusi da Git.

## Struttura

```
instagram-manager/
├── app/
│   ├── server.mjs            # server HTTP, rotte, webhook, coda di invio
│   ├── lib/
│   │   ├── instagram.mjs     # client Graph API: solo endpoint documentati
│   │   ├── persona.mjs       # tono, analisi del commento, motore locale
│   │   ├── ai.mjs            # bozze (modello o locale) + regole di invio
│   │   ├── demo.mjs          # account di prova
│   │   └── store.mjs         # archivio JSON
│   └── public/               # dashboard (HTML + CSS + JS, zero dipendenze)
├── docs/
│   ├── setup-instagram-api.md
│   └── limiti-e-regole.md
├── .env.example
└── package.json
```

Nessuna dipendenza npm: solo Node 18 o superiore.
