---
name: podcast-studio
description: Produce a complete podcast episode in code — script structure, voice casting, per-line speech clips, a mix with intro sting, chapter breaks and a generated music bed, a mastered WAV, MP3 with chapter markers, cover art and a review player. Use when the user asks to make, record, edit, assemble, mix or publish a podcast, audio drama, narrated explainer, audiobook chapter or "podcast-style" episode, or brings a podcast script, an ElevenLabs MP3 or a "Projeto Podcast"-style script + voice project.
---

# Podcast studio

A method for making a finished, listenable episode from a script — the audio sibling of the video skills in this
repository. Everything below the voice is generated: the sting, the chapter breaks, the music bed, the mix, the master,
the cover art. The one thing a model supplies is the speech, one clip per line.

**How it works.** `script.md` is the source of truth: one line per speaker turn, `##` for chapters, `[beat 1.5]` for
silence. Each line gets a stable id (`ep-host-3f00c1ab`) derived from its speaker and text, so editing one line
invalidates exactly one clip. `lib/lines.mjs` reports what has no clip yet; the agent synthesises each of those lines
with that speaker's voice and saves it to `assets/voice/<id>.wav`. `lib/build.mjs` then lays the clips on a timeline
with chapter beats and pauses, adds sting, bed and tag, masters it to `out/master.wav`, and writes the timeline, cue
sheet and a waveform review image. `lib/export.mjs` makes an MP3 with chapter markers if ffmpeg is present;
`lib/poster.mjs` draws the cover; `lib/player.mjs` writes a review page that plays the episode with a synced transcript.

No dependencies. Node 18+ is enough for the whole audio master. ffmpeg only matters for MP3/AAC export.

## Workflow

### 0. Scaffold

```bash
bash ~/.claude/skills/podcast-studio/scripts/new_project.sh <project-dir>          # blank script skeleton
bash ~/.claude/skills/podcast-studio/scripts/new_project.sh <project-dir> --keep-demo   # the demo episode's script
```

The scaffold copies `lib/`, `podcast.config.json`, `voices.json` and a `script.md` skeleton, and synthesises
`assets/stingers/{sting,tag}.wav` and `assets/music/bed.wav` (deterministic, a few hundred ms). It does not run
`npm install` — there is nothing to install.

Then read [references/script-format.md](references/script-format.md) (the whole format, the pauses, the chapter rules)
and [references/sound.md](references/sound.md) (mixing, bed level, loudness, the mastering chain) before writing.

### 1. Script before voice

Write `script.md`, not prose paragraphs: **the line is the unit of revision**. A line is one turn, one thought, one
breath — long enough to carry an idea, short enough that re-recording it is cheap. Chapters (`## Title`) become
chapter markers in the MP3, entries in `out/cues.csv` and the dial on the cover.

A minute of finished audio is ~140–160 words. Budget the episode in lines: `words / 2.5` seconds each, plus
`paragraphGap` between paragraphs and `beats.chapter` (1.6 s by default) at each chapter break.

Show the script skeleton — cold open, chapters, close — to the user before synthesising anything. Voices cost time;
rewriting is free.

### 2. Cast the voices

`voices.json` maps a script speaker to a voice id:

```json
{ "HOST": "voice-00", "GUEST": "voice-01" }
```

- If the session has a voice registered (from `add_voice`), use it. Two speakers → two registrations, requested in
  parallel, one per character; describe the voice by who the person is, not by the technique.
- If the user brings audio (ElevenLabs, a human recording, an existing interview), skip synthesis for those lines and
  import it instead of synthesising:

  ```bash
  node lib/import-audio.mjs --plan                                    # every line id + text
  node lib/import-audio.mjs assets/take.wav --id=<line-id>            # one file, one line
  node lib/import-audio.mjs assets/episode.mp3 --split=<id>=0:12.4,<id>=12.4:26.9   # several slices, needs ffmpeg
  ```

  The importer converts to mono 44.1 kHz WAV, checks brightness (peak/RMS), and refuses ids that are not in the plan.
  See [references/voice.md](references/voice.md).
- Keep a speaker's voice identical for the whole episode and across episodes of a series. Never re-cast mid-episode.

### 3. Synthesise, line by line

```bash
node lib/lines.mjs --json > out/pending.json      # [{ id, speaker, voice, text, file, estSeconds }]
node lib/lines.mjs                                # the same, human-readable, grouped by voice
node lib/lines.mjs --stats                        # inventory: clip count, speech minutes, longest line, sample rates
```

For each pending line, call `generate_speech` with that line's `text`, its speaker's `voice_id`, and
`file_path` = the `file` field. Do it in **batches of ~8–10 parallel calls**, then rebuild and look, rather than
synthesising the whole episode blind: pacing problems found in the first chapter are fixed for free.

