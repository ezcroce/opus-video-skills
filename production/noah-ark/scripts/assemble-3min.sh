#!/usr/bin/env bash
# Assemble the 3-minute cut of "Noè e l'Arca" from generated shot clips.
#
# Expected inputs (CLIPS_DIR defaults to ../clips):
#   clips/1.1.mp4 ... clips/10.4.mp4   14 shots, in the order listed below
#     Each clip must have an audio track (Kling native audio is fine;
#     silent clips should get a silent track before running this).
#   audio/narration-01-scena1.mp3, narration-08-scena8.mp3,
#   audio/narration-10-scena10.mp3     narration, placed at each scene start
#   music/score.mp3                    optional background score (looped, low volume)
#
# Output: out/noah-ark-3min.mp4 (out/ is git-ignored)
#
# Requires ffmpeg. Set FFMPEG to override the binary.

set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
CLIPS_DIR="${CLIPS_DIR:-$HERE/clips}"
AUDIO_DIR="${AUDIO_DIR:-$HERE/audio}"
MUSIC="${MUSIC:-$HERE/music/score.mp3}"
OUT="${OUT:-$HERE/out/noah-ark-3min.mp4}"
FFMPEG="${FFMPEG:-ffmpeg}"

SHOTS=(1.1 1.2 1.3 3.1 3.2 3.3 8.1 8.2 8.3 8.4 10.1 10.2 10.3 10.4)
# Narration clip and the shot index where its scene starts.
NARR_FILES=(narration-01-scena1.mp3 narration-08-scena8.mp3 narration-10-scena10.mp3)
NARR_START_SHOT=(0 6 10)

die() { echo "error: $*" >&2; exit 1; }

command -v "$FFMPEG" >/dev/null || die "ffmpeg not found"

inputs=()
for s in "${SHOTS[@]}"; do
  f="$CLIPS_DIR/$s.mp4"
  [[ -f "$f" ]] || die "missing clip: $f"
  inputs+=(-i "$f")
done

# Real clip lengths decide where each scene starts, so narration stays in sync
# even when a generated shot runs longer or shorter than planned.
# Read a clip's duration (seconds) from ffmpeg's banner, so no ffprobe is needed.
clip_duration() {
  # ffmpeg exits 1 when given no output file, so ignore its status here.
  { "$FFMPEG" -hide_banner -i "$1" 2>&1 || true; } \
    | awk -F'[:, ]+' '/Duration:/{d=$3*3600+$4*60+$5} END{printf "%.3f", d}'
}

durations=()
for s in "${SHOTS[@]}"; do
  d=$(clip_duration "$CLIPS_DIR/$s.mp4")
  durations+=("$d")
done

scene_start() {  # seconds from the start of the cut to shot index $1
  local idx=$1 t=0 i
  for ((i = 0; i < idx; i++)); do
    t=$(awk -v a="$t" -v b="${durations[$i]}" 'BEGIN{printf "%.3f", a+b}')
  done
  echo "$t"
}

# Build the filter graph: normalise every shot, then concat.
filter=""
concat_inputs=""
n=${#SHOTS[@]}
for ((i = 0; i < n; i++)); do
  filter+="[$i:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v$i];"
  filter+="[$i:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a$i];"
  concat_inputs+="[v$i][a$i]"
done
filter+="${concat_inputs}concat=n=$n:v=1:a=1[vout][amain];"

# Narration inputs follow the shot inputs.
next_input=$n
narr_labels=""
narr_count=0
for ((k = 0; k < ${#NARR_FILES[@]}; k++)); do
  f="$AUDIO_DIR/${NARR_FILES[$k]}"
  [[ -f "$f" ]] || { echo "warning: skipping missing narration $f" >&2; continue; }
  inputs+=(-i "$f")
  start=$(scene_start "${NARR_START_SHOT[$k]}")
  ms=$(awk -v s="$start" 'BEGIN{printf "%d", s*1000}')
  filter+="[$next_input:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${ms}|${ms},volume=1.6[n$k];"
  narr_labels+="[n$k]"
  next_input=$((next_input + 1))
  narr_count=$((narr_count + 1))
done

mix_inputs="[amain]"
if [[ $narr_count -gt 0 ]]; then
  mix_inputs+="$narr_labels"
fi
mix_count=$((1 + narr_count))

# Optional music bed, looped and ducked under the mix.
if [[ -f "$MUSIC" ]]; then
  inputs+=(-stream_loop -1 -i "$MUSIC")
  filter+="[$next_input:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.18[music];"
  mix_inputs+="[music]"
  mix_count=$((mix_count + 1))
fi

filter+="${mix_inputs}amix=inputs=${mix_count}:duration=first:dropout_transition=0:normalize=0[aout]"

mkdir -p "$(dirname "$OUT")"
"$FFMPEG" -y -hide_banner -loglevel error "${inputs[@]}" \
  -filter_complex "$filter" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  "$OUT"

echo "wrote $OUT"
