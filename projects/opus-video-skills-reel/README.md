# OPUS VIDEO SKILLS — REEL ’26

Un reel cinetico di **18 secondi** su questo stesso repository, creato seguendo la skill
[`skills/kinetic-reel`](../../skills/kinetic-reel/) passo per passo: scaffold → storyboard → `cues.js` →
un file di shot → review con contact sheet → score → render → encode. Tutto il visivo e tutta la musica sono
generati proceduralmente in codice: **nessun modello generativo** di immagini, video o audio.

## Guardarlo

| File | Cosa |
|---|---|
| [`index.html`](index.html) | pagina per vederlo nel browser (player, barra a capitoli, link alle fonti) |
| **`OPUS-VIDEO-SKILLS-REEL.mp4`** | **1920×1080, 18 s, 30 fps, H.264 + AAC, ~17 MB** |
| `OPUS-VIDEO-SKILLS-REEL-web.mp4` | copia 1280×720 ~2 MB per la pagina web / connessioni lente |
| `poster.jpg` | frame a 9,7 s usato come poster |
| [`STORYBOARD.md`](STORYBOARD.md) | budget tempi, fonte di ogni dato, device, tabella shot per shot |
| `review/sheet-final.jpg` | un frame per shot (9) |
| `review/sheet-transitions.jpg` | un frame a metà di ogni transizione (8) |
| `review/stills/`, `review/spectrum.png` | full-res sulle shot dense e spettrogramma dell'audio |

Per servirlo in locale con il supporto **HTTP Range** (necessario per lo seeking e per Safari):

```bash
node serve.mjs 8000     # http://localhost:8000/
```

`serve.mjs` non ha dipendenze. In alternativa va bene qualsiasi static server con supporto Range.

## Com'è fatto

```
reel/cues.js     la timeline: S (inizi shot), hits, CH (capitoli), dur = 18 s, 120 BPM
reel/reel.js     il motore del template + 9 shot (sOpen … sEnd), TR (transizioni), SCENES
reel/index.html  studio interattivo con scrub:  reel/index.html?t=9.7
music/score.mjs  synth offline in Node, legge cues.js → music/score.wav (poi assets/score.m4a)
assets/fonts/    Anton, Archivo Black, Instrument Serif, JetBrains Mono in locale (woff2)
render.mjs       headless Chrome → contact sheet / still / frame → ffmpeg
package.json     puppeteer-core + three
```

Lo **studio interattivo** (`reel/index.html`) ridisegna ogni frame nel browser: apre `?t=<secondi>` per
ispezionare un istante preciso. Richiede `node_modules/three` (cioè `npm install`).

### Riproduzione

```bash
npm install
export CHROME_PATH=/percorso/di/chrome        # oppure --chrome=… in render.mjs
export FFMPEG=/percorso/di/ffmpeg             # opzionale: se ffmpeg non è nel PATH
node music/score.mjs
$FFMPEG -y -i music/score.wav -af "highpass=f=30,equalizer=f=250:t=q:w=1:g=-2,loudnorm=I=-14:TP=-1.2:LRA=8" \
  -c:a aac -b:a 192k assets/score.m4a
node render.mjs --sheet=1.8,3.5,5.8,7.8,9.7,11.7,13.7,15.7,17.1 --cols=3 --w=640 --out=review/sheet-final.jpg
node render.mjs --frames --workers=4
$FFMPEG -y -framerate 30 -i out/frames/f%05d.jpg -i assets/score.m4a -map 0:v -map 1:a \
  -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest \
  -movflags +faststart OPUS-VIDEO-SKILLS-REEL.mp4
```

Su macchine senza GPU usare `--soft-gl` (SwiftShader). La pagina non dipende da Google Fonts: i quattro font
sono copie locali dei pacchetti `@fontsource` (SIL OFL), così il rendering è identico anche offline.
Il reel è in inglese/italiano, quindi non serve il subset CJK: `F.zh` è alias del mono e le micro-annotazioni
sono in italiano.

### Note sulla toolchain (sandbox)

In questo ambiente non c'erano Chrome, ffmpeg né `rsync`, quindi sono state applicate due piccole modifiche
di portabilità ai template del repository (utili a chiunque usi la skill su una macchina minimale):

- `skills/*/scripts/new_project.sh`: se `rsync` manca, usa `cp -a`.
- `skills/*/template/render.mjs`: `FFMPEG` (env) al posto del comando hardcoded `ffmpeg`.

Chrome e ffmpeg usati qui sono binari statici forniti da npm (`@sparticuz/chromium`,
`@ffmpeg-installer/linux-x64`); WebGL è stato renderizzato in software con `--soft-gl`.
540 frame in 4 worker, ~298 ms/frame effective.

### Verifiche

Ogni shot è stato guardato più volte: due contact sheet, tre still full-res e un foglio di transizioni.
Le correzioni dopo il primo giro sono elencate in `STORYBOARD.md`. **L'audio non è stato ascoltato**:
è stato controllato con `showspectrumpic`, RMS per capitolo (`01` −14.0 dBFS, `02` −13.6 dBFS,
`03` −17.5 dBFS, finale −12.6 dBFS) e con l'assenza di noise whoosh (`grep -c "whoosh(" music/score.mjs` → 0).
