#!/usr/bin/env bash
# new_project.sh — scaffold a pixel-reel project from the template.
#
#   bash new_project.sh <project-dir> [--keep-demo]
#
# Copies the template, unhooks the demo reel, runs npm install and checks that
# node / ffmpeg / Chrome are available.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$HERE/.." && pwd)"
TEMPLATE="$SKILL_DIR/template"
# the repo's sandbox toolchain, if this skill lives inside the repo
TOOLS_DIR="$(cd "$SKILL_DIR/../.." && pwd)/.tools"

KEEP_DEMO=0
DIR=""
for arg in "$@"; do
  case "$arg" in
    --keep-demo) KEEP_DEMO=1 ;;
    *) DIR="$arg" ;;
  esac
done

if [ -z "$DIR" ]; then
  echo "usage: new_project.sh <project-dir> [--keep-demo]" >&2
  exit 1
fi

mkdir -p "$DIR"
DIR="$(cd "$DIR" && pwd)"

# copy the template, without the build output
cp -R "$TEMPLATE/." "$DIR/"
rm -rf "$DIR/out" "$DIR/node_modules" "$DIR/assets/score.wav" "$DIR/assets/score.m4a"

if [ "$KEEP_DEMO" -eq 0 ]; then
  # the demo reel IS the template's example; a new project starts from an
  # empty timeline, so the shots render a bare underground
  cat > "$DIR/src/cues.js" <<'EOF'
// cues.js — the timeline.
//
// S     : the shots, in order: { t: start time in seconds, name: scene key }
// dur   : total length in seconds
// hits  : the beats that matter (times in seconds)
// bpm   : the tempo the score is written at
//
// Write your shot list here, then build the matching shot functions in
// src/shots.js and register them in SCENES.

window.CUES = {
  dur: 8.0,
  bpm: 96,

  S: [
    { t: 0.0, name: 'ambition' },
    { t: 4.0, name: 'pursuit'  },
  ],

  hits: [0.0, 4.0],
};
EOF
fi

cd "$DIR"

echo "==> checking the toolchain"
command -v node >/dev/null && echo "    node    $(node -v)" || { echo "    node    MISSING"; exit 1; }
if command -v ffmpeg >/dev/null; then
  echo "    ffmpeg  $(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-3)"
else
  echo "    ffmpeg  MISSING (needed for the encode)"
fi
if command -v google-chrome >/dev/null; then
  echo "    chrome  $(google-chrome --version 2>/dev/null)"
elif command -v chromium >/dev/null; then
  echo "    chrome  $(chromium --version 2>/dev/null)"
else
  echo "    chrome  not on PATH — render.mjs also looks in ~/.cache/ms-playwright"
  echo "            and in the repo's .tools/bin; otherwise pass --chrome=<path>"
fi

echo "==> npm install"
npm install --silent --no-audit --no-fund

# If Chrome is not on the PATH, record where it was found so render.mjs can
# find it without --chrome. (The sandbox toolchain lives in the repo's
# .tools/bin, which is outside this project.)
CHROME_FOUND=""
for c in "${CHROME_PATH:-}" google-chrome chromium chromium-browser \
         "$TOOLS_DIR/bin/chromium"; do
  [ -n "$c" ] && [ -x "$c" ] && { CHROME_FOUND="$c"; break; }
done
if [ -n "$CHROME_FOUND" ]; then
  printf 'CHROME_PATH=%s\n' "$CHROME_FOUND" > "$DIR/.env"
  echo "    chrome  $CHROME_FOUND (recorded in .env)"
fi

cat <<EOF

Ready. In $DIR:

  node render.mjs --sheet=1,5 --cols=2 --w=360 --out=out/check/sheet.jpg   # look at it
  node music/score.mjs                                                     # the score
  node render.mjs --frames --workers=4                                     # the frames
  node render.mjs --encode --audio=assets/score.m4a --out=out/reel.mp4     # the video

Edit src/cues.js (the timeline) and src/shots.js (the shots) first.
EOF
