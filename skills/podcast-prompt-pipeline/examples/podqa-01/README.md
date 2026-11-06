# Example: PodQAst Inteligente #01

A worked episode of the pipeline, reproducing the show from [Vivian Lima's `prompts_for_podcast_by-IA`](https://github.com/Vivianflima/prompts_for_podcast_by-IA) — the project that inspired this skill.

| | |
|---|---|
| Show | PodQAst Inteligente |
| Episode | #01 — O bug que ninguém viu |
| Host | Vivi (single host, as in the original prompt) |
| Language | pt-BR |
| Script | 523 words → 3:46 estimated at 140 wpm |
| Master | 3:17 · −16.0 LUFS measured · mono 44.1 kHz 192 kbps · shipped in `episodes/podqa-01.mp3` |
| Video | 3:17 · 1920×1080 24 fps · painted by [`podqa-01-video`](../../../../podqa-01-video/) · `episodes/podqa-01.mp4` |
| Blocks | ABERTURA · CURIOSIDADE 1 · CURIOSIDADE 2 · FINALIZAÇÃO |

## What is here

| File | |
|---|---|
| `brief.md` | The brief behind the episode: subject, audience, promise points, title shortlist |
| `script.md` | The episode script in the block format, validated by `check_script.mjs` with zero warnings |
| `voices.json` | Voice configuration (host `VIVI`, ElevenLabs multilingual v2) |

## How it was made

1. **Prompts.** The title prompt and the script prompt from [references/prompts.pt-BR.md](../../references/prompts.pt-BR.md), retargeted to the two promise points in `brief.md`: an invisible QA failure, and an AI tool a listener could try this week.
2. **Script.** Written directly into the four blocks. The negative rules from the original prompt were kept: no jargon without a gloss, and under five minutes. The estimate came in at 3:46 against a 4:10 target, so nothing had to be cut.
3. **Validation.** `node check_script.mjs` → 0 errors, 0 warnings. No bare digits, no all-caps abbreviations, no markdown inside speech, sentences under 20 words, fixed sign-off present.
4. **Voice and master.** Four blocks synthesized separately (36.4 s, 69.7 s, 64.6 s, 22.9 s of speech), then `assemble.mjs`: 0.35 s gaps (0.7 s after the opening), a 2.1 s procedural three-note sting at the head, EBU R128 to −16 LUFS, mono 44.1 kHz 192 kbps MP3.

## Result

```
3:17  episodes/podqa-01.mp3   speech 3:14 (98%)   4 segments
I: -16.0 LUFS   LRA: 4.0 LU   peaks -2.6 to -4.0 dBFS per block, no clipping

0:02  ABERTURA
0:39  CURIOSIDADE 1 — O erro invisível
1:49  CURIOSIDADE 2 — Uma ferramenta de IA para testar
2:54  FINALIZAÇÃO
```

Chapters start after the 2.1 s signature and its gap, so they match what the listener hears; an
earlier build of this file started them at 0:00 and ran 2.3 s early throughout.

The estimate said 3:46 and the delivered speech measured 160 words per minute against the estimator's 140 — a 14 % miss in the safe direction, since it read the script as slower than the voice did. When the number matters, trust `segments.json` after `--finalize`, not the estimate. The script is the reproducible part; `segments/` stays ignored, and one master is committed at `episodes/podqa-01.mp3` so the episode can be heard without a TTS key.

## Content

**CURIOSIDADE 1 — O erro invisível.** The 1999 loss of a Mars orbiter to a unit mismatch between two teams, retold as a QA lesson: nobody got the arithmetic wrong, and the software had no reason to complain. The lesson is the test that compares what one part of a system hands over with what the other part expects — a contract test — and the one question that prevents most expensive bugs: *who consumes this, and what exactly do they expect?*

**CURIOSIDADE 2 — Uma ferramenta de IA para testar.** A concrete recipe: paste a validation function into a chat model and ask for the edge cases that break it — empty input, oversized input, characters that should not exist — then treat the list as a proposal, not a truth. The model is good at imagining the improbable; the engineer is good at knowing what matters. The trap is accepting the whole list and testing the wrong requirement.

**FINALIZAÇÃO.** "O bug caro quase nunca está na conta. Ele está na conversa que ninguém teve." Then the fixed sign-off, word for word.

## Reproducing it

```bash
bash ../../scripts/new_project.sh /tmp/podqa-01
cp brief.md script.md voices.json /tmp/podqa-01/
cd /tmp/podqa-01 && node check_script.mjs && node tts.mjs && node assemble.mjs --sting
```

Generation is not deterministic: a different voice, or a different narration of the same script, is a different episode. The script, the block shares and the validation result are the reproducible part.
