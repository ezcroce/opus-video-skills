# Collegare Instagram, passo per passo

Questa guida porta dall'account Instagram “nudo” alla dashboard che legge i commenti. Serve una volta sola,
una ventina di minuti. Non si paga nulla a Meta; l'unica spesa possibile è il consumo del modello
linguistico, se decidi di usarlo.

---

## Cosa ti serve

- Un **account Instagram professionale** (Business o Creator). Gli account personali non hanno accesso all'API.
- Un **account Facebook** (serve solo per entrare in Meta for Developers).
- **Node 18+** sul computer dove far girare la dashboard.
- Per i webhook (consigliati, non obbligatori), un indirizzo **https pubblico** che punta al tuo computer:
  [ngrok](https://ngrok.com) o [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  vanno benissimo in prova.

---

## Passo 1 — Account professionale

Nell'app di Instagram: **Impostazioni → Account → Passa a un account professionale**. Scegli la categoria
che ti somiglia di più. È gratuito e reversibile; non perdi follower né post.

---

## Passo 2 — Creare l'app Meta

1. Vai su <https://developers.facebook.com/apps> → **Crea app**.
2. Nome qualsiasi (es. *Custode*), poi scegli **Altro** come caso d'uso e **Business** come tipo.
3. Nella dashboard dell'app, **Aggiungi prodotto** → **Instagram** → *Configura*.
4. Scegli la variante **API con login Instagram** (Instagram Login), **non** quella con Facebook Login:
   non richiede una Pagina Facebook collegata e usa il dominio `graph.instagram.com`.
5. In **Impostazioni app → Di base** trovi **App ID** e **App Secret**: sono i due valori da mettere nel `.env`.
   L'App Secret è una password: non condividerla, non finirà su Git.

### Redirect URI e permessi

Nella configurazione di *Instagram Login* aggiungi il redirect URI esatto:

```
http://localhost:4321/auth/callback
```

Deve combaciare carattere per carattere con `IG_REDIRECT_URI` nel `.env` (protocollo, porta, slash finale).
Se usi un dominio pubblico per i webhook, puoi mettere anche `https://<tuo-dominio>/auth/callback`.

I permessi che l'app chiede sono quattro, tutti ufficiali:

| Permesso | A cosa serve |
|---|---|
| `instagram_business_basic` | leggere profilo e contenuti |
| `instagram_business_manage_comments` | leggere, rispondere, nascondere, eliminare commenti e menzioni |
| `instagram_business_manage_messages` | leggere e rispondere ai direct |
| `instagram_business_manage_insights` | follower, copertura, visualizzazioni profilo |

> **Modalità sviluppo.** Finché l'app non passa la revisione di Meta, funziona solo con gli account che
> hanno un ruolo nell'app. Per un uso personale è esattamente ciò che serve: in **Ruoli → Instagram tester**
> aggiungi il tuo account e accetta l'invito dalle impostazioni di Instagram. Se un giorno vorrai offrire il
> servizio ad altri, servirà la revisione (App Review) per i permessi avanzati.

---

## Passo 3 — Inserire le credenziali

Apri l'app (doppio clic su `Avvia Custode…`, oppure `npm start`) e vai in **Collegamento →
Configurazione dell'app Meta**. Incolla:

- **App ID** (solo cifre);
- **App Secret** (lo vedi con *Mostra* accanto al campo, in Impostazioni → Di base);
- **Redirect URI**: già compilato con `http://localhost:4321/auth/callback`, lascialo così se usi la porta
  predefinita;
- **Verify token**: premi *Genera* e ottieni una stringa casuale. Ti servirà al passo 4.

Premi **Salva configurazione**: l'app scrive il file `.env` per te (resta sul tuo computer, è escluso da
Git). Se vuoi farlo a mano, `cp .env.example .env` e compila i campi funziona uguale.

