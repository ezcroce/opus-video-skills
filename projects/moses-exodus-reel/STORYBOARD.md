# STORYBOARD — MOSES / EXODUS IN 60 SECONDS

**Skill:** [`kinetic-reel`](../../skills/kinetic-reel/) · **Durata:** 60,0 s · **1920×1080 · 24 fps · 120 BPM**
(1 beat = 0,5 s = 12 frame; 1 bar = 2 s; 30 bar; 1440 frame).

> Perché `kinetic-reel` e non `painted-animation`: in questo sandbox la libreria ad acquerello p5.brush gira
> in SwiftShader (nessuna GPU reale). Misurato su una pagina di prova: **14–39 s per frame**, quindi un film da
> 60 s avrebbe richiesto ore. La richiesta era «sempre un video», cioè un video come il reel precedente:
> stesso motore, soggetto nuovo, durata portata a un minuto. I file della prova restano fuori dal repository.

## 1. Thread e device

**Thread:** un solo filo, il libro. La barra di avanzamento in basso a sinistra è la traccia del tempo e torna,
nell'ultima inquadratura, come titolo chiuso; il punto luminoso che apre il film è lo stesso punto che lo chiude.
**Device:** due registri che si alternano — *parola* (titoli Anton/Archivo Black, HUD in JetBrains Mono,
micro-annotazioni in italiano) e *meccanismo* (diagrammi 2D dichiarati `SCHEMATIC` che mostrano un'azione:
un cestello che galleggia, un roveto che brucia senza cambiare sagoma, un mare che si apre, una folla che
attraversa, dieci tessere, due tavole, quaranta tacche). I livelli WebGL (terreno particellare, marmo liquido)
sono gli stessi del template e compaiono solo dove servono: apertura, voce, mare, Sinai.

**Arco cromatico:** notte (`ink`) → carta (`cream`) → fiume blu → notte + fiamma → marmo → blu pieno →
carta → marmo/spaccatura → notte → carta → notte + rosso → carta → notte → lime → notte finale.
Rosso solo per il punto di pericolo/rifiuto (Es 32, il vitello), lime per la continuità del marchio.

## 2. Budget tempi (la lead non supera il 35–40 %)

| Capitolo | Tempo | Durata | % | Contenuto |
|---|---|---|---|---|
| OPEN | 0–4 | 4 s | 7 % | punto → marchio → titolo |
| **01 THE CALL** | 4–20 | **16 s** | **27 %** | fiume, roveto, nome, bastone, richiesta |
| **02 THE SEA** | 20–36 | **16 s** | **27 %** | piaghe, Pasqua, mare, attraversamento, colonna |
| 03 SINAI | 36–48 | 12 s | 20 % | monte, tuoni, tavole, tavole spezzate/riscritte |
| 04 WILDERNESS | 48–54 | 6 s | 10 % | manna, acqua dalla roccia, 40 anni |
| END | 54–60 | 6 s | 10 % | titolo di chiusura, glitch, punto |

I cambi capitolo cadono su barre (4 / 20 / 36 / 48 / 54). I tagli interni cadono sui beat. A 20 s e 36 s
il taglio è **duro** con un impatto sonoro; tutti gli altri hanno una transizione di continuità di forma.

## 3. Fonte di verità dei dati

| Dato a schermo | Fonte | Nota |
|---|---|---|
| `EX 2:3`, `BULRUSHES + BITUMEN`, `PHARAOH'S DAUGHTER`, `EX 2:10` | Es 2,3 / 2,10 | «tratto fuori dall'acqua» è l'etimologia data dal testo |
| `EX 3:2`, `FLAME WITHOUT FUEL` | Es 3,2 | roveto che arde senza consumarsi |
| *«I am who I am»* / `EX 3:14` | Es 3,14 | resa inglese corrente; non una parafrasi interpretativa |
| `EX 4:2–4`, `EX 4:17` | Es 4 | bastone → serpente → bastone |
| `LET MY PEOPLE GO` / `EX 5:1` | Es 5,1 | |
| `TEN PLAGUES`, `EX 7–12`, `PASSOVER · EX 12` | Es 7–12 | il conteggio di dieci è la lettura tradizionale del ciclo; le tessere sono un **conteggio**, non una raffigurazione |
| `EX 14:21`, `A STRONG EAST WIND`, `DRY GROUND`, `EX 14:22` | Es 14,21–22 | |
| `EX 13:21–22` | Es 13 | colonna di nube / di fuoco |
| `EX 19:16`, `EX 19` | Es 19 | tuoni, lampi, nube sul monte |
| `TEN WORDS`, `EX 20`, `EX 34:28`, `EX 31:18` | Es 20 / 31,18 / 34,28 | le linee sulle tavole sono blocchi astratti: **nessun testo trascritto** |
| `EX 32`, `EX 34:1` | Es 32 / 34 | tavole spezzate e nuove tavole |
| `MANNA · EX 16`, `WATER · EX 17:6`, `NUM 14:33–34` | Es 16 / 17,6 / Nm 14,33–34 | |
| `FORTY YEARS` | Nm 14,33–34 | |

