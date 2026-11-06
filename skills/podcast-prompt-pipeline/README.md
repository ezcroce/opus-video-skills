<div align="center">

# podcast-prompt-pipeline

<a href="README.md"><img src="https://img.shields.io/badge/English-141B1F?style=for-the-badge" alt="English"></a>
<a href="README.zh-CN.md"><img src="https://img.shields.io/badge/简体中文-C6A15A?style=for-the-badge" alt="简体中文"></a>

A Claude Code skill for producing podcast episodes from a prompt pipeline with Claude Opus 5.5.
Part of [opus-video-skills](../../README.md).

</div>

## Overview

The skill enables Claude Opus 5.5 to take a subject and produce a finished episode: a title, a validated block-structured script, per-block text-to-speech, and a mastered MP3 with chapters and show notes.

It is a port of [Vivian Lima's `prompts_for_podcast_by-IA`](https://github.com/Vivianflima/prompts_for_podcast_by-IA), a project built during the DIO Santander 2024 bootcamp (Fundamentos de IA para Devs). That project produced *PodQAst Inteligente*, a Portuguese-language show about software quality and AI, using a chain of prompts in ChatGPT, ElevenLabs for the voice and CapCut for the mix. The prompts were the interesting part, and they were trapped in a README next to a finished MP4; this skill turns the chain into something that runs.

## How It Works

1. **Brief.** Subject, audience, host, language, target length, two or three promise points and the fixed sign-off. Nothing is written before this is settled.
2. **Titles.** The title prompt yields five candidates; names have to be sayable on air without spelling. The pick becomes the episode's ID3 title.
3. **Script.** The script prompt fills four blocks with fixed jobs — `ABERTURA`, `CURIOSIDADE 1`, `CURIOSIDADE 2`, `FINALIZAÇÃO` — each with a share of the runtime. Spoken syntax rules apply: sentences under 20 words, glosses instead of jargon, numbers written the way they are said.
4. **Validation.** `check_script.mjs` checks front matter, block structure, markdown leaking into speech, TTS hazards (bare digits, `%`, `R$`, all-caps abbreviations), sentence length and the duration budget, estimated from words per minute per language.
5. **Voice.** `tts.mjs` synthesizes each block separately through ElevenLabs, OpenAI, macOS `say` or `espeak-ng` — or emits a manifest so another surface with its own TTS can do the speaking.
6. **Master.** `assemble.mjs` places block gaps, mixes an optional procedurally generated three-note sting and an optional music bed, normalises to −16 LUFS, and writes mono 44.1 kHz 192 kbps MP3 with a chapters file.

## Characteristics

- **Prompts preserved verbatim.** The original Portuguese prompts are in [references/prompts.pt-BR.md](references/prompts.pt-BR.md), untouched, next to an English adaptation.
- **Blocks, not prose.** The four-block structure is what makes an episode sound edited and what makes synthesis resumable: fix one block without regenerating the episode.
- **Duration is estimated, not discovered.** Word budgets per language catch a 7-minute draft before a single TTS credit is spent.
- **No sample files.** The sting is generated from ffmpeg oscillators, so a project contains only text plus whatever voice you point it at.
- **Failure modes written down.** Number pronunciation, per-block voice consistency, loudness versus peak, and ElevenLabs' 2,500-character cut are the things that actually break episodes.

## Example: PodQAst Inteligente #01

A 3:46 Portuguese episode, "O bug que ninguém viu", from [examples/podqa-01/](examples/podqa-01/): the 1999 loss of a Mars orbiter told as a QA lesson about contract tests, and a reviewable recipe for using a chat model to enumerate edge cases. Script and brief are checked in; the audio is generated per machine.

## Requirements

- Claude Code with Claude Opus 5.5
- Node.js 18+ (uses global `fetch`)
- ffmpeg (a minimal build is enough — `ffprobe` is not required)
- One of: `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, macOS `say`, or `espeak-ng`

## Installation

See the [collection README](../../README.md#installation). As a plugin:

```
/plugin marketplace add tuzhechen2005/opus-video-skills
/plugin install podcast-prompt-pipeline@opus-video-skills
```

## Usage

Describe the episode in Claude Code:

> Make a 4-minute episode of my QA podcast about flaky tests.

> Turn these three release notes into a 6-minute episode, two hosts, English.

> Write episode 12 of PodQAst Inteligente and keep the sign-off.

The skill can also be invoked directly with `/podcast-prompt-pipeline`. It scaffolds a project, writes the brief and the title shortlist, drafts and validates the script, synthesizes block by block, and writes the master to `out/<slug>.mp3`.

Scaffold without Claude:

```bash
bash scripts/new_project.sh ~/podcasts/ep-12
cd ~/podcasts/ep-12
node check_script.mjs            # validate
node tts.mjs --list              # which provider is live
node tts.mjs                     # synthesize blocks
node assemble.mjs --sting        # master + chapters
```

## Repository Structure

| Path | Description |
|---|---|
| `SKILL.md` | Workflow and rules followed by Claude |
| `template/` | Runnable project: script template, brief, voices, validator, TTS adapters, assembler |
| `template/lib/script.mjs` | Shared parser, duration estimator and ffmpeg helpers |
| `scripts/new_project.sh` | Project scaffolding and toolchain check |
| `references/prompts.pt-BR.md` | The original prompts, verbatim |
| `references/prompts.en.md` | English adaptation, plus a show-notes prompt |
| `references/script-format.md` | Block format, parsing rules, hard errors, word budgets |
| `examples/podqa-01/` | Worked example: brief, script, voice configuration |

## Acknowledgements

The pipeline, the prompt set and the show concept come from [Vivian Lima](https://github.com/Vivianflima/prompts_for_podcast_by-IA) (MIT License), produced for the Bootcamp Santander 2024 — Fundamentos de IA para Devs at [DIO](https://dio.me). The original stack was ChatGPT, ElevenLabs and CapCut; this port keeps the prompting method and replaces the editor with ffmpeg so an episode is reproducible from its script. The skill was produced with Claude Opus 5.5 in Claude Code.

## License

MIT. See the repository [LICENSE](../../LICENSE).
