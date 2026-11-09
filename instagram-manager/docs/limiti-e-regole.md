# Cosa si può fare, cosa no, e perché

La domanda onesta dietro a “un'AI che gestisce il mio Instagram” è sempre la stessa: **quanto di questo è
permesso?** Risposta breve: le conversazioni sì, le azioni “da bot” no. Qui il dettaglio, senza giri di parole.

---

## Il confine, in una tabella

| Cosa | Fattibile con l'API ufficiale | Come |
|---|---|---|
| Leggere i commenti ai tuoi post | ✅ | `GET /<media-id>/comments` |
| Rispondere pubblicamente a un commento | ✅ | `POST /<comment-id>/replies` |
| Rispondere in privato a chi ha commentato | ✅ | private reply, **una sola volta** per commento, entro 7 giorni |
| Nascondere o eliminare un commento | ✅ | `POST /<comment-id> hide=true` · `DELETE` |
| Leggere e rispondere ai direct | ✅ | webhook `messages` + `POST /<ig-id>/messages` |
| Vedere follower, copertura, visualizzazioni profilo | ✅ | insights (`follower_count`, `reach`, `profile_views`) |
| Mettere “mi piace” ai commenti | ❌ | non esiste un endpoint |
| Mettere like ai post | ❌ | non esiste un endpoint |
| Seguire / smettere di seguire | ❌ | non esiste un endpoint |
| Ottenere l'elenco dei follower | ❌ | solo il numero totale |
| Pubblicare post o reel | ✅ (ma non è lo scopo di questo progetto) | `content_publish` |

---

## Perché i bot per like e follow sono una cattiva idea

Esistono servizi che “gestiscono” like, follow e commenti automatici. Funzionano con credenziali cedute a
terzi o con automazioni che simulano l'app: tutte strade che violano i **Termini d'uso di Instagram** e la
**piattaforma API di Meta**. Le conseguenze reali, non teoriche:

- azioni bloccate per giorni (“Ci dispiace, hai raggiunto un limite”);
- account oscurato nei suggerimenti e negli hashtag, senza che tu te ne accorga;
- sospensione temporanea o definitiva, con appello lento;
- nel caso peggiore, accesso all'account perso, perché le credenziali sono in mano a un terzo.

Il punto è che il valore di un account non sta nel numero di like messi, ma nella qualità delle risposte.
Un commento a cui rispondi in dieci minuti, con il nome della persona e una frase vera, vale più di mille
like automatici.

---

## Limiti tecnici da conoscere

**Finestra dei messaggi.** Puoi scrivere a chi ti ha scritto entro **24 ore** dal suo ultimo messaggio.
Oltre, solo con l'etichetta *human agent* (7 giorni) o aspettando che riscriva. Non è una limitazione del
codice: è la regola di Meta, pensata per evitare messaggi indesiderati.

**Risposta privata a un commento.** Una sola per commento, entro 7 giorni.

**Frequenza delle chiamate.** L'API ha limiti orari per utente. Questo progetto li rispetta per costruzione:
usa i webhook invece del polling, sincronizza su richiesta, e limita gli invii automatici a **20 all'ora**
(`MAX_AUTO_PER_HOUR` in `server.mjs`). Se il limite viene raggiunto, le bozze restano lì: nessun retry
aggressivo.

**Account professionali soltanto.** Un account personale non può autorizzare l'app. Il passaggio è gratuito.

**Contenuti che non puoi leggere.** I commenti su post di *altri*, i profili privati, gli utenti che ti hanno
bloccato: tutto fuori portata, per scelta di Meta.

---

## Il tono: perché “gentile e calmo” è una scelta tecnica

Un assistente che risponde a raffica e con troppa enfasi peggiora le conversazioni. Le regole nel prompt
(`app/lib/persona.mjs`) servono a evitare i tre errori più comuni:

| Invece di | Meglio |
|---|---|
| “Ciao!! Grazie mille per il tuo commento!! 😍😍” | “Ciao Chiara, grazie di cuore. Fa piacere leggerti.” |
| “Il prezzo è 45€, disponibile subito!” (inventato) | “Preferisco non darti un numero sbagliato: scrivimi in direct e te lo confermo.” |
| “Ci dispiace che tu sia insoddisfatto. La ringraziamo per il feedback.” | “Mi dispiace davvero per com'è andata. Scrivimi in direct: guardo io la pratica.” |

Le tre regole che fanno più differenza:

1. **Non inventare mai.** Prezzi, tempi, disponibilità: se non sono nella scheda “Cosa puoi dire sui fatti”,
   l'assistente rimanda al direct. Una cifra sbagliata costa più di una risposta in ritardo.
2. **Riconoscere prima di spiegare.** Chi è arrabbiato vuole sentirsi ascoltato, non ricevere una difesa.
3. **Fermarsi.** Se la conversazione riguarda soldi, salute, dati personali o una minaccia legale, la bozza
   non parte: la leggi tu. Le parole spia sono modificabili in Impostazioni.

---

## Dati personali e GDPR, in pratica

La dashboard gira sul tuo computer e salva tutto in `data/state.json`: testi dei commenti, nomi utente,
bozze, risposte. Nessun server intermedio.

Se la usi per lavoro, tieni presenti quattro cose semplici:

- **Base giuridica.** Rispondere a chi ti scrive è gestione di una richiesta dell'interessato; non serve
  consenso, ma serve non usare quei dati per altro (marketing, profilazione) senza una base diversa.
- **Minimizzazione.** Conserva solo ciò che serve a rispondere. Il pulsante *Ignora* e la cancellazione del
  file `data/state.json` bastano per ripartire puliti.
- **Conservazione.** I commenti vecchi non hanno motivo di restare per sempre: una volta risolto, il testo si
  può eliminare. Se vuoi, imposta un promemoria trimestrale e svuota `data/`.
- **Modello linguistico.** Se attivi `ANTHROPIC_API_KEY`, il testo del singolo commento esce dal tuo computer
  per essere riscritto: valutalo se gestisci dati delicati. Senza chiave, il motore locale non fa uscire nulla.

---

## Quando l'assistente si ferma (e fa bene)

La bozza è marcata **per te** e non parte da sola se:

- una delle parole della lista “gestisco io” compare nel commento (rimborso, avvocato, allergia…);
- il punteggio di sicurezza è sotto la soglia scelta;
- il commento contiene un prezzo, una promessa o un dato che l'assistente non può verificare;
- il tono della persona è negativo e la bozza non riconosce il dispiacere;
- sei dentro l'orario di silenzio.

Questa è la parte più importante del progetto: un buon assistente non è quello che risponde a tutto, è
quello che sa **quali cinque conversazioni della giornata deve vedere una persona**.
