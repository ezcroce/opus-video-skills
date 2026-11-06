---
name: podcast-prompt-pipeline
description: Turn a topic into a finished podcast episode (MP3 + show notes) through a staged prompt pipeline — creative titles, a block-structured script, text-to-speech per block, and an assembled master with block gaps, loudness normalisation and an optional procedural signature. Derived from Vivian Lima's prompts_for_podcast_by-IA project (DIO Santander Bootcamp 2024). Use when the user asks to make a podcast, an episode, a spoken-audio piece, a "podcast gerado por IA", a roteiro for a show, or show notes, or mentions prompt engineering for podcasting, PodQAst, ElevenLabs, or text-to-speech narration.
---

# Podcast prompt pipeline

One topic in, one episode out, through five stages that each have a written prompt so the work is reproducible instead of improvised: **brief → titles → script → voice → master**.

The pipeline comes from [Vivian Lima's `prompts_for_podcast_by-IA`](https://github.com/Vivianflima/prompts_for_podcast_by-IA), built for the DIO Santander 2024 bootcamp: a Portuguese-language show called *PodQAst Inteligente* about software quality and AI, generated with ChatGPT for the script, ElevenLabs for the voice and CapCut for the mix. That project shipped the prompts and the finished MP4; this skill turns the same pipeline into a runnable, inspectable project so any episode can be regenerated end to end.

The original Portuguese prompts are preserved verbatim in [references/prompts.pt-BR.md](references/prompts.pt-BR.md) and adapted to English in [references/prompts.en.md](references/prompts.en.md). Read the set in the language you are producing in — they are the spine of the workflow.

## Workflow

### 0. Scaffold

```bash
bash ~/.claude/skills/podcast-prompt-pipeline/scripts/new_project.sh <project-dir>
```

Copies `template/`, checks `node` and `ffmpeg`, and prints which TTS providers are configured. Then fill `brief.md` — topic, audience, host name and persona, language, target length, the two or three promise points, and the sign-off line.

### 1. Brief, then titles — never skip to the script

Ask (or decide from what the user gave) four things: **subject**, **audience**, **host** (one or two, named), and **length in minutes**. Defaults if they don't care: one host, 3–5 minutes, the user's language.

Write 5 title candidates with the title prompt. Titles for audio have to be sayable: the host must be able to introduce the show by name without spelling it. Show the shortlist, let the user pick, then record the pick in `brief.md` — it is also the episode's ID3 title.

### 2. Script into named blocks

The script is not free prose. It is a sequence of blocks with fixed jobs, which is exactly what makes it synthesizable and editable:

| Block | Job | Share of runtime |
|---|---|---|
| `ABERTURA` | Cold open: one concrete hook, then the show name, then the promise of the episode | 10–15 % |
| `CURIOSIDADE 1` | The first promise point, explained through one example | 30–35 % |
| `CURIOSIDADE 2` | The second promise point, ideally a tool/method the listener can try | 30–35 % |
| `FINALIZAÇÃO` | One takeaway, then the fixed sign-off, then an ask | 10–15 % |

Rules that make it sound spoken, not written:

- **Sentences under 20 words.** One idea per sentence. Read the block out loud in your head; if you run out of breath, cut.
- **No markdown, brackets, emoji, URLs read aloud, or tables.** The TTS reads punctuation, not syntax.
- **Numbers and abbreviations spelled the way they must be spoken** ("2024" as "dois mil e vinte e quatro", "QA" as "quê-á", "LLM" as "ele-eme"). Keep a `pronunciation` map in `voices.json` so this stays consistent between blocks.
- **Signpost out loud**: "primeira curiosidade", "segunda e última". Listeners can't see headings.
- **The sign-off is fixed text.** It is the show's identity; only the host name and the show name change between episodes.
- **Respect the negative rules** from the original prompt: no jargon without a one-line gloss, no filler monologue, and the episode must land under the time cap. `check_script.mjs` fails the script on all of these.

Write to `script.md` in the block format described in [references/script-format.md](references/script-format.md). Then validate:

```bash
node check_script.mjs                     # format, word count, duration estimate, TTS hazards
node check_script.mjs --strict            # treat warnings as errors
```

Fix errors before spending a single TTS credit. A 3-minute episode is ~420 Portuguese words; the estimator runs on words per minute per language, not characters, because character count lies across languages.

### 3. Voice

`voices.json` maps each speaker to a provider and voice. The adapter in `tts.mjs` handles, in order of preference:

```bash
node tts.mjs --list                       # providers and voices it can see
node tts.mjs                              # synthesize every block from script.md
node tts.mjs --only=CURIOSIDADE-1         # re-do one block after an edit
```

- `elevenlabs` — `ELEVENLABS_API_KEY`, `eleven_multilingual_v2`, `stability 0.4 / similarity 0.8`. Best Portuguese prosody; this is what the original episode used.
- `openai` — `OPENAI_API_KEY`, `tts-1-hd` or `gpt-4o-mini-tts` with an `instructions` line for tone.
- `say` (macOS) and `espeak-ng` — offline fallback, robotic but free; good for timing the script before spending credits.
- `--manifest` — no provider: writes `segments.json` with the exact text of every block so another agent or chat surface can synthesize it. Use this inside Arena or any tool with its own TTS; drop the returned files into `segments/` with the manifest's filenames and continue to step 4.

Per-block synthesis is deliberate: it is resumable, it lets you fix one sentence without regenerating the episode, and it gives the assembler real block boundaries to place gaps at.

**Listen before assembling.** Play the opening block and the sign-off block. Check that the show name is pronounced right, that the sign-off lands flat and warm rather than rushed, and that no sentence has an audible stumble. Regenerate with a small pause inserted (`"..."`) or a rewritten sentence rather than accepting a bad read.

### 4. Master

```bash
node assemble.mjs                         # segments/ + segments.json -> out/<slug>.mp3
node assemble.mjs --sting --bed           # add the signature sting and a music bed
```

The assembler inserts a 0.35 s gap between blocks and 0.7 s after the opening, applies EBU R128 loudness normalisation (`I=-16 LUFS, TP=-1.5 dBTP, LRA=11`) so the episode sits next to commercial podcasts, writes mono 44.1 kHz MP3 at 192 kbps, and emits `out/<slug>.chapters.txt` from the block durations.

`--sting` generates a short three-note pad procedurally with ffmpeg oscillators — no sample files, in the spirit of the rest of this repo. `--bed` looks for `music/bed.mp3` and ducks it to about -26 LUFS under the voice; supply your own royalty-free loop or generate one with the `kinetic-reel` score engine.

### 5. Deliver

Hand over: the MP3 path and duration, the chosen title, the block/chapter list, and `show-notes.md` filled from the script (summary paragraph, three bullets, one link per promise point, the sign-off as a quote). If the user wants video, the cover art and a waveform still can be muxed into an MP4 for YouTube — but a podcast's deliverable is the MP3 and the notes.

## The rules that matter most

1. **Block discipline.** Four blocks, fixed jobs, share of runtime respected. Everything that makes the episode sound edited rather than rambling comes from this.
2. **Spoken syntax.** Short sentences, glosses instead of jargon, signposts, no punctuation the voice can't perform.
3. **Time is a budget, not an outcome.** Estimate from word count before synthesis; if the draft is 40 % over, cut a promise point. Never let the voice run long and cut the audio afterwards — cuts leave seams.
4. **The sign-off is sacred.** Same fixed sentence every episode, one slow read. That is the brand.
5. **Validate before spending credits**, and listen to the first and last block before assembling.

## Gotchas

- **Word count ≠ duration.** Portuguese runs ~140 wpm, English ~150, and TTS voices vary ±15 %. `check_script.mjs` uses these rates; treat its estimate as ±10 % and trust the measured block durations in `segments.json` once you have them. The worked example was estimated at 3:46 and delivered 3:20 — the estimator errs slow because an over-long draft is the expensive mistake.
- **Number and symbol reads are the top failure mode.** `2024`, `5G`, `R$`, `%`, `v2.3`. Spell them in the script; keep the map in `voices.json` for the ones that appear in many blocks.
- **ElevenLabs cuts at ~2,500 characters per request.** Keep blocks under 1,800 characters and the adapter will not chunk mid-sentence. `check_script.mjs` warns above that.
- **Consistency across blocks.** Same voice ID, same model, same settings for every block, or the listener hears the seams. The adapter pins them from `voices.json`; don't override per block.
- **Loudness, not peak.** Loudness-normalise rather than limiting: `loudnorm` on the concatenated file, never per block, or blocks end up at different perceived levels.
- **Silence is content.** Gaps between blocks are what make it feel like a show. Don't trim them to zero to save seconds.
- **ffprobe may be absent.** `assemble.mjs` falls back to parsing `ffmpeg -i`, so a minimal ffmpeg build is enough.

## Adapting

- **Two hosts.** Add a second speaker to `voices.json` and prefix every line in `script.md` with `VIVI:` / `COHOST:`. The assembler alternates per line and inserts 0.25 s between speakers, 0.6 s between blocks. Read [references/script-format.md](references/script-format.md) for the dialogue form.
- **Longer shows.** Repeat `CURIOSIDADE n` blocks; each becomes its own chapter and its own synthesis request, so a 20-minute episode stays resumable.
- **Other languages.** `voices.json.language` drives the estimator's rate and the default voice. The prompt set in `references/prompts.en.md` is a translation, not a replacement — keep the Spanish/Portuguese variants in the same directory when you add them.
- **Music and video.** `kinetic-reel` supplies the score engine and the type system for cover art and a waveform video; this skill owns words, voice and the master.

## Attribution

Pipeline, prompts and the *PodQAst Inteligente* example come from [Vivian Lima](https://github.com/Vivianflima/prompts_for_podcast_by-IA) (MIT), a DIO Santander 2024 bootcamp project. The original stack was ChatGPT + ElevenLabs + CapCut; this skill replaces CapCut with ffmpeg so the episode is reproducible from a script.
