#!/usr/bin/env bash
# new_project.sh <target-dir> [--keep-demo]
# Scaffolds a podcast-studio episode from the skill's template: script skeleton, voices.json, config, audio dirs.
# No npm install: the engine is dependency-free (Node 18+ only, no ffmpeg required for the audio master).
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:?usage: new_project.sh <target-dir> [--keep-demo]}"
KEEP_DEMO="${2:-}"

if [ -e "$TARGET/script.md" ]; then echo "error: $TARGET already has a script.md; not overwriting" >&2; exit 1; fi
mkdir -p "$TARGET"
cp -R "$SKILL_DIR/template/." "$TARGET/"
mkdir -p "$TARGET/assets/voice" "$TARGET/assets/music" "$TARGET/assets/stingers" "$TARGET/out/check"

if [ "$KEEP_DEMO" != "--keep-demo" ]; then
  cat > "$TARGET/script.md" <<'MD'
---
episode: ep-01
title: Episode title
language: en
---

## Cold open

HOST: Write the opening line here. One thought per line: the line is the unit of revision.

GUEST: Answer, disagree, add something the host did not expect.

[beat 1.5]

## First chapter

HOST: A question that moves the episode forward.
MD
  cat > "$TARGET/voices.json" <<'JSON'
{
  "HOST": "voice-00",
  "GUEST": "voice-01"
}
JSON
fi

cd "$TARGET"
echo "== synthesising sting, tag and music bed (pure code, deterministic)"
node lib/synth.mjs --kind=sting --out=assets/stingers/sting.wav
node lib/synth.mjs --kind=tag   --out=assets/stingers/tag.wav
node lib/synth.mjs --kind=bed --bpm=$(node -e "const c=require('./podcast.config.json');console.log(c.music?.bpm||100)") --out=assets/music/bed.wav

echo "== toolchain"
command -v node >/dev/null && echo "node   $(node -v)" || echo "MISSING: node 18+"
if command -v ffmpeg >/dev/null; then echo "ffmpeg ok (MP3/AAC export available)"; else echo "note: ffmpeg not found — WAV master works, MP3 export will be skipped"; fi
echo "== ready: $TARGET"
echo "   next: node lib/lines.mjs      (what needs a voice)"
