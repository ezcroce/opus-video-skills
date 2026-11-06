# Script format

`script.md` is the only source of truth for content and structure. Everything else — ids, timeline, chapters, cue
sheet, cover — is derived from it.

## Skeleton

```markdown
---
episode: ep-03
title: Why the thing nobody budgets for
language: en
---

## Cold open

HOST: One thought per line. A line is one turn, one breath, one revision unit.

GUEST: The answer. Short enough that re-recording it is cheap.

[beat 1.5]

## Chapter one — the part nobody budgets for

HOST: A question that moves the episode forward.

GUEST: An answer that pays off the question.

  This indented continuation stays in the same line.
```

## Front matter

Between the `---` fences, `key: value` pairs. Free-form: `parseScript` returns them as `meta`. Two keys matter:

| Key | Use |
|---|---|
| `episode` | The prefix of every clip id. Keep it stable; changing it re-names every clip. |
| `title` | Used by `lib/player.mjs` for the review page. |
| `language` | Passed to `generate_speech` when the voice was auditioned in another language. |

## Lines

`SPEAKER: text`. The speaker is upper case (letters, digits, spaces, `_`, `-`), up to 21 characters, and must exist in
`voices.json` — otherwise the line is reported and skipped.

- A line may be continued on the next **indented** line; the text is joined with a space. Use this for long speeches
  so the file stays readable — it does not create a pause.
- One line = one clip = one speech call. Splitting a line in two is how you get air into it.
- Target 8–35 words. Under 5 words is a fragment that sounds stilted alone; over ~50 words is a re-record you would
  rather not repeat.

## Pauses and beats

`[beat 1.5]` on its own line inserts silence (seconds). `[pause 3]` is the same thing with a longer name. The
difference from a blank line: a blank line gives `paragraphGap × 0.5` (~0.28 s, the phrase pause), `[beat]` gives
exactly what you ask for (the dramatic pause).

Put the beat **before** the line that needs the air. A beat after a line reads as hesitation; a beat before it reads
as a setup.

## Chapters

`## Title` starts a chapter. Consequences, in order of how often they matter:

1. `beats.chapter` (default 1.6 s) of air is inserted before the first line of the chapter.
2. `out/cues.csv` tags every line with its chapter.
3. `out/timeline.json` records the chapter's start time; `export.mjs` turns these into MP3 chapter markers.
4. `poster.mjs` draws one arc per chapter on the cover dial, the longest chapter in the accent colour.

A chapter is 2–6 minutes of finished audio. Shorter and the chapter beats fragment the episode; longer and the listener
loses the map. An episode is 3–8 chapters.

## Line ids

```
<episode>-<speaker>-<sha1(speaker \0 text)[0:8]>
      ep-03-host-3f00c1ab
```

Same speaker and same text anywhere in the episode give the same id — a repeated line (a running gag) is synthesised
once and reused, deliberately. Edit a line's text and its id changes, so the old clip is reported as stale and ignored;
the new line appears as missing. That is the whole re-record workflow.

**Never** invent or hand-write a clip filename. Read it: `node lib/lines.mjs --json`.

## Headings, quotes and comments

- `# Title` — metadata only, ignored.
- `> quote` — ignored (for notes in the script).
- `<!-- ... -->` — a block comment, ignored. Use it to leave direction for the reader in the file (`<!-- pause before
  this, she is thinking -->`), but remember the build cannot read it: a cue that changes the audio must be a `[beat]`.
- Any other non-matching line is reported with its line number and skipped. Run `node lib/build.mjs` after editing and
  read the warnings — they are how typos in speaker names surface.
