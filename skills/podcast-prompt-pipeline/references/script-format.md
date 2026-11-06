# Script format

`script.md` is both the writing document and the machine input for `check_script.mjs` and `tts.mjs`. The parser is deliberately small: front matter, then `##` blocks, then speaker-prefixed lines.

## Single host

```markdown
---
slug: podqa-01
title: "PodQAst Inteligente #01 — O bug que ninguém viu"
show: PodQAst Inteligente
host: Vivi
language: pt-BR
target_seconds: 240
---

## ABERTURA

VIVI: ...

## CURIOSIDADE 1 — Qualidade de Software

VIVI: ...

## CURIOSIDADE 2 — Uma ferramenta de IA para testes

VIVI: ...

## FINALIZAÇÃO

VIVI: ...
```

## Two hosts

Same structure; alternate speaker prefixes. A block becomes several synthesis requests, one per contiguous run of the same speaker, and the assembler inserts 0.25 s between speakers inside a block.

```markdown
## CURIOSIDADE 1

VIVI: ...
DIEGO: ...
VIVI: ...
```

## Front matter

| Key | Required | Meaning |
|---|---|---|
| `slug` | yes | Output filename stem, `a-z0-9-` |
| `title` | yes | Episode title, also the ID3 title tag |
| `show` | yes | Show name, used on the cover and in chapters |
| `host` | yes | Default speaker; must exist in `voices.json` |
| `language` | yes | BCP-47 (`pt-BR`, `en`, `es`); sets the duration estimator's rate |
| `target_seconds` | yes | Budget. Validation fails above 115 % of it |
| `cap_seconds` | no | Hard cap, default 300 (the original prompt's 5-minute negative rule) |
| `signoff` | no | The fixed closing sentence; the validator checks the last block ends with it |

## Parsing rules

- `## ` headings start a block. The text after `—`/`-` is a human label and is ignored by the parser; the first token(s) before it (`ABERTURA`, `CURIOSIDADE 1`, `FINALIZAÇÃO`) are the block ID, slugified to `abertura`, `curiosidade-1`, `finalizacao`.
- `INTRODUÇÃO` / `INTRODUÇÃO` is accepted as an alias of `ABERTURA` so the original prompt's block names work unchanged.
- A line starting with `NAME:` where `NAME` is a key in `voices.json` (case-insensitive) is a speech line. Continuation lines join it.
- Blank lines separate paragraphs; a blank line inside one speaker's turn is rendered as a sentence break, not a new synthesis request.
- Lines starting with `>` or `<!--` are notes and are stripped before synthesis.
- Anything else outside a block is a warning, not an error.

## Word budgets

| Language | Words per minute | 3 min | 5 min |
|---|---|---|---|
| pt-BR | 140 | ~420 | ~700 |
| en | 150 | ~450 | ~750 |
| es | 145 | ~435 | ~725 |

Per-block shares: opening 12 %, each curiosity 33 %, sign-off 12 %. If a curiosity block is more than 15 % over its share, it is carrying two ideas — split it or cut one.

## Hard errors

- Missing front matter key, or `slug`/`language` malformed.
- No blocks, or a block whose speech text is empty.
- Total estimate above `cap_seconds`.
- A speaker that is not in `voices.json`.
- Markdown syntax inside speech text (`**`, `#`, `[text](url)`, `- ` list items), or a bracketed stage cue like `[pause]`.

## Warnings

- Total estimate above 100 % of `target_seconds` (fails with `--strict`).
- A block over 1,800 characters (ElevenLabs cuts at ~2,500 and may split mid-sentence).
- A sentence over 30 words.
- Bare digits, `%`, `R$`, `&`, `+`, `→`, `vs.`, or all-caps abbreviations inside speech text — TTS reads these unpredictably. Spell them out.
- The final block does not end with `signoff`.
- Blocks whose share of runtime is off by more than 15 percentage points.
