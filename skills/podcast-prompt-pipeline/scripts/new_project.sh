#!/usr/bin/env bash
# new_project.sh <target-dir>
# Scaffolds a podcast project from the skill's template and checks the toolchain.
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:?usage: new_project.sh <target-dir>}"

if [ -e "$TARGET/script.md" ]; then echo "error: $TARGET already has a script.md; not overwriting" >&2; exit 1; fi
mkdir -p "$TARGET"
rsync -a "$SKILL_DIR/template/" "$TARGET/" 2>/dev/null || cp -R "$SKILL_DIR/template/." "$TARGET/"
mkdir -p "$TARGET/segments" "$TARGET/out" "$TARGET/music"

# A new project starts with the template's placeholder slug, not the example's.
SLUG="$(basename "$TARGET" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
sed -i.bak "s/^slug: .*/slug: ${SLUG}/" "$TARGET/script.md" && rm -f "$TARGET/script.md.bak"

echo "== toolchain"
command -v node   >/dev/null && echo "node     $(node -v)"        || echo "MISSING: node"
command -v ffmpeg >/dev/null && echo "ffmpeg   $(ffmpeg -version | head -1 | cut -d' ' -f3)" || echo "MISSING: ffmpeg"
if [ -n "${ELEVENLABS_API_KEY:-}" ]; then echo "elevenlabs key set"
elif [ -n "${OPENAI_API_KEY:-}" ];   then echo "openai key set"
elif command -v say >/dev/null;      then echo "offline fallback: macOS say (robotic, fine for timing)"
elif command -v espeak-ng >/dev/null;then echo "offline fallback: espeak-ng (robotic, fine for timing)"
else echo "no TTS provider configured — use 'node tts.mjs --manifest' and synthesize elsewhere"; fi

echo "== next: fill brief.md, write script.md, then"
echo "   cd $TARGET && node check_script.mjs && node tts.mjs && node assemble.mjs --sting"
echo "== ready: $TARGET"
