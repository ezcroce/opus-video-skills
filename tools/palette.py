#!/usr/bin/env python3
"""palette.py — extract the exact working palette from reference stills.

    python3 tools/palette.py <image> [more images...]

Because the reference screenshots are photos of a screen, every region carries
resampling noise. This script therefore:
  * reads the image at native resolution through ffmpeg (no colour conversion),
  * clusters the colours in a quantised space and reports the largest flat
    clusters, which are the artist's actual palette entries,
  * reports them in hex, as RGB and as HSL, so a palette can be typed straight
    into a skill.
"""
import os
import subprocess
import sys
import collections
import colorsys

FFMPEG = os.environ.get("FFMPEG", os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), ".tools", "bin", "ffmpeg"))


def read_rgb(path):
    r = subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-i", path,
         "-vf", "format=rgb24", "-f", "rawvideo", "-"], capture_output=True)
    return r.stdout


def hexof(c):
    return "#%02x%02x%02x" % c


def describe(c):
    r, g, b = [v / 255 for v in c]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return f"rgb({c[0]:3d},{c[1]:3d},{c[2]:3d})  hsl({int(h*360):3d}° {int(s*100):2d}% {int(l*100):2d}%)"


def main():
    for path in sys.argv[1:]:
        raw = read_rgb(path)
        if not raw:
            print(f"{path}: decode failed")
            continue
        px = [tuple(raw[i:i + 3]) for i in range(0, len(raw) - 2, 3)]
        print(f"\n=== {os.path.basename(path)}  ({len(px)} px)")
        # quantise to a 6-level grid (the artist's ramps are small) and count
        q = collections.Counter((p[0] // 8 * 8, p[1] // 8 * 8, p[2] // 8 * 8) for p in px)
        print("  dominant colour buckets (8-step quantised):")
        for c, n in q.most_common(12):
            print(f"    {hexof(c)}  {100*n/len(px):5.2f}%   {describe(c)}")
        # pure-ish flats: colours with many near-identical neighbours
        flat = collections.Counter(p for p in px)
        print("  exact repeated colours (top 10):")
        for c, n in flat.most_common(10):
            print(f"    {hexof(c)}  x{n:<6d} {describe(c)}")


if __name__ == "__main__":
    main()
