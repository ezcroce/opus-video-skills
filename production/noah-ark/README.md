# Noè e l'Arca — production pack

Production pack built from the storyboard "NOÈ – L'UOMO CHE ASCOLTÒ DIO" using the `ai-media-generator` skill.

## Files

| File | Purpose |
|---|---|
| `README.md` | Platform choice, timing check, workflow, costs |
| `cut-3min.md` | Three-minute cut: which scenes and shots to keep, and the trade-offs |
| `prompts.md` | Character bible, style line, and 32 shot prompts (≤15 s each) for Kling 3.0, plus narration lines |
| `reference/noah-character-sheet.png` | Character reference for Noè (use as a Kling Element, plus one image per family member) |
| `audio/narration-*.mp3` | Ten Italian narration clips, one per scene, in the narrator voice `voice-00` |

## Platform choice: Kling 3.0

From `references/selector.md` and `references/kling.md`:

- Multi-shot sequences in one generation (up to 6 cuts), so scenes keep their continuity.
- Native audio with dialogue, for Noè's and God's lines and the sound effects (rain, thunder, water, animals).
- Element references (1–4 images) to lock Noè's look across shots.
- Clips of 3–15 s.

Alternative: **Veo 3.1** (strongest native audio, but no multi-reference character lock, so Noè may drift more between shots).

## Timing check

The storyboard's scene durations add up to **435 s (7 min 15 s)**, not the 2–3 minutes in its header.

- **Full story (~7 min):** 32 shots in `prompts.md`.
- **3-minute cut (175 s):** scenes 1, 3, 8 and 10 only, 14 shots. See `cut-3min.md`.

## Workflow

1. **Character sheet first.** Generate one reference image of Noè (full body, front view, neutral expression) and one of his family. Use them as Kling "Elements" for every shot. This matters more than any other step for consistency.
2. **Test one shot.** Run Scene 2, Shot 1 at 720p without audio to check the look before spending credits. The skill's kling notes say drafts at 720p without audio are the cheapest way to test.
3. **Generate shots in order.** Paste each shot's prompt, attach the Elements, set the duration, and use native audio for dialogue shots.
4. **Narration separately.** Kling's built-in voice may not sound like one consistent narrator across shots. For the voiceover, register one deep male voice with `add_voice` and generate the narration lines (in the "Narration" section of `prompts.md`) with `generate_speech`. Then mix them over the picture in ffmpeg or any editor.
5. **Music.** Orchestral score, one track per act, mixed at low volume under narration.
6. **Review.** Check each shot for face and beard drift, extra limbs, and text artifacts. Regenerate only the bad shot, not the whole scene.

## Costs (approximate)

Kling bills per second of output, and native audio costs more. Budget roughly 435 s of generation for the full cut, plus re-takes. Check current prices on the Kling site before you start. I haven't verified them here.

## Notes

- The storyboard's reference images link to other websites. I didn't use them, because they belong to other creators and aren't licensed for this project.
- Dialogue is in Italian, in quotation marks. Keep Kling dialogue lines to 3–5 seconds each. Longer lines drift out of sync, according to `references/kling.md`.
- The on-screen quote is Genesis 9:13. Check the wording against your Bible translation before publishing.

## Assembling the MP4

When the Kling clips are ready, put them in the folders below and run the script. It needs ffmpeg.

```
production/noah-ark/
├── clips/        1.1.mp4 1.2.mp4 1.3.mp4 3.1.mp4 … 10.4.mp4   (14 shots, with audio)
├── audio/        narration-*.mp3                               (already here)
└── music/        score.mp3                                     (optional background score)
```

```bash
bash production/noah-ark/scripts/assemble-3min.sh
```

The output is `out/noah-ark-3min.mp4` (1920×1080, 24 fps, H.264 and AAC). `out/` is git-ignored, so the finished video stays out of the repository.

- Each scene's narration starts at that scene's real start time, so it stays in sync even if a shot is longer or shorter than planned.
- Each clip needs an audio track. Kling clips generated with native audio have one. For a silent clip, add a silent track first.
- To use ffmpeg from a different location, set `FFMPEG=/path/to/ffmpeg`.
