<div align="center">

# opus-video-skills

<a href="README.md"><img src="https://img.shields.io/badge/English-0E0F0E?style=for-the-badge" alt="English"></a>
<a href="README.zh-CN.md"><img src="https://img.shields.io/badge/简体中文-DDF53D?style=for-the-badge" alt="简体中文"></a>

A collection of Claude Code skills for producing videos and podcasts with Claude Opus 5.5, one skill per visual style — plus one for spoken audio.

</div>

## Overview

Each skill in this repository teaches Claude Opus 5.5 to produce a complete piece in a particular style, covering storyboarding, animation, review, music and final encoding. All imagery and all music are generated procedurally in code; no image, video or audio generation model is involved. Every frame is a pure function of time, rendered in headless Chrome and encoded with ffmpeg.

The exception is [podcast-prompt-pipeline](skills/podcast-prompt-pipeline/), which is audio: it works from a prompt chain (titles, block-structured script, voices) and produces a mastered episode. Its words are written by Claude, its voice comes from a TTS provider, and its assembly and signature are ffmpeg.

## Styles

| Skill | Style | Typical use |
|---|---|---|
| [painted-animation](skills/painted-animation/) | Hand-painted watercolour and ink cartoon, with character acting | Animated shorts, music videos, lyric videos with karaoke |
| [kinetic-reel](skills/kinetic-reel/) | Kinetic typography: condensed display type, HUD micro-type, WebGL layers | Portfolio and work reels, showreels, product and intro films |
| [podcast-prompt-pipeline](skills/podcast-prompt-pipeline/) | Podcast production from a prompt chain: block script, TTS, mastered MP3 | Podcast episodes, audio essays, narrated show notes |

### painted-animation

![painted-animation](skills/painted-animation/docs/xiaozhen-sheet.jpg)

Draws every shot with p5.js and the p5.brush watercolour library. Characters act through a library of expressions and motion principles. Music videos are cut to the measured beat, and lyric videos carry word-by-word karaoke subtitles. Example: a 31-second lyric video for 陶喆《小镇姑娘》. [Documentation](skills/painted-animation/README.md).

### kinetic-reel

![kinetic-reel](skills/kinetic-reel/docs/work-reel-sheet.jpg)

Combines a 2D type canvas with three.js layers (particle terrain, liquid marble, a chrome knot, a particle cloud that condenses into a shape) and a WebGL post pass. Shots are joined by shape-continuity transitions, and the score is synthesized from the same timeline as the picture. Example: "Work Reel ’26", an 84-second portfolio reel. [Documentation](skills/kinetic-reel/README.md).

### podcast-prompt-pipeline

A port of [Vivian Lima's prompts_for_podcast_by-IA](https://github.com/Vivianflima/prompts_for_podcast_by-IA) project from the DIO Santander 2024 bootcamp. Four blocks with fixed jobs (`ABERTURA`, two `CURIOSIDADE`, `FINALIZAÇÃO`), a validator that catches markdown in speech, bare digits and a blown time budget before any TTS credit is spent, per-block synthesis so one sentence can be redone, and an ffmpeg master at −16 LUFS with a procedurally generated signature sting. Example: a 3:46 Portuguese episode, "O bug que ninguém viu". [Documentation](skills/podcast-prompt-pipeline/README.md).

## Requirements

- Claude Code with Claude Opus 5.5
- Node.js, Google Chrome, ffmpeg
- Python 3 with numpy (painted-animation tempo detection only)
- A TTS provider for podcast-prompt-pipeline: ElevenLabs, OpenAI, macOS `say` or `espeak-ng`

## Installation

**As plugins (recommended).** In Claude Code:

```
/plugin marketplace add tuzhechen2005/opus-video-skills
/plugin install painted-animation@opus-video-skills
/plugin install kinetic-reel@opus-video-skills
/plugin install podcast-prompt-pipeline@opus-video-skills
```

Install either skill or both. `/plugin update` fetches new versions.

**As personal skills.** Clone the repository once and link the skills you want:

```bash
git clone https://github.com/tuzhechen2005/opus-video-skills ~/opus-video-skills
ln -s ~/opus-video-skills/skills/painted-animation ~/.claude/skills/painted-animation
ln -s ~/opus-video-skills/skills/kinetic-reel ~/.claude/skills/kinetic-reel
ln -s ~/opus-video-skills/skills/podcast-prompt-pipeline ~/.claude/skills/podcast-prompt-pipeline
```

Updating is then a `git pull` in `~/opus-video-skills`.

> **Upgrading from `painted-animation`.** This repository was previously the single `painted-animation` skill, cloned directly into `~/.claude/skills/painted-animation`. That layout no longer works, because the skill now lives in `skills/painted-animation/`. Remove the old clone and install with either method above.

## Usage

Describe the video in Claude Code. The matching skill is selected automatically, or it can be invoked by name:

> Make a 15-second video of Clawd trying to catch a butterfly.

> Make a 60-second kinetic-type reel of my three projects from this résumé.

> Make a 4-minute episode of my QA podcast about flaky tests, in Portuguese.

Each video skill scaffolds a project, presents a storyboard, builds and reviews every shot, and writes the finished MP4 to the project's `out/` directory. The podcast skill scaffolds a project, presents the brief and a title shortlist, validates the script, synthesizes block by block and writes the episode MP3 plus chapters to `out/`.

## Repository Structure

| Path | Description |
|---|---|
| `.claude-plugin/marketplace.json` | Plugin marketplace manifest (one plugin per skill) |
| `skills/painted-animation/` | Watercolour animation skill: engine, guides, examples |
| `skills/kinetic-reel/` | Kinetic-typography reel skill: engine, guides, examples |
| `skills/podcast-prompt-pipeline/` | Podcast skill: prompt set, script validator, TTS adapters, ffmpeg master |

## Adding a Style

A new style is a new directory under `skills/` containing a `SKILL.md`, a runnable `template/` and at least one worked example, plus an entry in `.claude-plugin/marketplace.json`. The two existing skills share a contract: frames are pure functions of time, `render.mjs` produces contact sheets and parallel frame renders, and every shot is reviewed from rendered images before the final encode.

## Acknowledgements

The painted-animation engine and guide are adapted from [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) by John Heibel (MIT License), and the method follows his [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo). The kinetic-reel renderer is derived from the same kit. The podcast pipeline, its prompt set and the *PodQAst Inteligente* show concept come from [Vivian Lima](https://github.com/Vivianflima/prompts_for_podcast_by-IA) (MIT), a DIO Santander 2024 bootcamp project. The projects use p5.js, p5.brush, three.js, Puppeteer and ffmpeg. The skills and examples were produced with Claude Opus 5.5 in Claude Code.

## License

MIT. See [LICENSE](LICENSE).