Speech that will not fit the line: split the line in the script (a `[beat 0.8]` between the halves), never edit the
text only in the WAV. Speech that came out wrong: delete that one clip and regenerate it — the id is stable, so
nothing else moves.

### 4. Build and listen

```bash
node lib/build.mjs                    # timeline + mix + master + cues + waveform
node lib/build.mjs --check            # same, but exit 1 on missing clips (use before declaring it done)
node lib/player.mjs                   # out/player.html: audio + chapters + synced transcript
node lib/poster.mjs                   # out/cover.png (3000×3000, drawn from the finished master)
node lib/export.mjs                   # out/episode.mp3 with chapter markers (needs ffmpeg)
```

`build.mjs` prints duration, speech share, pace in wpm, chapters, missing clips and any line far off the episode's
usual pace. Then **look at `out/check/waveform.png`**: one thumbnail per line, chapter marks in red. Check that every
line is audible (no flat gaps where a clip should be), that no line is clipped into the ceiling, and that the pauses
between chapters are visibly longer than the pauses inside a chapter.

Then listen — or have the user listen (`out/player.html`, or serve the folder with `python3 -m http.server`). Numbers
cannot tell you whether a pause lands well.

### 5. Deliver

Report: path to `out/master.wav` (and `out/episode.mp3`), duration, chapter count, speech share, and where the cover
is. Offer the player page for the final listen.

## The rules that matter most

1. **The script is the edit.** Never timeline audio by hand and never patch a clip to fix pacing; change the script
   or the pauses and rebuild. Everything downstream is derived and idempotent.
2. **One line, one clip, one idea.** If a line cannot be re-recorded without redoing its neighbours, it is too long.
   Lines over ~45 s are flagged by `--stats`.
3. **Speech leads the mix.** The bed sits under the voice at ~0.16 gain, ducked by the mastering, never loud enough
   to compete with consonants. If the bed is audible as a melody while someone is talking, it is too loud.
4. **Chapter beats are structural, not decorative.** A chapter break is 1.6 s of air plus a musical move; an
   in-paragraph pause is 0.55 s. Keep them distinguishable or the episode sounds continuously choppy.
5. **Ceiling, not loudness war.** The master peaks at −1.5 dBFS through a soft-knee limiter. Do not normalise each
   clip separately — voices recorded at different levels must be matched by the mix, not flattened.
6. **Deterministic.** The sting, tag, bed and cover are pure functions of the config (and of the audio, for the cover).
   Rebuilding an unchanged episode reproduces the same files byte for byte.

## Engines and gotchas

- **Clip format.** `build.mjs` accepts PCM/float WAV at any rate and any channel count (it averages to mono and
  resamples to `rate`). Anything else — MP3, AAC, Opus, M4A — must be converted first, which is what
  `lib/import-audio.mjs` does (`ffmpeg -ac 1 -ar 44100 -c:a pcm_s16le`). A clip that is not a WAV produces a clear
  error naming the file.
- **Ids are content-addressed.** `node lib/lines.mjs --id=<id>` prints that line's text. To find which clip belongs to
  which line, `out/timeline.json` carries `id`, `speaker`, `start`, `end` and the text of every segment.
- **Changing the script rewrites ids for edited lines only**, but adding a line shifts every later start time: always
  rebuild the mix after touching `script.md`. Stale clips are reported and ignored.
- **`podcast.config.json`** holds pacing (`gap`, `paragraphGap`, `beats`), the mix (`voiceGain`, `music.gain`), the
  master (`truePeakDb`, `ceiling`) and file locations. Change the episode, not the code.
- **Long episodes.** 30+ minutes are fine; the mix is a few seconds of Node. But synthesise in batches and rebuild
  between batches, or one bad assumption about voice pace will scale into 30 wrong minutes.
- **No ffmpeg?** `master.wav` is the deliverable; `export.mjs` says so and exits 0. The poster and player do not need it.
- **Poster palettes**: `mineral` (default), `risograph`, `night`. One palette per series, not per episode.

## Adapting

- **Interview from real audio.** Transcribe to lines, put the real clip under each line's id (converted to WAV), and
  let the build add chapters, sting, bed and mastering around it.
- **Scripted drama.** More speakers, more `[beat]`; keep one voice per character and put the beat *before* the line
  that needs air, not after.
- **Multi-episode series.** Same `voices.json`, same palette, same sting: only `script.md` and the episode id in
  `podcast.config.json` change. The cover dial then reads as a series.
- **Different music.** Replace `assets/music/bed.wav` with any loop; `lib/build.mjs` crossfades it to the episode
  length and fades it out at the end. Or set `music.enabled: false` and keep the voice bare.
