# OPUS VIDEO SKILLS — REEL ’26 · kinetic reel (18 s, 16:9, 30 fps, 120 BPM)

**Emphasis / time budget.** Due capitoli protagonisti, bilanciati: `01 PAINTED` 6 s (33%), `02 KINETIC` 6 s (33%),
`03 METHOD` 2 s (11%), apertura 2 s (11%), finale 2 s (11%). Nessun capitolo supera il 40%: la regola dello
style-guide è rispettata fin dal primo storyboard, senza dover «tagliare» la parte più amata in un secondo tempo.

**Source of truth for on-screen facts.** Esclusivamente i `README.md`, `SKILL.md` e
`references/style-guide.md` di questo repository. Ogni cifra ha il suo ambito:

| Dato sullo schermo | Fonte | Ambito |
|---|---|---|
| `TWO STYLES`, `6 S / 6 S` | `README.md` + questo storyboard | le due skill e il loro tempo nel reel (SCHEMATIC: time budget) |
| `P5.JS`, `P5.BRUSH`, `CLAWD`, `KARAOKE` | `README.md`, `SKILL.md` | stack e personaggio di `painted-animation` |
| `31 s` | `README.md` | lunghezza del lyric video di esempio 《小镇姑娘》 |
| `18 CELLS OF INK BOIL` | — | SCHEMATIC: griglia illustrativa, non un frame reale |
| `84 S` | `README.md` | lunghezza del Work Reel ’26 di esempio |
| `CUT ON BEAT / SLAM ON BAR / HIT = FRAME` | `references/style-guide.md` | regola di montaggio (reale: 120 BPM, 36 beat in 18 s) |
| sei transition cards | `references/style-guide.md` | SCHEMATIC: catalogo IRIS / ZOOM / WIPE / SLATS / GRID / PUSH |
| `NO IMAGE · VIDEO · AUDIO GENERATION MODELS` | `README.md` | affermazione verbale, nessuna inferenza |
| `1920×1080 · 30 FPS`, `120 BPM`, `MIT LICENSE` | `template/`, `LICENSE` | parametri di rendering e licenza |

Nessuna metrica inventata, nessun dato per-dimensione, nessun claim di efficacia. Le uniche visualizzazioni
illustrative portano la dicitura `SCHEMATIC` in HUD o nella didascalia.

**Thread / device.** Il reel parla di sé: la barra di avanzamento segmentata per capitolo (HUD) diventa, nella shot
`timeline`, la griglia di 36 beat con un playhead che è letteralmente `t / dur`. Il **mark** (starburst lime) nasce dal
puntino in apertura e ritorna nel finale, dove il reel si richiude in un punto: finale che fa rima con l'inizio.
Rotazione dei fondali a ogni taglio: ink → cream → ink2 → lime → blue → cream → ink → liquid → dark.

**Una «voice line» sola**, in serif italico sul marmo liquido: *Every frame is f(t).*

| Time | Chapter / shot | Headline (big type) | Visual mechanism | Transition in | Sound |
|---|---|---|---|---|---|
| 0–2 | OPEN | — | particle terrain → dot → starburst mark | da nero | riser, blip, impact |
| 2–4 | INDEX | TWO STYLES. | index card con due righe numerate e durate; il tile `01` è il rect del prossimo zoom | iris dal mark | bloom + tick per lettera, blip per riga |
| 4–6 | 01 / PAINTED | PAINTED / ANIMATION. | le lettere sono finestre sullo shader liquid marble (il «pigmento»); chip dello stack, stat `31 s` | zoom-through dal tile `01` | glide + tick per lettera, blip per chip |
| 6–8 | 01 / ENGINE | EVERY / FRAME. | 18 celle di inchiostro che bolle, una colonna in scansione per beat | slats (12) | harp discendente + tick a ogni scansione |
| 8–10 | 02 / KINETIC | KINETIC. / REEL. | unico fondale blue, slam con numero `02` in outline, chip delle quattro famiglie di font | **hard cut** sul bar + impact | soft impact, stab, blip per chip |
| 10–12 | 02 / TIMELINE | BEAT-LOCKED. | 36 beat / 9 barre, playhead = `t / dur`, contatore a rullino `00 → 84 S` | wipe con la linea di scansione | hatRoll, odo, stab, tick |
| 12–14 | 02 / CONTINUITY | CONTINUITY. | sei card delle transizioni, un punto lime che salta tra loro a tempo | push orizzontale | **silenzio** sul taglio; tick sulle card, blip sui salti |
| 14–16 | 03 / METHOD | *Every frame is f(t).* | marmo liquido a tutto schermo, voce parola per parola, due righe di fatti dal README | grid (16×9) | swell, pad, stab per parola (capitolo più quieto) |
| 16–18 | END | OPUS / VIDEO SKILLS. | ritorno del mark, glitch, collasso in un punto | push verticale | impact + stab, glitch, soft impact sul punto |

**Verifiche fatte (review loop).** `review/sheet-final.jpg` (un frame per shot), `review/sheet-transitions.jpg`
(un frame a metà di ogni transizione), `review/stills/` (full-res sulle shot dense), `review/spectrum.png` e RMS
per sezione. Correzioni applicate dopo il primo sheet: chip poco contrastati su fondali scuri, didascalia `BOIL`
che collideva con il titolo, timing dei chip che non finivano prima del taglio, scrim sotto le righe di fatti sul
marmo liquido.

**Audio.** Non è stato possibile *ascoltare* il risultato: verificato con spettrogramma, RMS per capitolo
(01 −14.0 dBFS, 02 −13.6 dBFS, 03 −17.5 dBFS) e con `grep -c "whoosh(" music/score.mjs` = 0.
