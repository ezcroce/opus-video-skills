#!/usr/bin/env bash
# Rebuilds the local render toolchain (ffmpeg + Chromium) used to verify videos in this sandbox.
# The sandbox blocks Google/Instagram/GitHub-release-asset hosts, so both binaries are fetched
# from hosts that are reachable: PyPI (imageio-ffmpeg bundles a static ffmpeg) and the npm
# registry (@sparticuz/chromium ships a Chromium tarball plus its shared libraries).
#
#   bash .tools/setup.sh
#
# Afterwards:
#   export PATH="$PWD/.tools/bin:$PATH"
#   export LD_LIBRARY_PATH="$PWD/.tools/lib:${LD_LIBRARY_PATH:-}"
#   .tools/bin/ffmpeg -version
#   tools/setup-toolchain.sh   # then: export PATH="$PWD/.tools/bin:$PATH"
set -euo pipefail

TOOLS_DIR="${TOOLS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../.tools}"
BIN="$TOOLS_DIR/bin"
LIB="$TOOLS_DIR/lib"
VENV="$TOOLS_DIR/venv"
mkdir -p "$BIN" "$LIB"

# ---- ffmpeg (static build from the PyPI wheel) -------------------------------------------
if [ ! -x "$BIN/ffmpeg" ]; then
  echo "==> fetching ffmpeg via pip"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --upgrade pip imageio-ffmpeg
  cp "$("$VENV/bin/python" -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')" "$BIN/ffmpeg"
  chmod +x "$BIN/ffmpeg"
fi

# ---- Chromium (npm tarball) ---------------------------------------------------------------
if [ ! -x "$BIN/chromium" ]; then
  echo "==> fetching Chromium via npm"
  WORK="$TOOLS_DIR/.npmwork"
  mkdir -p "$WORK"
  (cd "$WORK" && npm install --silent --no-audit --no-fund @sparticuz/chromium@153.0.0)
  node -e '
    const fs = require("fs"), zlib = require("zlib");
    const d = process.argv[1];
    const rd = n => zlib.brotliDecompressSync(fs.readFileSync(`${d}/node_modules/@sparticuz/chromium/bin/${n}`));
    fs.writeFileSync(`${d}/chromium.bin`, rd("chromium.br"));
    fs.writeFileSync(`${d}/chromium.tar`, rd("al2023.tar.br"));
  ' "$WORK"
  tar xf "$WORK/chromium.tar" -C "$WORK"
  cp "$WORK"/lib/*.so* "$LIB/" 2>/dev/null || true
  cp "$WORK/chromium.bin" "$BIN/chromium"
  chmod +x "$BIN/chromium"
  rm -rf "$WORK/chromium.tar"
fi

echo "==> toolchain ready"
"$BIN/ffmpeg" -version 2>&1 | head -1
LD_LIBRARY_PATH="$LIB" "$BIN/chromium" --version
