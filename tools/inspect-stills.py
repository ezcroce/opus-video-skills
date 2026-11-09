#!/usr/bin/env python3
"""inspect-stills.py — measure the visual language of reference stills.

    python3 tools/inspect-stills.py <file-or-dir> [...]

Prints, per image: exact palette (quantised), the dominant colours with their
share, the number of distinct colours (a pixel-art still has very few), the
text-pixel density in the lower band, and the vertical colour bands detected in
the background — which is what tells you how the backdrop is built.
"""
import os
import subprocess
import sys
import collections

FFMPEG = os.environ.get("FFMPEG", os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), ".tools", "bin", "ffmpeg"))


def raw_rgb(path, w=160):
    r = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-i", path,
         "-vf", f"scale={w}:-2:flags=neighbor,format=rgb24", "-f", "rawvideo", "-"],
        capture_output=True)
    return r.stdout


def pixels(raw, w=160):
    rows = []
    for y in range(0, len(raw) // (w * 3)):
        row = []
        base = y * w * 3
        for x in range(w):
            i = base + x * 3
            row.append((raw[i], raw[i + 1], raw[i + 2]))
        rows.append(row)
    return rows


def hx(c):
    return "#%02x%02x%02x" % c


def analyse(path):
    raw = raw_rgb(path)
    if not raw:
        print(f"{path}: could not decode")
        return
    w = 160
    rows = pixels(raw, w)
    h = len(rows)
    flat = [p for row in rows for p in row]

    cnt = collections.Counter(flat)
    distinct = len(cnt)
    top = cnt.most_common(8)

    print(f"\n=== {os.path.basename(path)}")
    print(f"  grid {w}x{h}  distinct colours: {distinct}   (pixel art -> very low)")
    print("  palette:")
    for c, n in top:
        print(f"    {hx(c)}  {100*n/len(flat):5.1f}%")

    # vertical background bands: for each row, the modal colour of the left third
    # (the margin, usually free of sprites/text) and where it changes.
    band = [collections.Counter(row[:max(4, w // 3)]).most_common(1)[0][0] for row in rows]
    changes = []
    for y in range(1, h):
        if band[y] != band[y - 1]:
            changes.append((y, band[y - 1], band[y]))
    print(f"  background colour changes down the frame: {len(changes)}")
    for y, a, b in changes[:10]:
        print(f"    y={y:3d} ({100*y/h:5.1f}%)  {hx(a)} -> {hx(b)}")

    # text band: last 22% of the frame, measure how many pixels differ from the
    # most common colour there (a caption glyphs sitting on a flat plate)
    t0 = int(h * 0.78)
    bandpx = [p for row in rows[t0:] for p in row]
    bc = collections.Counter(bandpx).most_common(1)[0]
    ink = sum(n for c, n in collections.Counter(bandpx).items() if c != bc[0])
    print(f"  lower band ({100*t0/h:.0f}%-100%): base {hx(bc[0])}  ink pixels {100*ink/len(bandpx):.1f}%")

    # unique-ish colours that read as "glow" (saturated orange/amber) and "violet"
    def near(c, tgt, tol=44):
        return sum(abs(c[i] - tgt[i]) for i in range(3)) < tol
    amber = sum(n for c, n in cnt.items() if c[0] > 150 and c[1] > 70 and c[2] < 110)
    violet = sum(n for c, n in cnt.items() if c[0] > 90 and c[2] > 110 and c[1] < 110)
    print(f"  amber-ish {100*amber/len(flat):.1f}%   violet-ish {100*violet/len(flat):.1f}%")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    files = []
    for a in args:
        if os.path.isdir(a):
            files += [os.path.join(a, f) for f in sorted(os.listdir(a))
                      if f.lower().endswith((".png", ".jpg", ".jpeg"))]
        else:
            files.append(a)
    for f in files:
        analyse(f)


if __name__ == "__main__":
    main()