Ora la spia “Credenziali app Meta” diventa verde. Premi **Collega Instagram**, autorizza, e torni alla
dashboard con l'account collegato.

Al primo collegamento l'app fa subito una sincronizzazione: legge gli ultimi dodici contenuti, i loro
commenti e le metriche degli ultimi sette giorni.

---

## Passo 4 — Webhook (facoltativo ma consigliato)

Senza webhook la dashboard vede i commenti nuovi quando premi **Sincronizza**. Con i webhook le
conversazioni arrivano da sole, in pochi secondi.

1. Esponi la porta 4321 con un tunnel:
   ```bash
   ngrok http 4321
   # oppure
   cloudflared tunnel --url http://localhost:4321
   ```
   Ottieni un indirizzo tipo `https://abc123.ngrok-free.app`.
2. In Meta for Developers → **Webhook** (*Instagram*): callback URL
   `https://abc123.ngrok-free.app/webhook`, verify token uguale a `IG_WEBHOOK_VERIFY_TOKEN`.
3. Meta fa subito una richiesta `GET /webhook` con `hub.challenge`: il server risponde da solo se il token
   combacia. Se vedi “Verifica webhook non riuscita”, è quasi sempre il token che non combacia.
4. Sottoscrivi i campi **`comments`** e **`messages`**.

Le richieste in arrivo sono firmate: il server controlla l'intestazione `X-Hub-Signature-256` con l'App
Secret e scarta quelle non firmate (`server.mjs` → `verifySignature`).

> Gli indirizzi dei tunnel gratuiti cambiano a ogni riavvio: in prova va bene, in uso quotidiano conviene un
> piccolo server sempre acceso o un dominio tuo.

---

## Passo 5 — Provare che funzioni

1. Da un altro account (o da un profilo di prova) commenta un tuo post con una domanda semplice.
2. Se i webhook sono attivi il commento compare in **Casella** entro pochi secondi; altrimenti premi
   **Sincronizza**.
3. Apri la conversazione: trovi la bozza, il punteggio di sicurezza e il motivo della risposta.
4. Modifica se vuoi, poi **Invia risposta**: il commento appare davvero su Instagram.

---

## Token e scadenze

Il codice scambia il codice di autorizzazione con un **token di lunga durata** (circa 60 giorni) e salva la
scadenza. Quando mancano pochi giorni, rifai *Collega Instagram*: è un clic. La funzione
`refreshToken()` in `app/lib/instagram.mjs` è già pronta se vuoi rinnovarlo da un cron.

## Errori che capitano davvero

| Messaggio | Cosa significa |
|---|---|
| `HTTP 400 Invalid redirect uri` | l'URI nel `.env` non è identico a quello registrato nell'app |
| `HTTP 190` / `OAuthException: access token expired` | token scaduto: ricollega l'account |
| `HTTP 10` / `permission denied` | manca un permesso, o l'account non è aggiunto come tester |
| `#10 This user is not an Instagram professional account` | l'account è ancora personale (Passo 1) |
| `message outside of allowed window` | sono passate più di 24 ore dall'ultimo messaggio: si può rispondere solo con l'etichetta “operatore umano” (7 giorni) o aspettando che la persona riscriva |
| commenti non arrivano | webhook non sottoscritto su `comments`, oppure tunnel spento |
| `Richiesta troppo grande` | payload webhook oltre 1 MB: insolito, controlla la firma e il contenuto |

## Note di sicurezza

- Il server ascolta su `0.0.0.0` per funzionare dentro un contenitore o su una rete locale. Se lo esponi su
  internet, mettilo dietro un proxy con autenticazione: la dashboard **non ha login** ed è pensata per un uso
  personale, in locale.
- `.env` e `data/` sono già in `.gitignore`. Non committare mai token o App Secret.
- Non usare mai questa app per automatizzare like, follow o messaggi di massa: vedi
  [limiti-e-regole.md](limiti-e-regole.md).
