# MOSES — EXODUS IN 60 SECONDS

Un reel cinetico di **60 secondi** sul Mosè della Bibbia, creato seguendo la skill
[`kinetic-reel`](../../skills/kinetic-reel/): scaffold → storyboard → `cues.js` → 16 shot → review con
contact sheet → score → 1440 frame → encode. Visivo e musica sono generati proceduralmente in codice:
**nessun modello generativo** di immagini, video o audio. Ogni dato a schermo è un riferimento a
Esodo / Numeri / Deuteronomio e ogni diagramma è dichiarato `SCHEMATIC`.

## Guardarlo

| File | Cosa |
|---|---|
| [`index.html`](index.html) | pagina per vederlo nel browser (player, barra a 6 capitoli, link alle fonti) |
| **`MOSES-EXODUS-60s.mp4`** | **1920×1080, 60,01 s, 24 fps, H.264 + AAC, ~19 MB** |
| `MOSES-EXODUS-60s-web.mp4` | copia 1280×720 ~5 MB per la pagina web |
| `poster.jpg` | frame a 28,8 s (il mare aperto) usato come poster |
| [`STORYBOARD.md`](STORYBOARD.md) | budget tempi, fonte di ogni dato, thread/device, tabella shot per shot, correzioni |
| `review/sheet-final.jpg` | un frame per shot + il taglio duro (17) |
| `review/sheet-transitions.jpg` | un frame a metà di ogni transizione (15) |
| `review/stills/`, `review/spectrum.png` | quattro still full-res e spettrogramma dell'audio |

```bash
node serve.mjs 8000     # http://localhost:8000/ — con supporto HTTP Range per lo seeking
```

`serve.mjs` non ha dipendenze. In alternativa va bene qualsiasi static server con supporto Range.

## Com'è fatto

```
reel/cues.js     la timeline: S (16 shot), hits, CH (6 capitoli), dur = 60 s, 120 BPM, 24 fps
reel/reel.js     motore del template + 16 shot (sOpen … sEnd), TR (transizioni), SCENES
reel/index.html  studio interattivo con scrub:  reel/index.html?t=28.8
music/score.mjs  synth offline in Node, legge cues.js → music/score.wav (poi assets/score.m4a)
assets/fonts/    Anton, Archivo Black, Instrument Serif, JetBrains Mono in locale (woff2)
render.mjs       headless Chrome → contact sheet / still / frame → ffmpeg
serve.mjs        static server con Range/206
```

Lo **studio interattivo** ridisegna ogni frame nel browser: apre `?t=<secondi>` per ispezionare un istante
preciso. Richiede `node_modules/three` (cioè `npm install`).

### Riproduzione

```bash
npm install
export CHROME_PATH=/percorso/di/chrome        # oppure --chrome=… in render.mjs
export FFMPEG=/percorso/di/ffmpeg             # opzionale: se ffmpeg non è nel PATH
npm run score
$FFMPEG -y -i music/score.wav -af "highpass=f=30,equalizer=f=250:t=q:w=1:g=-2,loudnorm=I=-14:TP=-1.2:LRA=8" \
  -c:a aac -b:a 192k assets/score.m4a
npm run sheet          # e npm run transitions / npm run stills per la review
npm run frames         # 1440 frame, --fps=24 --workers=4 --soft-gl
npm run encode         # CRF 25 → MOSES-EXODUS-60s.mp4
```

Su macchine senza GPU usare `--soft-gl` (SwiftShader); gli script qui sopra lo includono già.
`render.mjs --encode` del template usa CRF 17 e produce un file molto più grande: per questo progetto
si usa il comando diretto in `npm run encode`.

La pagina non dipende da Google Fonts: i quattro font sono copie locali dei pacchetti `@fontsource`
(SIL OFL), così il rendering è identico anche offline. Il reel è in inglese con micro-annotazioni in
italiano: `F.zh` è un alias del mono e non serve il subset CJK.

### Perché non `painted-animation`

La prima ipotesi era il corrispettivo ad acquerello. In questo sandbox p5.brush gira in SwiftShader
(nessuna GPU reale): una pagina di prova con tre sole forme ha richiesto **14–39 s per frame**, quindi
60 s di film avrebbero richiesto ore. La richiesta era «sempre un video» — stesso tipo di video del reel
precedente — perciò è stato riutilizzato `kinetic-reel`, portando la durata da 18 a 60 s e raddoppiando
il numero di shot. I file di quella prova restano fuori dal repository.

### Verifiche

Ogni shot è stata guardata: `sheet-all.jpg` (primo giro, 16 frame), quattro still full-res rigenerate,
il foglio delle transizioni e `sheet-final.jpg`. Le cinque correzioni sono elencate in `STORYBOARD.md`.
Dal MP4 sono stati estratti `review/from-encode.jpg` (strip a 25 s) e `review/last-frame.jpg` (il punto
di chiusura). 1440 frame in 4 worker a ~247 ms/frame effective (5 m 57 s).

**L'audio non è stato ascoltato**: verificato con `showspectrumpic`, RMS per sezione
(`voice` −17,8 dBFS, `tablets` −18,4 dBFS, capitoli portanti −12,8…−14,0 dBFS), picco 0,899963,
assenza di noise whoosh (`grep -c "whoosh(" music/score.mjs` → 0) e durata 61,01 s della traccia
che viene troncata a 60,01 s dal video con `-shortest`.
