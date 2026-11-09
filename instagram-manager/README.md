# Custode — Instagram Manager

Un'app da tavolo che si occupa della parte più faticosa di Instagram: leggere commenti e direct,
rispondere **con calma e gentilezza**, e tenere d'occhio come sta la community. Funziona con l'API ufficiale di Meta,
quindi non rischia di farti bloccare l'account.

Si chiama **Custode** e si apre in una finestra sua, come un programma qualunque: nessun servizio da
pagare, nessun dato che esce dal tuo computer — tranne le chiamate a Meta e, se la attivi, al modello
linguistico.

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

## Avviarla come app (consigliato)

Si apre in una **finestra sua**, senza barra degli indirizzi, e si chiude come qualsiasi programma.
Serve solo Node.js 18 o superiore installato una volta ([nodejs.org](https://nodejs.org), versione LTS):
dopo, tutto si fa con un doppio clic.

| Sistema | Doppio clic su | Per averla con l'icona |
|---|---|---|
| **Windows** | `Avvia Custode (senza finestra).vbs` (silenzioso) o `Avvia Custode.bat` (con log) | `install → Crea collegamento sul desktop.bat` |
| **macOS** | `Avvia Custode.command` | `install/crea-app-macos.command` crea `Custode.app` da mettere in Applicazioni |
| **Linux** | `Avvia Custode.sh` | `sh install/installa-app-linux.sh` la aggiunge al menu |

Da terminale, se preferisci:

```bash
npm start            # avvia l'app (finestra dedicata)
npm run server       # solo il server, poi apri http://localhost:4321
```

L'app cerca Chrome, Edge, Brave o Chromium e li usa in modalità `--app`: è una finestra separata, con
l'icona di Custode nella barra delle applicazioni. Se non ne trova nessuno, apre il browser predefinito.
Quando chiudi la finestra, il server si spegne da solo.

Alla prima apertura non servono credenziali: la dashboard lavora su un account di prova (`@bottega.luce`,
ceramiche a Padova) con due settimane di dati, commenti realistici, un reclamo, un commento spam e due
direct. Il pulsante **Sincronizza** fa arrivare nuove conversazioni, **Casella** mostra le bozze,
**Impostazioni** cambia tono e permessi.

Per vedere l'invio automatico in azione: Impostazioni → attiva *Invio automatico* → torna in Casella e
genera una bozza su un complimento. Comparirà "In uscita automaticamente tra poco" con il conto alla rovescia.

## Collegare il tuo account

Serve, una volta sola:

1. un **account professionale** (Business o Creator) — gratuito, si fa dall'app di Instagram;
2. un'**app Meta** gratuita con il prodotto *Instagram* e *Instagram Login*;
3. due valori copiati nel file `.env` (`IG_APP_ID`, `IG_APP_SECRET`) e l'URL di callback.

Non serve aprire file di configurazione: **sezione Collegamento → Configurazione dell'app Meta**, incolli
App ID e App Secret, il redirect URI è già compilato e il verify token si genera con un clic. L'app scrive
da sola il file `.env` (che resta sul tuo computer e non va su Git).

Poi premi *Collega Instagram*: si apre la pagina di autorizzazione, accetti i permessi, e l'app inizia a
leggere i tuoi contenuti.

Se preferisci farlo a mano, `cp .env.example .env` e compila i campi funziona allo stesso modo.

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
├── Avvia Custode.bat / .vbs / .command / .sh   # doppio clic = app aperta
├── app/
│   ├── launcher.mjs          # avvia il server e apre la finestra dedicata
│   ├── server.mjs            # server HTTP, rotte, webhook, coda di invio
│   ├── lib/
│   │   ├── instagram.mjs     # client Graph API: solo endpoint documentati
│   │   ├── persona.mjs       # tono, analisi del commento, motore locale
│   │   ├── ai.mjs            # bozze (modello o locale) + regole di invio
│   │   ├── demo.mjs          # account di prova
│   │   └── store.mjs         # archivio JSON
│   └── public/               # interfaccia (HTML + CSS + JS, zero dipendenze)
├── assets/                   # icona in PNG/ICO/ICNS + make-icons.py
├── install/                  # collegamento desktop, app macOS, voce di menu Linux
├── docs/
│   ├── setup-instagram-api.md
│   └── limiti-e-regole.md
├── .env.example
└── package.json
```

Nessuna dipendenza npm: solo Node 18 o superiore. Le icone si rigenerano con
`python3 assets/make-icons.py` (serve Pillow) o si modificano da `assets/icon.svg`.