Nessun numero inventato, nessuna data, nessuna statistica. Ogni diagramma reca la parola `SCHEMATIC`
o `PASSOVER · EX 12`. Il film non prende posizione su questioni storiche o confessionali: riporta i
riferimenti del testo e dichiara cosa è schema.

## 4. Tabella shot per shot

| # | In | Out | Shot | Azione / lettura | Transizione IN |
|---|---|---|---|---|---|
| 1 | 0 | 2 | `open` | terreno particellare, punto → starburst lime | — |
| 2 | 2 | 4 | `title` | `MOSES.` + 3 chip + disco lime (`RECT.titleMark`) | iris dal punto |
| 3 | 4 | 8 | `river` | canne, acqua blu, cestello che attraversa il quadro | zoom nel disco |
| 4 | 8 | 13 | `bush` | chioma verde invariata, fiamma che cresce dentro | slats |
| 5 | 13 | 15 | `voice` | *I am who I am* in serif su marmo liquido | iris dalla fiamma |
| 6 | 15 | 18 | `staff` | tre nodi STAFF / SERPENT / STAFF, pallino che salta | push → |
| 7 | 18 | 20 | `demand` | slam blu `LET MY / PEOPLE GO.` | wipe blu |
| 8 | 20 | 25 | `plagues` | 10 tessere che si accendono, poi la porta della Pasqua | **taglio duro** |
| 9 | 25 | 30 | `sea` | il marmo liquido si spacca: due pannelli + cammino asciutto | wipe carta |
| 10 | 30 | 34 | `cross` | folla di punti che attraversa, muri d'acqua ai lati | slats |
| 11 | 34 | 36 | `pillar` | due colonne: nube/giorno, fuoco/notte | push → |
| 12 | 36 | 40 | `sinai` | sagoma del monte su terreno, lampi | iris |
| 13 | 40 | 44 | `tablets` | due tavole, 10 blocchi che compaiono uno per beat | push ← |
| 14 | 44 | 48 | `calf` | tavola incrinata + red flag + due tavole nuove | griglia rossa |
| 15 | 48 | 54 | `wilderness` | 40 tacche con playhead, manna, roccia/acqua, contatore 00→40 | slats |
| 16 | 54 | 60 | `end` | `MOSES.` + `EXODUS → NUMBERS → DEUTERONOMY`, glitch, punto | push ↑ |

Transizioni usate: iris (3), zoom (1), slats (3), push (4), wipe (2), griglia (1), taglio duro (2).
Nessuna transizione si ripete tre volte di seguito.

## 5. Suono

Score originale sintetizzato in Node, stesso `cues.js` dell'immagine. Groove 4/4 a 120 BPM da 2 a 58,4 s,
`Am F C G`, kick / clap / hat / bass / pluck / pad; **nessun noise whoosh** (`grep -c "whoosh(" score.mjs` → 0).
Gli ingressi capitolo sono swell in tonalità + impact; i tagli interni hanno arpeggi, glissandi tonali,
hat roll o silenzio. Due capitoli «seri» sono a metà volume: `voice` (13–15) e `tablets` (40–44),
circa 4–5 dB sotto la lead.

## 6. Correzioni dopo il primo giro di review

1. `river`: le canne arrivavano fino al sottotitolo `OUT OF THE WATER`; accorciate e il cestello ingrandito
   e riportato verso il centro, con una scia.
2. `bush`: i rami convergegevano in un cono che sembrava un albero/razzo; sostituiti con una chioma rotonda
   di nove macchie verdi, la fiamma al centro, sagoma invariata per tutta la shot.
3. `sea` e `voice`: il riquadro grigio dietro al titolo aveva bordi netti; sostituito con `softScrim()`
   (gradiente radiale ellittico).
4. `plagues`: il frame del taglio duro a 20 s era quasi vuoto; aggiunto un grande `02` in outline.
5. `cross`: i punti della folla sparivano dopo 2 s, lasciando il quadro vuoto; durata portata a 3,2 s.

Verifiche: `review/sheet-all.jpg` (primo giro, 16 frame), `review/stills/` (4 full-res rigenerate),
`review/sheet-transitions.jpg` (15 frame a metà transizione), `review/sheet-final.jpg` (17 frame finali),
`review/from-encode.jpg` (strip dal MP4), `review/last-frame.jpg`. **L'audio non è stato ascoltato**:
verificato con `showspectrumpic`, RMS per sezione (`voice` −17,8 dBFS, `tablets` −18,4 dBFS, lead
−12,8/−14,0 dBFS), picco 0,899963 e assenza di whoosh.
