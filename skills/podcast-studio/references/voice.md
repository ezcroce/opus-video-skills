# Voices and clips

## Casting

`voices.json` maps a script speaker to a voice id:

```json
{ "HOST": "voice-00", "GUEST": "voice-01" }
```

Voice ids come from a registered voice (`add_voice` in this session), from a user's own TTS account, or from whatever
the user already rendered. The id is opaque to `build.mjs`; it only ever appears in `lib/lines.mjs` output and in the
review page.

When auditioning a voice, read about 15 seconds of the episode's own opening lines. That doubles as a pacing preview:
if the voice reads 30% slower than you assumed, you will hear it before you have synthesised 200 lines.

Two speakers must be distinguishable at low volume, in a car, on a phone speaker. Same gender is fine if the two
differ in age, pace or accent — but if the episode is mostly dialogue, contrast matters more than either voice alone.

## Synthesising with `generate_speech`

- One call per line, `file_path` = the `file` field from `node lib/lines.mjs --json`, which is
  `assets/voice/<id>.wav`. The WAV extension matters: the build reads WAV only.
- `text` is exactly the line's text, with no speaker name, no stage directions, no quotation marks added.
- Batch 8–10 calls in parallel, then `node lib/build.mjs` and look at the waveform. Long episodes: batch, build,
  continue.
- If the voice was auditioned in one language and the script is in another, pass `language` on the call; if the voice
  cannot speak it, the call fails and you cast again — do not transliterate the script to fit the voice.

## Clips that do not come from `generate_speech`

ElevenLabs, a human recording, or an existing interview: use the importer rather than hand-writing filenames.

```bash
node lib/import-audio.mjs --plan                                                  # ids + text, from the script
node lib/import-audio.mjs assets/take.wav --id=<line-id>                          # a WAV, copied as-is
node lib/import-audio.mjs assets/episode.mp3 --id=<line-id>                       # converted (needs ffmpeg)
node lib/import-audio.mjs assets/episode.mp3 --at=12.4:25.9 --id=<line-id>         # one slice
node lib/import-audio.mjs assets/episode.mp3 --split=<id>=0:12.4,<id>=12.4:26.9    # several slices, one pass
```

The importer validates each id against the script, converts to mono 44.1 kHz 16-bit PCM, and prints the duration, peak
and RMS of every clip it writes — an almost-silent slice means the timecodes are wrong. The raw ffmpeg equivalent, if
you ever need it by hand:

```bash
ffmpeg -i in.mp3 -ac 1 -ar 44100 -c:a pcm_s16le assets/voice/<id>.wav
```

Rules:

1. **One file per script line.** If a recording covers several lines, split it (audacity, `ffmpeg -ss/-t`) so each line
   has its own clip; the timeline is built line by line, and one long file cannot be re-timed without moving everything
   after it.
2. **Read the id from the plan, never invent it.** `node lib/lines.mjs --json` lists `id` and `file` for every line,
   pending or not (`--all`). A file whose name does not match an id is reported as stale and ignored.
3. **Trim the silence.** Keep ~100 ms at the head and ~150 ms at the tail — the build adds the pauses, so leading
   silence gets added twice.
4. **Same voice, whole episode.** If one line of an interview is re-recorded later, match the room: same microphone
   distance, same noise floor. A clean clip among roomy ones is more distracting than a slightly bad line.

## Re-recording

- **One line**: delete `assets/voice/<id>.wav`, regenerate, rebuild. Nothing else changes; the timeline re-times itself.
- **Edited text**: the id changes by design. The old clip is reported as stale; the new line is reported as missing.
  Delete the stale file so `--stats` stays honest.
- **Changed pace**: if a speaker now reads 20% faster, do not re-record — check the pacing numbers `build.mjs` prints
  (`pace` line, wpm) and adjust `gap`/`paragraphGap` first. Only re-record if a specific line is the outlier, which the
  `pace` warnings name by file and line number.

## Which voice says what

In `script.md` the speaker is the casting key; the voice is the performance. If a script needs a third voice for one
line (a clip, a reading, a caller), add the speaker to `voices.json` and cast it — do not reuse an existing voice and
ask the listener to infer the change from the text.

## Cost awareness

Speech is the only metered part of this pipeline. A 20-minute episode is ~250–350 lines. Before synthesising a whole
episode, synthesise the cold open and the first chapter, build, and listen. Script problems found there cost nothing;
found after the full pass, they cost the whole pass again.
