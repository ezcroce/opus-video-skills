# STORYBOARD — PodQAst Inteligente #01, illustrated

Video for the 3:17 episode `episodes/podqa-01.mp3`. 1920×1080, 24 fps, 15 shots, cut to the measured
sentence cues in `cues.json` (block starts 0:00 / 0:37 / 1:47 / 2:52, lead of the sting 2.34 s).

**Logline.** A host explains two things about software quality — a probe lost over a unit nobody compared,
and a machine that lists edge cases faster than anyone can check them — and the film's argument is that the
expensive bug is never in the arithmetic, it is in the conversation nobody had.

**Medium.** Painted: watercolour washes over paper, boiling ink linework, flat 2D, no lettering. The
engine is a Node/Skia port of the skill's p5.brush core (see `README.md` — this sandbox has no Chrome).

**World.** One warm room with a lamp, a microphone, a table and a plant; deep dusk for space. The room is
the film's resting place: every time the story leaves it, it comes back to it.

**Motifs.** The single ink line (the "one-line change") becomes the rail, the crack and the torn scroll.
The rocket and the sketchbook appear in the promise and come back in the sign-off — the closing image
rhymes with the opening one.

| # | Shot | In → out | Audio it answers | Reads (in order) |
|---|---|---|---|---|
| 1 | `a1-line` | 0:00 → 0:07 | "Imagina que você sobe uma alteração de uma linha só. Uma linha." | the room and the host · one line drawn across the wall · the line held and glowing |
| 2 | `a2-login` | 0:07 → 0:16 | "E ela derruba o login de todo mundo." | the line becomes a rail, a block slides along it · the login door swings shut · three people tumble out · her take |
| 3 | `a3-promise` | 0:16 → 0:27 | "Eu sou a Vivi… Hoje eu trago duas coisas." | she waves, name lands · a rocket rises (story one) · a sketchbook rises (story two) |
| 4 | `a4-push` | 0:27 → 0:39 | "…uma história de um erro que ninguém conseguiu ver…" | the two objects float · the camera pushes into the little planet · cut to space |
| 5 | `b1-mars` | 0:39 → 0:53 | "Em 1999 a agência espacial perdeu uma sonda em Marte… o motivo foi uma unidade de medida." | Mars and stars · the probe glides in on one arc · a price tag swings · two rulers of different lengths |
| 6 | `b2-mismatch` | 0:53 → 1:10 | "Uma equipe calculou numa unidade… Ninguém errou a conta… o foguete foi para o lugar errado." | two platforms, two teams · each paints a perfect stroke · the gap between them and a "?" · the arrow bends away off-frame |
| 7 | `b3-pattern` | 1:10 → 1:24 | "Repara no padrão. Não foi falta de gente boa. Não foi falta de teste." | the room again · three competent people arrive · a wall of tests all ticked · one square left empty and glowing |
| 8 | `b4-contract` | 1:24 → 1:37 | "…teste de contrato. A ideia é simples… as duas pontas falando a mesma língua." | two islands · a bridge builds between them · a plug and a socket meet · light at the join |
| 9 | `b5-question` | 1:37 → 1:49 | "Na prática é uma pergunta só, feita em voz alta na reunião…" | she leans across the table · two colleagues turn · the question hangs between them · a crack in the wall |
| 10 | `c1-tool` | 1:49 → 2:12 | "Agora a parte prática… abre um chat e cola a função." | the form with its wobbling field · the machine arrives · the sheet is fed in · the machine lights up |
| 11 | `c2-list` | 2:12 → 2:23 | "Ele vai te devolver uma lista. A lista é uma proposta, não uma verdade. Leia caso por caso." | slips spray out into a row · she reads one and squints · she lifts them one by one |
| 12 | `c3-sort` | 2:23 → 2:41 | "Os que puderem viram teste… os que não, descarta. Um faz a lista, o outro corta." | keepers stack as a solid block · discards tip off the table · the machine draws an impossible tangle · the scissors cut |
| 13 | `c4-trap` | 2:41 → 2:54 | "O cuidado é um só… inventa requisito com confiança. Se você aceitar a lista inteira sem revisar…" | the scroll unrolls · fake requirements sprout off it · the paper covers the table · she tears it in two |
| 14 | `d1-talk` | 2:54 → 3:02 | "O bug caro quase nunca está na conta. Ele está na conversa que ninguém teve." | a stack of coins topples and means nothing · two people, one gap · the gap held |
| 15 | `d2-signoff` | 3:02 → 3:17 | "Escolhe uma parte do seu sistema… Eu sou a Vivi e esse foi o Podcast Inteligente dessa semana." | she speaks to the mic · she waves · the lamp dims · the ink signature and the held last frame |

## Transitions

Every seam is a paper-bleed: the outgoing shot closes into a wobbling watercolour shape and the next
opens out of it (0.62 s total, centred on the cut). The opening fades up out of the sheet; the ending
fades down into it, so the film starts and finishes on paper.

## What is deliberately not here

No captions, no titles, no numbers on screen, no speech bubbles with words. The only punctuation marks
are painted emotes (`?`, `!`), which the guide allows as reactions. Anything the voice says about units,
counts or code is shown as a shape: a ruler with ticks, a tag, a wobbling field, slips of paper.

## Timing notes

The reads are timed from the measured sentence cues, not from the script: e.g. the block "curiosidade 1"
starts at 0:39.40 (not 0:37 — the chapter file ignores the 2.34 s sting lead) and its first sentence ends
at 0:45.75, which is when the price tag lands and the rulers start.

Two beats are deliberately long: the empty square in shot 7 (1:17–1:24) and the gap between the two
people in shot 14 (2:59–3:02). They are the film's two ideas, and both need to be looked at, not
narrated over.
