# A história de Moisés

Um filme de história em quadrinhos, feito com a mesma prensa de `podqa-01-comic`: papel
de jornal, retícula de meio-tom, nanquim preto e **duas cores spot** — ocre de deserto
(`#B3402A`) e azul do Nilo (`#2E5A66`). Treze painéis, dois minutos, narração em português.

O filme final está em [`../episodes/exodus-comic.mp4`](../episodes/exodus-comic.mp4)
(2:03, 1920×1080, 24 fps).

## O que conta

Só o Êxodo: a escravidão, o cesto no Nilo, a sarça ardente, o confronto com o faraó, as
pragas e a travessia do Mar Vermelho. O roteiro é o `narration.json` — dez linhas, uma
voz (`voice-01`, pt-BR, narração masculina). Cada linha foi sintetizada em
`audio/l1..l10.mp3` e remontada em `audio/narration.m4a` por `build.mjs`, que também
escreve `timeline.json`: o tempo exato de cada painel.

| # | painel   | entra em | sai em | legenda no painel |
|---|----------|---------:|-------:|-------------------|
| 1 | egypt    |  1,20 |  9,50 | EGITO |
| 2 | pharaoh  |  9,50 | 18,85 | todo menino hebreu ao rio |
| 3 | basket   | 18,85 | 28,83 | O NILO |
| 4 | desert   | 28,83 | 37,73 | O DESERTO |
| 5 | bush     | 37,73 | 49,75 | EU SOU O QUE SOU |
| 6 | confront | 49,75 | 57,98 | O EGITO / deixa o meu povo ir / e ele recusa |
| 7 | blood    | 57,98 | 61,39 | a primeira praga / SANGUE |
| 8 | plagues  | 61,39 | 71,53 | AS PRAGAS |
| 9 | darkness | 71,53 | 73,86 | TRÊS DIAS |
| 10 | departure | 73,86 | 82,59 | e o povo sai |
| 11 | chariots | 82,59 | 91,34 | GALOPE |
| 12 | sea      | 91,34 | 104,05 | O MAR |
| 13 | cross    | 104,05 | 122,05 | do outro lado, a liberdade |

`timeline.json` é a fonte da verdade: `shots/index.mjs` lê esse arquivo, então o desenho
acompanha a voz e não o contrário.

## Como gerar

```bash
# dependências nativas, uma vez, na raiz do repositório (uma única cópia de @napi-rs/canvas
# para todos os projetos — duas cópias quebram o createPattern do meio-tom)
npm install

cd exodus-comic
node build.mjs                                  # audio/narration.m4a + timeline.json
node render.mjs --sheet=5,24,44 --cols=3 --w=620 --out=out/check/sheet.jpg   # folha de contato
node render.mjs --fps=24 --to=123.2 --audio=audio/narration.m4a --out=out/film.mp4
ffmpeg -i out/film.mp4 -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p \
       -c:a copy -movflags +faststart out/film-web.mp4
```

`FFMPEG=/caminho/do/ffmpeg` sobrescreve o binário (útil quando não há ffmpeg no PATH).
Rende ~90 ms por quadro: 2.957 quadros, uns 4,5 minutos de máquina.

## Como está desenhado

- `engine/comic.mjs` — reexporta a prensa de `podqa-01-comic` e troca as chapas de cor.
- `shots/index.mjs` — os treze painéis. Formas em unidades de página; texto, balões e
  legendas passam por `PX(panel, n)`, que converte pixels de tela em unidades da página
  para o zoom daquele painel. Retângulos sempre por `box()`/`sharp()`; `shape()` com
  `through()` arredonda os cantos e estraga uma parede.
- Figuras são símbolos: cabeça, corpo, direção. No tamanho em que aparecem, um rosto é um
  ponto e uma linha — e sobrancelha sobre olho vira olho fechado.
- Painéis noturnos invertem a tinta: os galhos da sarça e as silhuetas de Moisés são
  desenhados em cor de papel (`line: C.panel`), porque preto sobre preto não existe.
- `setBoilFrame` reseeda a trepidação a 12 fps: o nanquim respira, o desenho não treme.

## Pasta

```
exodus-comic/
├── narration.json     dez linhas, o roteiro
├── build.mjs          mp3 → narração contínua + timeline.json
├── timeline.json      tempos absolutos dos 13 painéis
├── engine/comic.mjs   prensa + paleta do Êxodo
├── shots/index.mjs    os 13 painéis
├── render.mjs         quadro a quadro → ffmpeg (também faz folhas de contato)
├── audio/             l1..l10.mp3 e narration.m4a
└── out/               filme e folhas de contato (ignorado pelo git)
```

Créditos das fontes: [`../podqa-01-comic/fonts/NOTICE.md`](../podqa-01-comic/fonts/NOTICE.md)
(Bebas Neue e Comic Neue, OFL 1.1).
