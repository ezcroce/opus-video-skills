#!/usr/bin/env bash
# analyze.sh — dissect a reference video into the measurements a style skill needs.
#
#   bash .tools/analyze.sh <video-file> [out-dir]
#
# Produces, under <out-dir> (default: out/analysis):
#   meta.json          duration, fps, resolution, streams
#   sheet.jpg          contact sheet of the whole clip (up to 24 frames)
#   frames/f%05d.jpg   extracted key frames (1 per second, capped)
#   palette.txt        dominant colours per key frame
#   motion.txt         per-second mean absolute frame difference (a cut is a spike)
#   cuts.txt           detected shot boundaries (timestamps)
#   audio.txt          loudness / peak info from ffmpeg's ebur128
#
# All of it is plain ffmpeg + Python; no extra deps beyond the toolchain in .tools/bin.
set -euo pipefail

TOOLS_DIR="${TOOLS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.tools" && pwd)}"
FFMPEG="$TOOLS_DIR/bin/ffmpeg"
FFPROBE="$TOOLS_DIR/bin/ffprobe"
[ -x "$FFPROBE" ] || FFPROBE="$(command -v ffprobe || true)"

VIDEO="${1:?usage: analyze.sh <video-file> [out-dir]}"
OUT="${2:-out/analysis}"
mkdir -p "$OUT/frames"

echo "==> probing $VIDEO"
"$FFMPEG" -hide_banner -i "$VIDEO" 2> "$OUT/probe.txt" || true
grep -E "Duration|Stream #" "$OUT/probe.txt" || true

DUR=$(sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' "$OUT/probe.txt" | head -1)
RES=$(awk '/Stream #.*Video:/{ s=$0; sub(/^.*Video: [^,]*, */,"",s); if (match(s,/[0-9]+x[0-9]+/)) { print substr(s,RSTART,RLENGTH); exit } }' "$OUT/probe.txt")
W=${RES%x*}; H=${RES#*x}
FPS=$(awk '/Stream #.*Video:/{for(i=1;i<=NF;i++) if($i ~ /fps$/){gsub(/fps/,"",$(i-1)); print $(i-1); exit}}' "$OUT/probe.txt")
[ -z "$FPS" ] && FPS=30

echo "==> duration ${DUR}  ${W}x${H}  ${FPS}fps"

# ---- key frames: one per second (capped at 60) --------------------------------------------
CAP=60
STEP=$(python3 - "$DUR" "$CAP" <<'PY'
import sys
dur = 0.0
for p in sys.argv[1].split(':'):
    dur = dur * 60 + float(p)
print(max(1, int(dur / 60)) if dur else 1)
PY
)
"$FFMPEG" -y -hide_banner -loglevel error -i "$VIDEO" -vf "fps=1/$STEP,scale=480:-2" -q:v 3 "$OUT/frames/f%05d.jpg"

# ---- contact sheet: up to 24 evenly spaced frames ------------------------------------------
NSH=$(python3 - "$DUR" "$FPS" <<'PY'
import sys
dur = 0.0
for p in sys.argv[1].split(':'):
    dur = dur * 60 + float(p)
fps = float(sys.argv[2] or 30)
total = max(1, int(dur * fps))
print(max(1, total // 24))          # take every Nth frame
PY
)
COLS=6
ROWS=$(python3 -c "import math;print(max(1,math.ceil(24/$COLS)))")
"$FFMPEG" -y -hide_banner -loglevel error -i "$VIDEO" -vf \
  "select='not(mod(n\,$NSH))',scale=320:-2,tile=${COLS}x${ROWS}:padding=4:color=0x222222" \
  -frames:v 1 "$OUT/sheet.jpg" 2>/dev/null || true

# ---- per-frame difference → motion curve + cut list -----------------------------------------
# metadata=print emits its lines at ffmpeg's "info" level, so the log level must not be error.
"$FFMPEG" -y -hide_banner -loglevel info -i "$VIDEO" -vf \
  "scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG" \
  -f null - > "$OUT/sig.log" 2>&1 || true
grep -oE 'YAVG=[0-9.]+' "$OUT/sig.log" | cut -d= -f2 > "$OUT/diff.txt" || true

python3 - "$OUT" "$FPS" <<'PY'
import sys, os, json
out, fps = sys.argv[1], float(sys.argv[2] or 30)
diffs = []
p = os.path.join(out, 'diff.txt')
if os.path.exists(p):
    diffs = [float(x) for x in open(p).read().split()]
if not diffs:
    open(os.path.join(out, 'motion.txt'), 'w').write('no diff data\n')
    open(os.path.join(out, 'cuts.txt'), 'w').write('')
else:
    # a cut shows up as a large spike relative to the local baseline
    thr = max(8.0, (sum(diffs)/len(diffs)) * 3.0)
    cuts, prev = [], False
    for i, d in enumerate(diffs):
        spike = d > thr
        if spike and not prev:
            cuts.append(i / fps)
        prev = spike
    open(os.path.join(out, 'motion.txt'), 'w').write(
        '\n'.join(f'{i/fps:7.2f}s  {"#"*int(min(60, d))} {d:.2f}' for i, d in enumerate(diffs)))
    open(os.path.join(out, 'cuts.txt'), 'w').write('\n'.join(f'{c:.2f}' for c in cuts))
    print(f'--> {len(cuts)} shot boundaries detected')
PY

# ---- palette --------------------------------------------------------------------------------
python3 - "$OUT/frames" "$FFMPEG" <<'PY'
import sys, os, subprocess, collections
d, ff = sys.argv[1], sys.argv[2]
out = []
for name in sorted(os.listdir(d)):
    if not name.endswith('.jpg'):
        continue
    p = os.path.join(d, name)
    try:
        r = subprocess.run([ff, '-hide_banner', '-loglevel', 'error', '-i', p, '-vf',
                            'scale=32:32,format=rgb24', '-f', 'rawvideo', '-'],
                           capture_output=True)
        raw = r.stdout
        cnt = collections.Counter()
        for i in range(0, len(raw) - 2, 3):
            cnt[(raw[i]//24*24, raw[i+1]//24*24, raw[i+2]//24*24)] += 1
        top = cnt.most_common(6)
        out.append((name, ['#%02x%02x%02x' % c for c, _ in top]))
    except Exception as e:
        out.append((name, ['error: %s' % e]))
with open(os.path.join(os.path.dirname(d), 'palette.txt'), 'w') as f:
    for name, cols in out:
        f.write(f'{name}  {" ".join(cols)}\n')
PY

# ---- loudness -------------------------------------------------------------------------------
"$FFMPEG" -hide_banner -i "$VIDEO" -af ebur128=peak=true -f null - 2> "$OUT/audio.txt" || true
grep -E "^\s+(I|LRA|Peak):" "$OUT/audio.txt" | tail -3 | sed 's/^/  /' > "$OUT/loudness.txt" || true

echo "==> wrote $OUT (sheet.jpg, frames/, palette.txt, motion.txt, cuts.txt, loudness.txt)"
