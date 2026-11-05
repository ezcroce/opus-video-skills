#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render.py — Mosè video renderer.
Usage:
  python3 render.py --frame 5.0 --out out/check/t.png        single frame (PNG)
  python3 render.py --sheet 0,9,18,36,60,90,115,135,150      contact sheet JPEG
  python3 render.py --strip 90:96                            every frame of a stretch
  python3 render.py --frames                                 render all frames to out/frames (parallel)
  python3 render.py --encode [--audio assets/narration.mp3]  encode out/frames -> out/video.mp4
"""

import os, sys, time, math
from multiprocessing import Pool

import core as C
from shots import SHOTS, DUR

FPS = 24
FRAMES_DIR = 'out/frames'

os.makedirs('out/check', exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs('assets', exist_ok=True)

def draw_world(t):
    C.set_t(t)
    C.begin_frame(C.PAL['paper'])
    # select shot
    sel = SHOTS[0]
    for i in range(len(SHOTS)):
        t0, fn = SHOTS[i]
        t1 = SHOTS[i + 1][0] if i + 1 < len(SHOTS) else DUR
        if t0 <= t < t1:
            sel = (t0, fn)
            break
    t0, fn = sel
    lt = t - t0
    fn(t, lt, t1 - t0)
    C.flush_glow()
    return C.get_frame()

def save_frame_img(img, path, q=90):
    C.IMG = img
    C.D = None
    out = C.composite(img)
    out.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)

def render_frame(t, path=None, q=90):
    img = draw_world(t)
    if path:
        save_frame_img(img, path, q)
    return img

def render_sheet(times, cols=3, w=640, out='out/check/sheet.jpg'):
    from PIL import Image
    rows = math.ceil(len(times) / cols)
    h = round(w * C.H / C.W)
    sheet = Image.new('RGB', (cols * w, rows * h), (255, 255, 255))
    ms = []
    for i, t in enumerate(times):
        t0 = time.time()
        img = draw_world(t)
        ms.append(round((time.time() - t0) * 1000))
        cell = img.resize((w, h))
        x = (i % cols) * w; y = (i // cols) * h
        sheet.paste(cell, (x, y))
    sheet.save(out, 'JPEG', quality=90)
    print('%s  (%d frames)  ms/frame: %s' % (out, len(times), ' '.join(str(m) for m in ms)))

def render_strip(a, b, cols=6, w=320, out='out/check/strip.jpg'):
    from PIL import Image
    n = int(round((b - a) * FPS)) + 1
    ts = [a + i / FPS for i in range(n)]
    rows = math.ceil(n / cols)
    h = round(w * C.H / C.W)
    strip = Image.new('RGB', (cols * w, rows * h), (255, 255, 255))
    ms = []
    for i, t in enumerate(ts):
        t0 = time.time()
        img = draw_world(t)
        ms.append(round((time.time() - t0) * 1000))
        cell = img.resize((w, h))
        x = (i % cols) * w; y = (i // cols) * h
        strip.paste(cell, (x, y))
    strip.save(out, 'JPEG', quality=90)
    print('%s  (%d frames)  ms/frame: %s' % (out, n, ' '.join(str(m) for m in ms)))

def _render_one(args):
    i, t = args
    path = '%s/f%05d.jpg' % (FRAMES_DIR, i)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return i
    img = draw_world(t)
    C.IMG = img
    C.D = None
    out = C.composite(img)
    out.convert('RGB').save(path, 'JPEG', quality=88, optimize=True)
    return i

def render_frames(workers=2):
    n = int(round(DUR * FPS))
    first = 0; last = n - 1
    todo = [i for i in range(first, last + 1)
            if not (os.path.exists('%s/f%05d.jpg' % (FRAMES_DIR, i)) and
                    os.path.getsize('%s/f%05d.jpg' % (FRAMES_DIR, i)) > 1000)]
    print('%d frames to render, %d workers' % (len(todo), workers))
    start = time.time()
    done = 0
    if workers > 1:
        with Pool(workers) as pool:
            for res in pool.imap_unordered(_render_one, [(i, i / FPS) for i in todo]):
                done += 1
                if done % 60 == 0 or done == len(todo):
                    el = time.time() - start
                    print('frame %d/%d  %.0f ms/frame eff  eta %d min'
                          % (done, len(todo), el / done * 1000,
                             (len(todo) - done) * el / done / 60))
    else:
        for i in todo:
            _render_one((i, i / FPS))
            done += 1
    print('done')

def encode(out='out/video.mp4', audio=None):
    import subprocess
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [FF, '-y', '-loglevel', 'error', '-stats',
           '-framerate', str(FPS), '-i', '%s/f%%05d.jpg' % FRAMES_DIR]
    if audio:
        cmd += ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest']
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', out]
    print('encoding ->', out)
    subprocess.run(cmd, check=True)
    print('wrote', out)

def main():
    argv = sys.argv[1:]
    if '--frame' in argv:
        t = float(argv[argv.index('--frame') + 1])
        path = argv[argv.index('--out') + 1] if '--out' in argv else 'out/check/frame.png'
        render_frame(t, path, q=92)
        print('wrote', path)
    elif '--sheet' in argv:
        times = [float(x) for x in argv[argv.index('--sheet') + 1].split(',')]
        out = argv[argv.index('--out') + 1] if '--out' in argv else 'out/check/sheet.jpg'
        cols = int(argv[argv.index('--cols') + 1]) if '--cols' in argv else 3
        w = int(argv[argv.index('--w') + 1]) if '--w' in argv else 640
        render_sheet(times, cols, w, out)
    elif '--strip' in argv:
        a, b = [float(x) for x in argv[argv.index('--strip') + 1].split(':')]
        out = argv[argv.index('--out') + 1] if '--out' in argv else 'out/check/strip.jpg'
        render_strip(a, b, out=out)
    elif '--frames' in argv:
        workers = int(argv[argv.index('--workers') + 1]) if '--workers' in argv else 2
        render_frames(workers)
    elif '--encode' in argv:
        out = argv[argv.index('--out') + 1] if '--out' in argv else 'out/video.mp4'
        audio = argv[argv.index('--audio') + 1] if '--audio' in argv else None
        encode(out, audio)
    else:
        print('usage: render.py --frame T [--out P] | --sheet T,T,... | --strip A:B | --frames [--workers N] | --encode [--audio AUDIO.mp3] [--out OUT.mp4]')

if __name__ == '__main__':
    main()
