#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shots.py — the seven shots of the Mosè video.
Each shot fn(t, lt, dur) paints the WHOLE frame (background included) as a pure function of t.
"""

import math
import math
import core as C
from figures import human, feel, emotions, crowd, STYLES, emote
from core import jump, take, stroll, arcPt, spring

# shot boundaries (seconds) — total 150 s
B = [0, 18, 36, 60, 90, 115, 135, 150]
DUR = 150.0

# ---------------- backgrounds ----------------

def sky_night(t):
    """Night sky: deep indigo at zenith, lighter toward horizon."""
    C.paint(C.rectPts(-200, -200, C.W + 400, 600), {'fill': C.PAL['night'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 400, C.W + 400, 700), {'fill': C.PAL['indigo'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 700, C.W + 400, C.H + 200), {'fill': '#0E1028', 'fillOp': 255, 'ink': None})
    # stars
    for i in range(30):
        C.boilSeed('star %d' % i)
        sx = C.hashv(i) * C.W
        sy = C.hashv(i + 100) * 450
        r = 1.5 + C.hashv(i + 200) * 2.5
        al = 0.5 + 0.5 * math.sin(C._T * 2 + i)
        C.paint(C.ellPts(sx, sy, r, r, 10), {'wash': C.PAL['cream'], 'washOp': 200 * al, 'ink': None})
    # haze near the horizon
    C.paint(C.rectPts(-200, 520, C.W + 400, 200), {'fill': '#2A2B4E', 'fillOp': 120, 'ink': None})

def sky_desert(t):
    C.paint(C.rectPts(-200, -200, C.W + 400, 500), {'fill': C.PAL['sky'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 400, C.W + 400, 700), {'fill': C.hex2('#BFE3F5'), 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 600, C.W + 400, C.H + 200), {'fill': C.hex2('#9CCCEE'), 'fillOp': 255, 'ink': None})
    C.boilSeed('sun')
    C.glow(960, 180, 200, '#FFE29C', 0.5)
    C.paint(C.ellPts(960, 180, 70, 70, 24), {'wash': '#FFF3C4', 'washOp': 255, 'ink': None})

def ground_sand(y0=880):
    C.paint(C.rectPts(-200, y0, C.W + 400, C.H + 200 - y0), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
    for i in range(0, C.W + 400, 140):
        C.boilSeed('dune %d' % i)
        rx = -200 + i + C.hashv(i) * 40
        C.paint(C.ellPts(rx, y0 + 60, 220 + C.hashv(i + 50) * 120, 60, 14),
                {'fill': C.PAL['sandDk'], 'fillOp': 90, 'ink': None})

def ground_desert(y0=900):
    C.paint(C.rectPts(-200, y0, C.W + 400, C.H + 200 - y0), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
    for i in range(0, C.W + 400, 150):
        C.boilSeed('dune %d' % i)
        rx = -200 + i + C.hashv(i) * 30
        C.paint(C.ellPts(rx, y0 + 40, 260 + C.hashv(i + 50) * 100, 50, 12),
                {'fill': C.PAL['sandDk'], 'fillOp': 80, 'ink': None})

def nile(y0=1000):
    """The river: broad water band, lighter near the far bank, dark near shore."""
    C.paint(C.rectPts(-200, y0 - 420, C.W + 400, 420), {'fill': C.PAL['nile'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, y0 - 420, C.W + 400, 90), {'fill': '#2C6076', 'fillOp': 200, 'ink': None})
    C.paint(C.rectPts(-200, y0 - 120, C.W + 400, 120), {'fill': '#194253', 'fillOp': 130, 'ink': None})
    # ripples
    for i in range(18):
        C.boilSeed('ripple %d' % i)
        rx = -200 + C.hashv(i) * (C.W + 400)
        ry = y0 - 390 + C.hashv(i + 30) * 350
        ln = 120 + 160 * C.hashv(i + 60)
        C.inkLine([[rx, ry], [rx + ln * 0.5, ry + 4], [rx + ln, ry + 2]], 1.3, C.hex2('#0F2E3D'), 'inkfine')
    # shore
    C.paint(C.rectPts(-200, y0, C.W + 400, C.H + 200 - y0),
            {'fill': C.hex2('#243044'), 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, y0, C.W + 400, 26), {'fill': C.hex2('#3B4A5E'), 'fillOp': 160, 'ink': None})

def reeds(y0=1000):
    for i in range(30):
        C.boilSeed('reed %d' % i)
        rx = ifx(i * 1.7) * (C.W + 300) - 150
        rh = 110 + C.hashv(i + 60) * 210
        sway = 10 * math.sin(C._T * 1.6 + i)
        base = y0 + 6 + C.hashv(i + 30) * 24
        C.inkLine([[rx, base], [rx + sway * 0.4, base - rh * 0.6], [rx + sway, base - rh]],
                  2.4, C.PAL['sap'], 'ink')
        C.inkLine([[rx + 5, base], [rx + 5 + sway, base - rh * 0.9]],
                  1.5, C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.3), 'ink')
        # seed head
        C.paint(C.ellPts(rx + sway, base - rh - 7, 4.5, 11, 8),
                {'fill': C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.45), 'fillOp': 255, 'ink': None})

def ifx(i):
    v = math.sin(i * 12.9898 + 78.233) * 43758.5453
    return v - math.floor(v)

def jitx(C, a):
    return C.jit(a)

def palace():
    """A building site under a hard sun: half-raised mudbrick walls, a ramp, the Nile far off."""
    sky_gradient(-60, 620, '#7FB6D8', '#EBD9B4', steps=24, mid='#BFD8E2', midk=0.5)
    C.boilSeed('sun2')
    C.glow(1520, 210, 210, '#FFE8B0', 0.42)
    C.paint(C.ellPts(1520, 210, 54, 54, 22), {'wash': '#FFF2C6', 'washOp': 255, 'ink': None})
    # far river band and palms
    C.paint(C.rectPts(-200, 560, C.W + 400, 70), {'fill': C.PAL['nile'], 'fillOp': 210, 'ink': None})
    for i in range(7):
        C.boilSeed('palm %d' % i)
        px_ = -100 + i * 300 + 40 * C.hashv(i)
        C.inkLine([[px_, 580], [px_ + 10, 470], [px_ + 4, 390]], 4.0, C.mixCol(C.PAL['clayDk'], C.PAL['ink'], 0.3))
        for j in range(7):
            a = -2.7 + j * 0.42
            ex_, ey_ = px_ + 4 + math.cos(a) * 96, 392 + math.sin(a) * 62
            C.inkLine([[px_ + 4, 392], [px_ + 4 + math.cos(a) * 50, 392 + math.sin(a) * 30], [ex_, ey_]],
                      3.2, C.PAL['sap'])
            C.paint(C.ellPts(ex_, ey_ + 6, 16, 7, 8), {'fill': C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.2),
                                                      'fillOp': 200, 'ink': None})
    # ground
    C.paint(C.rectPts(-200, 610, C.W + 400, 700), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
    for i in range(5):
        C.boilSeed('gyard %d' % i)
        C.paint(C.ellPts(-200 + i * 480, 700 + 30 * C.hashv(i), 400, 110, 14),
                {'fill': C.PAL['sandDk'], 'fillOp': 60, 'ink': None})
    # half-built brick wall, right side
    for row in range(8):
        for col in range(9):
            bx_ = 1180 + col * 76 + (38 if row % 2 else 0)
            by_ = 900 - row * 42
            C.boilSeed('brick %d %d' % (row, col))
            C.paint(C.rectPts(bx_ + C.jit(2), by_ + C.jit(2), 72, 38),
                    {'fill': C.mixCol(C.PAL['clay'], C.PAL['sandDk'], 0.35 + 0.22 * C.hashv(row * 7 + col)),
                     'fillOp': 255, 'ink': C.mixCol(C.PAL['clayDk'], C.PAL['ink'], 0.5), 'sw': 1.0})
    # a stack of bricks for the workers
    for i in range(5):
        C.boilSeed('stack %d' % i)
        C.paint(C.rectPts(240 + (i % 3) * 46, 1000 - (i // 3) * 26, 44, 24),
                {'fill': C.mixCol(C.PAL['clay'], C.PAL['sandDk'], 0.5), 'fillOp': 255,
                 'ink': C.PAL['ink'], 'sw': 1.0})
    # a wooden ramp
    C.paint([[1010, 1090], [1150, 720], [1230, 720], [1126, 1090]],
            {'fill': C.mixCol(C.PAL['clayDk'], C.PAL['sand'], 0.30), 'fillOp': 255,
             'ink': C.PAL['ink'], 'sw': 1.4})
    for i in range(6):
        C.inkLine([[1010 + i * 20, 1090 - i * 62], [1126 + i * 20, 1090 - i * 62]],
                  1.4, C.mixCol(C.PAL['clayDk'], C.PAL['ink'], 0.4))

def throne_room():
    """Pharaoh's hall: deep red walls, gold columns, a stepped dais."""
    C.paint(C.rectPts(-200, -200, C.W + 400, 1300), {'fill': '#7A2A32', 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, -200, C.W + 400, 420), {'fill': '#5E1F27', 'fillOp': 220, 'ink': None})
    # wall frieze
    for i in range(22):
        C.boilSeed('frieze %d' % i)
        fx = -120 + i * 96
        C.paint(C.ellPts(fx, 300, 26, 34, 10), {'fill': C.PAL['gold'], 'fillOp': 120, 'ink': None})
    # columns
    for px_ in (210, 640, 1280, 1710):
        C.paint(C.rrPts(px_ - 44, 300, 88, 620, 16), {'fill': C.mixCol(C.PAL['ochre'], C.PAL['sand'], 0.4),
                                                     'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.0})
        C.paint(C.rectPts(px_ - 44, 300, 88, 56), {'fill': C.PAL['gold'], 'fillOp': 220, 'ink': None})
        C.paint(C.rectPts(px_ - 44, 852, 88, 68), {'fill': C.mixCol(C.PAL['ochre'], C.PAL['ink'], 0.25),
                                                   'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 1.6})
    # floor
    C.paint(C.rectPts(-200, 900, C.W + 400, 400), {'fill': '#3F2A2E', 'fillOp': 255, 'ink': None})
    for i in range(9):
        C.boilSeed('tile %d' % i)
        C.paint(C.ellPts(-150 + i * 260, 960 + 40 * C.hashv(i), 150, 30, 10),
                {'fill': '#54363A', 'fillOp': 130, 'ink': None})
    # dais
    C.paint([[820, 900], [1120, 900], [1160, 800], [780, 800]],
            {'fill': C.mixCol(C.PAL['sandDk'], C.PAL['ochre'], 0.4), 'fillOp': 255,
             'ink': C.PAL['ink'], 'sw': 2.0})
    C.paint([[860, 800], [1080, 800], [1100, 730], [840, 730]],
            {'fill': C.mixCol(C.PAL['sandDk'], C.PAL['ochre'], 0.55), 'fillOp': 255,
             'ink': C.PAL['ink'], 'sw': 1.8})
    # the throne
    C.paint([[930, 730], [1030, 730], [1044, 600], [916, 600]],
            {'fill': C.PAL['gold'], 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.0})
    C.paint(C.rectPts(912, 560, 136, 46), {'fill': C.mixCol(C.PAL['gold'], C.PAL['cream'], 0.3),
                                           'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 1.8})

def desert_day(t, horizon=470):
    """Open desert midday: warm gradient sky, layered dunes, sandy ground."""
    sky_gradient(-60, horizon + 40, '#7FB2DC', '#F6DCB4', steps=24, mid='#CFE2F0', midk=0.55)
    C.boilSeed('sund3')
    C.glow(1010, 150, 240, '#FFE7AE', 0.42)
    C.paint(C.ellPts(1010, 150, 62, 62, 24), {'wash': '#FFF6D2', 'washOp': 235, 'ink': None})
    # layered far dunes
    ridges = [(horizon - 34, '#C09B70', 200), (horizon + 4, '#D3B183', 240), (horizon + 46, '#E5CBA0', 290)]
    for i, (ry, col, amp) in enumerate(ridges):
        C.boilSeed('ridge %d' % i)
        pts = [[-260, ry + 200]]
        n = 14
        for j in range(n + 1):
            x = -260 + j / n * (C.W + 520)
            pts.append([x, ry - amp * 0.10 - 34 * math.sin(j * 0.9 + i * 1.7) - 16 * C.hashv(i * 17 + j)])
        pts.append([C.W + 260, ry + 200])
        C.paint(pts, {'fill': C.hex2(col), 'fillOp': 255, 'ink': None})
    # sandy ground
    C.paint([[-260, horizon + 60], [C.W + 260, horizon + 60], [C.W + 260, C.H + 200], [-260, C.H + 200]],
            {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})

    # soft dune shadows and stones
    for i in range(9):
        C.boilSeed('dunefloor %d' % i)
        dx = -200 + i * 220 + C.hashv(i) * 60
        C.paint(C.ellPts(dx, horizon + 140 + 90 * C.hashv(i + 7), 300 + 120 * C.hashv(i + 3), 56, 14),
                {'fill': C.PAL['sandDk'], 'fillOp': 60, 'ink': None})
    for i in range(14):
        C.boilSeed('stone %d' % i)
        sx = -150 + C.hashv(i + 40) * (C.W + 300)
        sy = horizon + 130 + C.hashv(i + 70) * 320
        C.paint(C.ellPts(sx, sy, 8 + 12 * C.hashv(i + 11), 5 + 7 * C.hashv(i + 21), 8),
                {'fill': C.mixCol(C.PAL['sandDk'], C.PAL['clayDk'], 0.5), 'fillOp': 150, 'ink': None})

def sea_scene():
    C.paint(C.rectPts(-200, -200, C.W + 400, 400), {'fill': C.PAL['night'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 300, C.W + 400, 720), {'fill': C.PAL['nile'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 620, C.W + 400, C.H + 200 - 620), {'fill': C.PAL['indigo'], 'fillOp': 255, 'ink': None})
    # water walls on the sides (parted sea)
    C.paint(C.rectPts(-200, 560, 420, 420), {'fill': C.PAL['teal'], 'fillOp': 220, 'ink': None})
    C.paint(C.rectPts(1500, 560, 420, 420), {'fill': C.PAL['teal'], 'fillOp': 220, 'ink': None})
    C.paint(C.rectPts(420, 560, 660, 420), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})  # dry path

def mountain_sinai():
    C.paint(C.rectPts(-200, -200, C.W + 400, 420), {'fill': C.PAL['night'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 420, C.W + 400, C.H + 200 - 420), {'fill': C.PAL['indigo'], 'fillOp': 255, 'ink': None})
    C.paint(C.ellPts(960, 520, 340, 420, 20), {'fill': C.PAL['night'], 'fillOp': 255, 'ink': None})  # the mountain
    C.glow(960, 140, 300, '#FFD96A', 0.55)  # divine light on the summit

def nebo():
    """Mount Nebo at dusk: the promised land spread out below, warm sun on the ridge."""
    sky_gradient(-60, 640, '#2A2E58', '#F0B486', steps=28, mid='#7A6A8E', midk=0.62)
    # the sun low on the horizon
    C.boilSeed('sun7')
    C.glow(1480, 470, 300, '#FFC07A', 0.45)
    C.paint(C.ellPts(1480, 470, 58, 58, 24), {'wash': '#FFD79A', 'washOp': 255, 'ink': None})
    # the promised land: layered green hills going to the horizon
    for i in range(3):
        C.boilSeed('hills %d' % i)
        base = 600 + i * 70
        col = C.mixCol('#5E8C63', '#2F4A46', i * 0.35)
        pts = [[-260, base + 60]]
        n = 10
        for j in range(n + 1):
            x = -260 + j / n * (C.W + 520)
            pts.append([x, base - 40 - 46 * math.sin(j * 1.3 + i * 2.1) - 24 * C.hashv(i * 13 + j)])
        pts.append([C.W + 260, base + 60])
        C.paint(pts, {'fill': col, 'fillOp': 235, 'ink': None})
    # the Jordan, a bright thread
    C.inkLine([[1050, 700], [1320, 676], [1620, 664], [1900, 668]], 7.0, '#F7E2B4')
    C.inkLine([[1050, 700], [1320, 676], [1620, 664], [1900, 668]], 2.4, '#9FD0D8')
    # mid ground: the slope just below the ridge
    C.paint([[-260, 1000], [-260, 760], [400, 720], [1100, 700], [1700, 730], [2180, 780],
             [2180, 1000]],
            {'fill': '#4C6B54', 'fillOp': 240, 'ink': None})
    # the ridge Moses stands on, in the foreground
    C.paint([[-260, 1080], [-260, 900], [200, 858], [700, 872], [1180, 900], [1700, 930],
             [2180, 1000], [2180, 1080]],
            {'fill': '#3A3040', 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.4})
    for i in range(7):
        C.boilSeed('rock7 %d' % i)
        rx = -100 + i * 330
        C.paint(C.ellPts(rx, 1000 + 22 * C.hashv(i), 90, 34, 12),
                {'fill': '#4A3E4E', 'fillOp': 170, 'ink': None})

# ---------------- helpers ----------------

def staff_hook(hand, u, sw):
    """Shepherd's staff in the hand: shaft up past the head, curl at the top."""
    hx, hy = hand
    C.boilSeed('staff')
    # shaft: straight, from the ground just below the hand up past the head
    C.inkLine([[hx - u * 0.30, hy + u * 3.4], [hx - u * 0.10, hy + u * 1.2],
               [hx + u * 0.02, hy - u * 1.0], [hx + u * 0.06, hy - u * 3.6]],
              sw * 1.25, C.PAL['ink'])
    # crook: arc from the shaft top, over and down
    curl = []
    for i in range(10):
        a = math.pi - i / 9 * math.pi
        curl.append([hx + u * 0.06 + u * 0.70 + math.cos(a) * u * 0.70,
                     hy - u * 3.6 + math.sin(a) * u * 0.70])
    curl.append([hx + u * 1.46, hy - u * 2.9])
    C.inkLine(curl, sw * 1.15, C.PAL['ink'])

def moses(x, y, u, o=None):
    o = o or {}
    o.setdefault('style', 'moses')
    o.setdefault('beard', o.get('old', False))
    return human(x, y, u, o)

def sky_gradient(y0, y1, top, bot, steps=26, mid=None, midk=0.5):
    """Vertical sky wash from `top` to `bot`, optionally through `mid`."""
    for i in range(steps):
        k0 = i / steps
        k1 = (i + 1) / steps
        yA = y0 + (y1 - y0) * k0
        yB = y0 + (y1 - y0) * k1 + 1
        if mid is None:
            col = C.mixCol(top, bot, k0)
        else:
            col = C.mixCol(top, mid, k0 / midk) if k0 < midk else C.mixCol(mid, bot, (k0 - midk) / (1 - midk))
        C.paint(C.rectPts(-200, yA, C.W + 400, yB - yA), {'fill': col, 'fillOp': 255, 'ink': None})

# ---------------- shots ----------------

def shot1(t, lt, dur):  # 0-18 : the basket on the Nile
    """Night on the Nile: a woven basket drifts in the reeds; the princess finds it.
    Laid out directly in screen space: sky 0-620, water 620-1010, bank 1010-1080."""
    C.set_t(t)
    # --- sky ---
    C.paint(C.rectPts(-200, -200, C.W + 400, 820), {'fill': C.PAL['night'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 400, C.W + 400, 220), {'fill': '#1B2246', 'fillOp': 120, 'ink': None})
    for i in range(34):
        C.boilSeed('star %d' % i)
        sx = C.hashv(i) * C.W
        sy = 30 + C.hashv(i + 100) * 470
        r = 1.4 + C.hashv(i + 200) * 2.2
        al = 0.45 + 0.55 * math.sin(C._T * 2 + i * 1.7)
        C.paint(C.ellPts(sx, sy, r, r, 10), {'wash': C.PAL['cream'], 'washOp': 190 * al, 'ink': None})
    # moon
    C.boilSeed('moon')
    C.glow(410, 200, 165, C.PAL['cream'], 0.5)
    C.paint(C.ellPts(410, 200, 46, 46, 22), {'wash': C.PAL['cream'], 'washOp': 255, 'ink': None})

    # --- river ---
    C.paint(C.rectPts(-200, 620, C.W + 400, 390), {'fill': C.PAL['nile'], 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 620, C.W + 400, 80), {'fill': '#2A5E74', 'fillOp': 180, 'ink': None})
    C.paint(C.rectPts(-200, 940, C.W + 400, 70), {'fill': '#16394A', 'fillOp': 150, 'ink': None})
    # moon reflection
    for i in range(8):
        C.boilSeed('refl %d' % i)
        C.paint(C.ellPts(410 + 9 * math.sin(C._T * 2 + i), 660 + i * 40, 40 - i * 3.6, 6, 10),
                {'wash': C.PAL['cream'], 'washOp': max(4, 95 - i * 11), 'ink': None})
    # ripples
    for i in range(16):
        C.boilSeed('rip %d' % i)
        rx = -120 + C.hashv(i) * (C.W + 200)
        ry = 660 + C.hashv(i + 30) * 320
        ln = 110 + 150 * C.hashv(i + 60)
        C.inkLine([[rx, ry], [rx + ln * 0.5, ry + 5], [rx + ln, ry + 2]], 1.4, '#0F2E3D', 'inkfine')

    # --- bank + reeds at both sides ---
    C.paint(C.rectPts(-200, 1010, C.W + 400, C.H + 200 - 1010), {'fill': '#1D2738', 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 1010, C.W + 400, 18), {'fill': '#38505F', 'fillOp': 150, 'ink': None})
    for i in range(26):
        C.boilSeed('reedA %d' % i)
        rx = -60 + (i / 25.0) * 780 + 26 * math.sin(i * 2.3)
        base = 1046 + 14 * math.sin(i * 1.1)
        rh = 150 + 170 * C.hashv(i + 60)
        sway = 14 * math.sin(C._T * 1.5 + i)
        C.inkLine([[rx, base], [rx + sway * 0.35, base - rh * 0.55], [rx + sway, base - rh]],
                  3.0, C.PAL['sap'], 'ink')
        C.inkLine([[rx + 6, base], [rx + 6 + sway, base - rh * 0.85]], 1.6,
                  C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.35), 'ink')
        C.paint(C.ellPts(rx + sway, base - rh - 9, 5, 13, 8),
                {'fill': C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.5), 'fillOp': 255, 'ink': None})
    for i in range(22):
        C.boilSeed('reedB %d' % i)
        rx = 1240 + (i / 21.0) * 760 + 24 * math.sin(i * 1.7)
        base = 1046 + 14 * math.sin(i * 0.9)
        rh = 150 + 170 * C.hashv(i + 20)
        sway = 14 * math.sin(C._T * 1.5 + i * 1.3)
        C.inkLine([[rx, base], [rx + sway * 0.35, base - rh * 0.55], [rx + sway, base - rh]],
                  3.0, C.PAL['sap'], 'ink')
        C.inkLine([[rx + 6, base], [rx + 6 + sway, base - rh * 0.85]], 1.6,
                  C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.35), 'ink')
        C.paint(C.ellPts(rx + sway, base - rh - 9, 5, 13, 8),
                {'fill': C.mixCol(C.PAL['sap'], C.PAL['ink'], 0.5), 'fillOp': 255, 'ink': None})

    # --- the basket adrift ---
    bx = 560 + 250 * C.ease(C.seg(lt, 0, 12))
    by = 880 + 5 * math.sin(C._T * 1.4)
    C.boilSeed('basket')
    C.paint(C.ellPts(bx, by + 34, 112, 16, 14), {'fill': '#0F2A38', 'fillOp': 110, 'ink': None})
    # woven hull
    C.paint([[bx - 104, by + 4], [bx - 74, by + 28], [bx + 74, by + 28], [bx + 104, by + 4]],
            {'fill': C.PAL['sandDk'], 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.2})
    C.paint([[bx - 92, by + 2], [bx - 66, by - 16], [bx + 66, by - 16], [bx + 92, by + 2]],
            {'fill': C.PAL['ochre'], 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.2})
    # weave lines
    for i in range(-4, 5):
        C.inkLine([[bx + i * 20, by - 15], [bx + i * 22, by + 26]], 1.2, C.PAL['ink'])
    # blanket
    C.paint(C.ellPts(bx, by - 12, 52, 22, 16), {'fill': C.PAL['clayLt'], 'fillOp': 255,
                                                'ink': C.PAL['ink'], 'sw': 1.8})
    # the sleeping child
    C.paint(C.ellPts(bx - 10, by - 30, 22, 20, 14), {'fill': C.PAL['clay'], 'fillOp': 255,
                                                    'ink': C.PAL['ink'], 'sw': 1.6})
    C.paint(C.ellPts(bx - 10, by - 40, 22, 13, 12), {'fill': C.mixCol(C.PAL['clayDk'], C.PAL['ink'], 0.25),
                                                    'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 1.2})
    C.inkLine([[bx - 17, by - 27], [bx - 11, by - 25]], 2.2, C.PAL['ink'])
    C.inkLine([[bx - 3, by - 27], [bx + 3, by - 25]], 2.2, C.PAL['ink'])

    # --- the princess down the bank ---
    px = 1520 - 380 * C.ease(C.seg(lt, 2.5, 9))
    C.glow(px - 78, 900, 130, '#FFD98E', 0.32)
    human(px, 1042, 25, {'style': 'egyptian', 'view': 'q', 'flip': True,
                         'aR': -0.30 + 1.55 * C.ease(C.seg(lt, 5.0, 7.6)),
                         'eyes': 'wide', 'mouth': 'smile', 'lookX': -0.6,
                         'walk': (C.seg(lt, 2.5, 6.2) if lt < 6.6 else None)})
    # her hand reaching the rim
    if lt > 7.2:
        k = C.ease(C.seg(lt, 7.2, 9.4))
        hx0, hy0 = px - 26, 905
        C.inkLine([[C.lerp(hx0, bx + 78, k), C.lerp(hy0, by + 2, k)],
                   [C.lerp(hx0 - 14, bx + 96, k), C.lerp(hy0 + 12, by + 10, k)]], 2.6, C.PAL['ink'])
    # the cry, then wonder
    if 2.0 < lt < 4.2:
        emote('!', bx - 10, by - 96, 30, C.ease(C.seg(lt, 2.0, 3.0)), lt - 2.0)
    if lt > 9.6:
        emote('heart', bx - 52, by - 118, 26, C.ease(C.seg(lt, 9.6, 11.6)), lt - 9.6)

    # iris out on the child
    if lt > dur - 1.3:
        p = C.seg(lt, dur - 1.3, dur)
        C.iris(bx, by - 16, C.lerp(1500, 0, C.easeIn(p)), C.hex2('#0E1028'))

def shot2(t, lt, dur):  # 18-36 : palace, the overseer, flight
    C.set_t(t)
    palace()
    C.camBegin(960, 760, 1.0)
    # the Egyptian overseer striking a Hebrew slave
    gx = 640
    human(gx, 960, 30, {'style': 'egyptian', 'view': 'q', 'flip': True, 'aR': 1.5, 'aL': -0.6,
                        'eyes': 'angry', 'mouth': 'angry'})
    # the whip
    C.inkLine([[gx + 46, 860], [gx + 16, 905], [gx - 8, 930]], 4.0, C.PAL['ink'])
    human(gx + 62, 980, 26, {'style': 'hebrew', 'view': 'side', 'flip': True,
                             'eyes': 'sad', 'mouth': 'wail', 'aL': -1.4, 'aR': -1.4,
                             'rot': 0.18, 'tint': '#F6E6D2', 'tintK': 0.3})
    # Moses, young, watching from the side
    mx_ = 1080 - 180 * C.ease(C.seg(lt, 0, 4))
    m = feel('afraid', lt) if lt > 20 else feel('neutral', lt)
    human(mx_, 940, 30, {'style': 'moses', 'beard': False, 'view': 'q',
                         'eyes': 'wide', 'mouth': 'O', 'aL': 0.6, 'aR': -0.4,
                         **m})
    C.camEnd()
    # Moses strikes: arm comes down on the overseer (cut on the hit at ~24s)
    if 20 <= lt < 23:
        C.boilSeed('blow')
        C.inkLine([[mx_ + 30, 820], [gx + 8, 868]], 4.0, C.PAL['ink'])
        C.glow(gx + 8, 868, 60, C.PAL['rose'], 0.5)
    # overseer falls
    fall = C.ease(C.seg(lt, 23, 26)) if lt >= 23 else 0.0
    if fall:
        human(gx, 960 + fall * 40, 30, {'style': 'egyptian', 'view': 'side', 'flip': True,
                                        'eyes': 'x', 'mouth': 'wobble', 'rot': 1.1 * fall,
                                        'tint': '#F6E6D2', 'tintK': 0.3})
    # Moses looks around, then flees
    flee = C.seg(lt, 28, 34)
    if lt > 28:
        human(C.lerp(mx_, 1800, C.ease(flee)), 940, 30, {'style': 'moses', 'beard': False,
                                                         'view': 'side', 'flip': flee > 0.5,
                                                         'walk': C._T * 2.4, 'aR': 0.4, 'aL': -0.6,
                                                         'eyes': 'scared', 'mouth': 'O'})
    # transition out: brush wipe water -> sand
    if lt > dur - 0.8:
        C.brushWipe(C.seg(lt, dur - 0.8, dur) / 0.8, (C.PAL['nile'], C.PAL['sand']))

def shot3(t, lt, dur):  # 36-60 : the burning bush
    """Horeb: a thornbush ablaze but not consumed, and a voice from the fire."""
    C.set_t(t)
    desert_day(t, horizon=470)
    C.camBegin(960, 720, 1.0)
    gy = 900                       # ground line in world coords
    bx, by = 720, 900              # the bush
    pulse = 0.5 + 0.5 * math.sin(C._T * 2.6)
    # warm halo behind the bush
    C.boilSeed('halo3')
    C.glow(bx + 10, by - 200, 260, '#FF9A3C', 0.20 + 0.08 * pulse)
    # trunk and branches
    C.boilSeed('trunk3')
    C.inkLine([[bx, by], [bx - 14, by - 90], [bx - 6, by - 150]], 9.0, '#4A3524')
    for i, (dx, dy, ex, ey) in enumerate([(-60, -120, -120, -230), (40, -140, 110, -250),
                                         (-30, -200, -80, -320), (30, -210, 75, -330),
                                         (0, -160, 10, -350)]):
        C.inkLine([[bx + dx * 0.5, by + dy * 0.6], [bx + ex * 0.7, by + ey * 0.7], [bx + ex, by + ey]],
                  5.0, '#4A3524')
    # foliage: dark green clusters all round the branches
    for i in range(16):
        C.boilSeed('leaf %d' % i)
        a = i * 0.9
        lx = bx + math.cos(a) * (70 + 60 * C.hashv(i)) + 20 * math.sin(C._T * 1.4 + i)
        ly = by - 170 + math.sin(a) * (95 + 50 * C.hashv(i + 5))
        C.paint(C.ellPts(lx, ly, 46 + 26 * C.hashv(i + 9), 34 + 18 * C.hashv(i + 13), 12),
                {'fill': C.mixCol('#22532A', '#3E7A32', C.hashv(i + 17)),
                 'fillOp': 240, 'ink': C.mixCol('#122B14', C.PAL['ink'], 0.35), 'sw': 1.1})
    # flames between the branches: tapered tongues, hot core, flickering
    def tongue(fx, base_y, fh, wdt, sway, outer, inner):
        pts = []
        for j in range(9):                       # left side, curving inward
            k = j / 8.0
            pts.append([fx - wdt * (1 - k) ** 0.75 + sway * k * 1.5, base_y - fh * k])
        for j in range(8, -1, -1):               # right side back down
            k = j / 8.0
            pts.append([fx + wdt * (1 - k) ** 0.75 + sway * k * 1.5, base_y - fh * k])
        C.paint(pts, {'fill': outer, 'fillOp': 232, 'ink': None})
        C.paint([[fx - wdt * 0.55 + sway * 0.35, base_y - 4],
                 [fx - wdt * 0.15 + sway * 0.8, base_y - fh * 0.55],
                 [fx + sway, base_y - fh * 0.86],
                 [fx + wdt * 0.2 + sway * 0.8, base_y - fh * 0.5],
                 [fx + wdt * 0.55 + sway * 0.35, base_y - 4]],
                {'fill': inner, 'fillOp': 238, 'ink': None})

    for i in range(6):
        C.boilSeed('flame3 %d' % i)
        fx = bx - 40 + (C.hashv(i) - 0.5) * 170
        base_y = by - 60 - C.hashv(i + 30) * 80
        fh = 150 + 110 * (0.35 + 0.65 * abs(math.sin(C._T * 2.6 + i * 1.7)))
        sway = 18 * math.sin(C._T * 2.1 + i)
        tongue(fx, base_y, fh, 24 + 16 * C.hashv(i + 44), sway, '#FF7A18', '#FFD049')
    # a few leaves in front of the fire so the bush encloses it
    for i in range(6):
        C.boilSeed('front leaf %d' % i)
        lx = bx - 120 + i * 48 + 10 * math.sin(C._T * 1.6 + i)
        ly = by - 34 - 18 * C.hashv(i + 3) + 8 * math.sin(C._T * 1.9 + i)
        C.paint(C.ellPts(lx, ly, 36 + 16 * C.hashv(i + 9), 24 + 10 * C.hashv(i + 13), 12),
                {'fill': C.mixCol('#1B4422', '#2E6330', C.hashv(i + 17)),
                 'fillOp': 255, 'ink': C.mixCol('#0E2110', C.PAL['ink'], 0.3), 'sw': 1.1})
    # embers rising
    for i in range(12):
        C.boilSeed('ember %d' % i)
        ek = (C._T * 0.35 + i * 0.17) % 1.0
        ex = bx + (C.hashv(i + 3) - 0.5) * 220 + 30 * math.sin(C._T * 2 + i)
        ey = by - 120 - ek * 420
        C.paint(C.ellPts(ex, ey, 4.5, 4.5, 7),
                {'fill': '#FFC24A', 'fillOp': int(200 * (1 - ek)), 'ink': None})
    # Moses, shepherd's staff in hand, coming closer then barefoot
    mosesx = 1180
    walked = C.ease(C.seg(lt, 1.0, 8.0)) * 90
    mx = mosesx - walked
    if lt > 6:                      # warm light on the sand, before he is painted
        C.boilSeed('spill3')
        C.glow(mx - 230, gy - 10, 170, '#FFCE7A', 0.06 + 0.05 * C.seg(lt, 6, 14))
    mm = feel('hopeful', lt) if lt > 6 else feel('neutral', lt)
    if 11.0 < lt < 17.0:
        k = C.ease(C.seg(lt, 11.0, 14.0))
        human(mx, gy + 4 * k, 34, {'style': 'moses', 'view': 'q', 'flip': True,
                                   'rot': -0.30 * k, 'dy': 3 * k, 'aR': -0.9, 'armR': staff_hook,
                                   'eyes': 'closed', 'mouth': 'none', **feel('awe', lt)})
    else:
        human(mx, gy, 34, {'style': 'moses', 'view': 'q', 'flip': True,
                           'aR': -0.9, 'armR': staff_hook,
                           'eyes': 'shine' if lt > 6 else 'open', 'mouth': 'smile', **mm})
    C.camEnd()
    if lt > dur - 0.8:
        C.brushWipe(C.seg(lt, dur - 0.8, dur) / 0.8, (C.PAL['sand'], C.PAL['night']))

def shot4(t, lt, dur):  # 60-90 : Pharaoh's court, plagues, the Exodus begins
    C.set_t(t)
    throne_room()
    C.camBegin(960, 760, 1.0)
    # Pharaoh on his throne
    human(978, 728, 24, {'style': 'pharaoh', 'view': 'front', 'hat': 'crown',
                         'beard': True, 'eyes': 'narrow', 'mouth': 'smirk', 'aL': 0.5, 'aR': 0.5,
                         'noShadow': True})
    # Moses and Aaron before the throne
    human(560, 1060, 30, {'style': 'moses', 'view': 'q', 'aR': 1.15, 'armR': staff_hook,
                          'eyes': 'determined', 'mouth': 'open'})
    human(690, 1050, 26, {'style': 'moses', 'beard': False, 'view': 'q', 'eyes': 'nervous',
                          'mouth': 'wobble', 'aL': 0.6, 'aR': -0.2})
    # plague overlay intensity
    plague = C.clamp(C.seg(lt, 72, 84))
    if plague > 0:
        # river-to-blood tint over the lower half
        C.paint(C.rectPts(-200, 600, C.W + 400, 260), {'fill': '#6E1B26', 'fillOp': int(110 * plague), 'ink': None})
    if lt > 76:
        # frogs: small shapes leaping
        for i in range(12):
            C.boilSeed('frog %d' % i)
            fx = 400 + C.hashv(i) * 1100
            fy = 800 + math.sin(C._T * 10 + i) * 20
            C.paint(C.ellPts(fx, fy, 14, 9, 10), {'wash': C.PAL['sap'], 'ink': C.PAL['ink'], 'sw': 0.8})
    if lt > 82:
        # darkness
        C.paint(C.rectPts(-200, -200, C.W + 400, C.H + 200), {'fill': C.hex2('#101020'), 'fillOp': int(150 * C.seg(lt, 82, 88)), 'ink': None})
    # Pharaoh yields
    if lt > 86:
        human(978, 728, 24, {'style': 'pharaoh', 'view': 'front', 'hat': 'crown',
                             'beard': True, 'eyes': 'sad', 'mouth': 'frown', 'aL': -1.2, 'aR': -1.2,
                             'tint': '#F6E6D2', 'tintK': 0.45, 'noShadow': True})
    # the people leave (crowd moving right)
    if lt > 88:
        cxrow = 180 + (lt - 88) * 95
        crowd([cxrow + i * 55 for i in range(10)], 880, 14, lt, 'hebrew')
    C.camEnd()
    if lt > dur - 1.0:
        C.brushWipe(C.seg(lt, dur - 1.0, dur) / 1.0, (C.PAL['night'], C.PAL['nile']))

def sea_wall(side, wallh, lean=0.0):
    """A standing wall of water flanking the dry path. side=-1 left, +1 right.
    The inner edge follows the corridor; the crest is a wavy horizontal line."""
    crest = 545 - wallh
    if side < 0:
        outer, in_top, in_bot = -320, 790, 240
        poly = [[outer, crest + lean * 0.2], [in_top, crest], [in_bot, 1140], [outer, 1140]]
        depth = [[in_top - 120, crest + 30], [in_top, crest], [in_bot, 1140], [in_bot - 130, 1140]]
    else:
        outer, in_top, in_bot = 2240, 1130, 1680
        poly = [[in_top, crest], [outer, crest + lean * 0.2], [outer, 1140], [in_bot, 1140]]
        depth = [[in_top, crest], [in_top + 120, crest + 30], [in_bot + 130, 1140], [in_bot, 1140]]
    C.paint(poly, {'fill': C.PAL['teal'], 'fillOp': 252, 'ink': C.PAL['ink'], 'sw': 2.6})
    C.paint(depth, {'fill': '#0F3444', 'fillOp': 130, 'ink': None})
    # water streaks
    for i in range(10):
        C.boilSeed('streak %s %d' % (side, i))
        kx = 0.06 + 0.9 * C.hashv(i)
        x0 = outer + (in_top - outer) * kx
        x1 = outer + (in_bot - outer) * kx
        C.inkLine([[x0, crest + 70 + 90 * C.hashv(i + 9)], [x0 * 0.6 + x1 * 0.4, 860],
                   [x1, 1120]], 1.8, '#0B2C3A', 'inkfine')
    # rising bubbles inside the wall
    for i in range(12):
        C.boilSeed('bub %s %d' % (side, i))
        ph = (C._T * 0.35 + C.hashv(i)) - math.floor(C._T * 0.35 + C.hashv(i))
        kx = C.hashv(i + 30)
        x0 = outer + (in_top - outer) * kx
        x1 = outer + (in_bot - outer) * kx
        bx_ = x0 + (x1 - x0) * 0.5
        by_ = 1080 - ph * 420
        C.paint(C.ellPts(bx_ + 20 * math.sin(ph * 6 + i), by_, 4 + 4 * C.hashv(i + 5), 4 + 4 * C.hashv(i + 5), 8),
                {'fill': C.PAL['cream'], 'fillOp': 90, 'ink': None})
    # foam along the crest
    n = 13
    for i in range(n):
        C.boilSeed('foam %s %d' % (side, i))
        k = i / (n - 1.0)
        fx = outer + (in_top - outer) * k
        fy = crest + 14 * math.sin(k * 6 + C._T * 1.1) + 10
        C.paint(C.ellPts(fx, fy, 40 + 18 * C.hashv(i + 3), 17, 12),
                {'fill': C.PAL['cream'], 'fillOp': 200, 'ink': None})
    # spray just above the crest
    for i in range(16):
        C.boilSeed('spray %s %d' % (side, i))
        k = C.hashv(i + 20)
        fx = outer + (in_top - outer) * k
        fy = crest - 26 - 80 * C.hashv(i + 40) + 12 * math.sin(C._T * 3 + i * 1.4)
        r = 4 + 5 * C.hashv(i + 7)
        C.paint(C.ellPts(fx, fy, r, r, 8), {'fill': C.PAL['cream'], 'fillOp': 140, 'ink': None})
    # a fish, caught in the wall
    if side < 0:
        C.boilSeed('fish')
        fxp = 300 + 60 * math.sin(C._T * 0.8)
        fyp = 760
        C.paint([[fxp - 30, fyp], [fxp + 26, fyp - 16], [fxp + 26, fyp + 16]],
                {'fill': C.mixCol(C.PAL['teal'], C.PAL['cream'], 0.35), 'fillOp': 150, 'ink': None})
        C.paint(C.ellPts(fxp + 46, fyp - 4, 5, 5, 8), {'fill': C.PAL['ink'], 'fillOp': 140, 'ink': None})

def W_OUT():
    return -260

def shot5(t, lt, dur):  # 90-115 : the Red Sea parts
    """Moses raises his staff; the sea opens into two walls; Israel crosses; the waters return."""
    C.set_t(t)
    # stormy sky
    C.paint(C.rectPts(-200, -200, C.W + 400, 760), {'fill': '#241E3E', 'fillOp': 255, 'ink': None})
    C.paint(C.rectPts(-200, 260, C.W + 400, 300), {'fill': '#3B3055', 'fillOp': 130, 'ink': None})
    for i in range(9):
        C.boilSeed('cloud %d' % i)
        cx_ = -150 + i * 260 + 40 * math.sin(C._T * 0.5 + i)
        C.paint(C.ellPts(cx_, 130 + 30 * math.sin(i * 2.1), 200 + 70 * C.hashv(i), 62, 14),
                {'fill': '#4A3F66', 'fillOp': 110, 'ink': None})
    # far water
    C.paint(C.rectPts(-200, 520, C.W + 400, 80), {'fill': '#123C4C', 'fillOp': 255, 'ink': None})

    # the walls rise with the staff
    wallh = 470 * C.ease(C.seg(lt, 0.6, 5.0))
    lean = C.ease(C.seg(lt, 10.0, 12.6))
    sea_wall(-1, wallh, lean)
    sea_wall(1, wallh, lean)

    # the dry path between them
    C.paint([[790, 545], [1130, 545], [1680, 1140], [240, 1140]],
            {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
    C.paint([[830, 570], [1090, 570], [1480, 1140], [440, 1140]],
            {'fill': C.PAL['sandDk'], 'fillOp': 90, 'ink': None})
    # wet edge where the path meets the water
    C.inkLine([[790, 545], [240, 1140]], 2.2, C.mixCol(C.PAL['sandDk'], C.PAL['ink'], 0.5))
    C.inkLine([[1130, 545], [1680, 1140]], 2.2, C.mixCol(C.PAL['sandDk'], C.PAL['ink'], 0.5))

    # foreground shore, dry: Moses keeps his footing here
    C.paint(C.rectPts(-200, 980, C.W + 400, 260), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
    C.inkLine([[-200, 978], [C.W + 200, 978]], 2.2, C.mixCol(C.PAL['sandDk'], C.PAL['ink'], 0.55))
    # wet sand glints
    for i in range(16):
        C.boilSeed('wet %d' % i)
        wx = 420 + C.hashv(i) * 1100
        C.paint(C.ellPts(wx, 620 + C.hashv(i + 30) * 460, 40 + 40 * C.hashv(i + 60), 6, 10),
                {'fill': '#9FBFD0', 'fillOp': 70, 'ink': None})

    # Israel on the path: a column receding toward the far shore
    cross = C.ease(C.seg(lt, 2.4, 8.6))
    people = [(-0.42, 0.10), (0.30, 0.18), (-0.10, 0.30), (0.46, 0.36), (-0.52, 0.44),
              (0.06, 0.52), (0.38, 0.60), (-0.30, 0.66), (0.18, 0.74), (-0.06, 0.82)]
    for i, (lat, dep) in enumerate(people):
        C.boilSeed('israel %d' % i)
        k = C.clamp(dep + cross * 0.55)          # they walk away up the path
        if k > 1.0:
            continue
        halfw = 720 - 550 * k
        wx = 960 + lat * halfw * 1.1
        wy = 1040 - 470 * k
        uu = 21 - 12 * k
        bob = 3.5 * math.sin(C._T * 5.2 + i * 1.3)
        human(wx, wy + bob, uu, {'style': 'hebrew', 'view': 'q', 'flip': (lat > 0.15),
                                 'walk': (C._T * 0.9 + i * 0.13) % 1.0,
                                 'eyes': 'determined', 'mouth': 'flat', 'boilKey': i})

    # the Egyptian army pours into the dry path behind them
    if 8.2 < lt < 11.2:
        adv = C.ease(C.seg(lt, 8.2, 10.6))
        for i in range(6):
            C.boilSeed('egy %d' % i)
            k = C.clamp(0.99 - i * 0.0045)
            halfw = 720 - 550 * k
            wx = 960 + (-0.62 + i * 0.25) * halfw * 0.9
            wy = 1040 - 470 * k + 30 * adv * (i / 5.0)
            human(wx, wy, 7.2 + 0.5 * i, {'style': 'egyptian', 'view': 'q', 'flip': False,
                                          'eyes': 'angry', 'mouth': 'flat', 'boilKey': 10 + i,
                                          'aR': 1.2})
        # a chariot at the head of the column
        C.boilSeed('chariot')
        chx, chy = 960, 552
        C.paint(C.rrPts(chx - 22, chy - 18, 44, 18, 6), {'fill': C.PAL['ochre'], 'fillOp': 255,
                                                          'ink': C.PAL['ink'], 'sw': 1.4})
        C.paint(C.ellPts(chx - 10, chy, 7, 7, 12), {'fill': C.PAL['ink'], 'fillOp': 255, 'ink': None})
        C.paint(C.ellPts(chx + 10, chy, 7, 7, 12), {'fill': C.PAL['ink'], 'fillOp': 255, 'ink': None})

    # the sea rises and floods the path again
    if lt > 10.6:
        crash = C.ease(C.seg(lt, 10.6, 13.4))
        # crest line sweeps up from the walls and breaks over the path
        crest = []
        n = 22
        for i in range(n + 1):
            k = i / n
            x = -260 + k * (2240 + 260)
            lift = math.sin(k * math.pi) ** 1.3
            y = 980 - (520 + 150 * math.sin(k * 9 + C._T * 2.4)) * lift * crash
            crest.append([x, y])
        body = crest + [[2380, 1180], [-300, 1180]]
        C.paint(body, {'fill': C.PAL['teal'], 'fillOp': 252, 'ink': C.PAL['ink'], 'sw': 2.4})
        # foam along the breaking crest
        C.inkLine(crest, 26 * crash + 4, C.PAL['cream'])
        C.inkLine([[p[0], p[1] - 16] for p in crest], 13 * crash + 2, C.PAL['cream'])
        # spray flung off the top
        for i in range(22):
            C.boilSeed('spray3 %d' % i)
            k = C.hashv(i)
            x = -260 + k * 2500
            lift = math.sin(k * math.pi) ** 1.3
            y = 980 - (520 * lift + 120 * C.hashv(i + 9)) * crash
            r = 5 + 9 * C.hashv(i + 3)
            C.paint(C.ellPts(x, y, r, r, 8), {'fill': C.PAL['cream'], 'fillOp': 200 * crash, 'ink': None})
        # foam streaks inside the surge
        for i in range(12):
            C.boilSeed('surge %d' % i)
            sx = -100 + C.hashv(i) * (C.W + 200)
            sy = 620 + 260 * C.hashv(i + 12)
            C.inkLine([[sx, sy], [sx + 120, sy - 18], [sx + 240, sy + 4]],
                      2.4, C.mixCol(C.PAL['teal'], C.PAL['cream'], 0.55))
        if crash > 0.78:
            C.flash((crash - 0.78) / 0.22 * 0.30)

    # Moses stands on the near shore through the whole shot
    raisev = C.ease(C.seg(lt, 0.0, 1.6))
    shake = 6 * C.ease(C.seg(lt, 10.8, 12.0)) * math.sin(C._T * 11)
    human(300, 1045 + shake, 36, {'style': 'moses', 'view': 'q', 'beard': True,
                                  'aR': 1.62 - 0.08 * raisev, 'aL': 0.30,
                                  'armR': staff_hook, 'eyes': 'determined', 'mouth': 'open',
                                  'tint': '#8FA6D8', 'tintK': 0.22})

    if lt > dur - 0.9:
        C.brushWipe(C.seg(lt, dur - 0.9, dur) / 0.9, (C.PAL['nile'], C.PAL['sand']))

def shot6(t, lt, dur):  # 115-135 : manna in the desert, then Sinai
    """Morning: bread on the sand. Then the mountain, wrapped in fire, and the tablets."""
    C.set_t(t)
    if lt < 9.0:
        # ---------- manna ----------
        # dawn sky
        sky_gradient(-60, 620, '#8E7BA8', '#F3D3A6', steps=30, mid='#D9A8A4', midk=0.55)
        C.boilSeed('dawn')
        C.glow(1420, 470, 260, '#FFE7B6', 0.55)
        C.paint(C.ellPts(1420, 470, 82, 82, 24), {'wash': '#FFF0C9', 'washOp': 255, 'ink': None})
        # dunes
        C.paint(C.rectPts(-200, 560, C.W + 400, 700), {'fill': C.PAL['sand'], 'fillOp': 255, 'ink': None})
        for i in range(6):
            C.boilSeed('dune %d' % i)
            C.paint(C.ellPts(-250 + i * 420, 590, 320, 90, 14),
                    {'fill': C.PAL['sandDk'], 'fillOp': 70, 'ink': None})
        for i in range(5):
            C.boilSeed('fore %d' % i)
            C.paint(C.ellPts(-260 + i * 460, 900 + 40 * C.hashv(i), 380, 130, 14),
                    {'fill': C.PAL['sandDk'], 'fillOp': 55, 'ink': None})

        # the people gather it at first light
        spots = [(210, 1010, 27, False), (470, 930, 22, True), (700, 1000, 26, False),
                 (980, 900, 20, True), (1250, 985, 25, False), (1520, 925, 21, True),
                 (300, 890, 18, False), (1620, 1000, 24, False)]
        for i, (hx, hy, uu, fl) in enumerate(spots):
            C.boilSeed('gather %d' % i)
            C.paint(C.ellPts(hx, hy + 8, uu * 1.5, uu * 0.30, 12),
                    {'fill': C.PAL['ink'], 'fillOp': 45, 'ink': None})
            bent = 0.26 + 0.07 * math.sin(C._T * 2.2 + i)
            human(hx, hy, uu, {'style': 'hebrew', 'view': 'q', 'flip': fl,
                               'rot': -(bent) if fl else bent, 'sq': 0.04,
                               'aR': -0.5 if not fl else 0.2, 'aL': 0.2 if not fl else -0.5,
                               'eyes': 'happy', 'mouth': 'smile', 'boilKey': i})
            # a shallow basket of bread
            C.boilSeed('basket %d' % i)
            bx_ = hx + (uu * 1.5 if fl else -uu * 1.5)
            C.paint(C.ellPts(bx_, hy - 4, uu * 0.85, uu * 0.42, 12),
                    {'fill': C.PAL['ochre'], 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 1.4})
            for j in range(5):
                C.paint(C.ellPts(bx_ + (j - 2) * uu * 0.26, hy - 4 - uu * 0.16, uu * 0.13, uu * 0.10, 8),
                        {'fill': C.PAL['cream'], 'fillOp': 255, 'ink': None})

        # manna on the ground, and drifting down
        for i in range(70):
            C.boilSeed('manna %d' % i)
            mx_ = -80 + C.hashv(i) * (C.W + 160)
            my = 660 + C.hashv(i + 40) * 400
            C.paint(C.ellPts(mx_, my, 4.5, 3.6, 8), {'fill': C.PAL['cream'], 'fillOp': 235, 'ink': None})
        for i in range(26):
            C.boilSeed('fall %d' % i)
            ph = (C._T * 0.30 + C.hashv(i)) - math.floor(C._T * 0.30 + C.hashv(i))
            fx = -60 + C.hashv(i + 60) * (C.W + 120) + 30 * math.sin(ph * 5 + i)
            fy = 420 + ph * 480
            C.paint(C.ellPts(fx, fy, 5.5, 4.2, 8),
                    {'fill': C.PAL['cream'], 'fillOp': int(120 + 120 * math.sin(ph * math.pi)), 'ink': None})
        # light shafts from above

        if lt > 8.2:
            C.flash(C.seg(lt, 8.2, 9.0) * 0.85)
    else:
        # ---------- Sinai ----------
        k = C.seg(lt, 9.0, 10.0)
        sky_gradient(-60, 960, '#12132E', '#3D3470', steps=30, mid='#24204A', midk=0.62)
        for i in range(28):
            C.boilSeed('sstar %d' % i)
            sx = C.hashv(i) * C.W
            sy = 20 + C.hashv(i + 100) * 520
            al = 0.4 + 0.6 * abs(math.sin(C._T * 1.7 + i))
            C.paint(C.ellPts(sx, sy, 1.8, 1.8, 8), {'wash': C.PAL['cream'], 'washOp': 170 * al, 'ink': None})
        C.paint(C.rectPts(-200, 940, C.W + 400, 400), {'fill': '#191A38', 'fillOp': 255, 'ink': None})

        # the mountain: a broad mass with a lit summit
        mtn = [[260, 960], [520, 700], [700, 560], [860, 340], [960, 300],
               [1080, 360], [1240, 580], [1420, 720], [1680, 960]]
        C.paint(mtn, {'fill': '#453B72', 'fillOp': 255, 'ink': C.PAL['ink'], 'sw': 2.8})
        # lit face
        C.paint([[860, 340], [960, 300], [1080, 360], [1000, 560], [940, 700]],
                {'fill': '#5D5090', 'fillOp': 190, 'ink': None})
        C.inkLine([[520, 700], [700, 560], [860, 340], [960, 300]], 2.0, '#6E60A2')
        C.inkLine([[960, 300], [1080, 360], [1240, 580]], 2.0, '#2A2450')
        for i in range(7):
            C.boilSeed('rock %d' % i)
            rx = 520 + i * 170 + 30 * C.hashv(i)
            C.inkLine([[rx, 960], [rx + 40, 700]], 1.6, '#171834', 'inkfine')

        # fire and smoke at the summit
        C.glow(960, 300, 230, '#FFB84D', 0.45)
        C.glow(960, 320, 130, '#FFE7A8', 0.55)
        for i in range(16):
            C.boilSeed('flame %d' % i)
            ph = (C._T * 0.9 + C.hashv(i)) - math.floor(C._T * 0.9 + C.hashv(i))
            fx = 960 + (C.hashv(i + 30) - 0.5) * 250
            fy = 320 - ph * 210
            r = (10 + 16 * C.hashv(i + 5)) * (1 - ph * 0.6)
            C.paint(C.ellPts(fx, fy, r, r * 1.5, 10),
                    {'fill': C.mixCol('#FFC14D', '#E2476E', ph * 0.6),
                     'fillOp': int(220 * (1 - ph)), 'ink': None})
        for i in range(7):
            C.boilSeed('smoke %d' % i)
            ph = (C._T * 0.18 + C.hashv(i)) - math.floor(C._T * 0.18 + C.hashv(i))
            C.paint(C.ellPts(960 + 120 * math.sin(ph * 4 + i), 240 - ph * 240,
                             70 + 50 * ph, 44 + 30 * ph, 12),
                    {'fill': '#3D3A5E', 'fillOp': int(70 * (1 - ph)), 'ink': None})

        # Moses on the summit with the tablets (small, far away)
        human(960, 372, 11, {'style': 'moses', 'view': 'front', 'beard': True,
                             'aL': -0.9, 'aR': -0.9, 'eyes': 'shine', 'mouth': 'flat',
                             'tint': '#FFD98E', 'tintK': 0.45, 'noShadow': True})
        # the two tablets, held up
        for sx in (-26, 14):
            C.paint(C.rrPts(960 + sx, 316, 14, 26, 4), {'fill': C.PAL['cream'], 'fillOp': 255,
                                                        'ink': C.PAL['ink'], 'sw': 1.2})
        # the people at the foot of the mountain
        for i in range(9):
            C.boilSeed('foot %d' % i)
            fx = 300 + i * 165 + 22 * math.sin(i * 2.1)
            human(fx, 1020 + 12 * math.sin(i * 1.3) + 6 * math.sin(C._T * 2 + i), 12,
                  {'style': 'hebrew', 'view': 'q', 'eyes': 'scared', 'mouth': 'open',
                   'boilKey': 20 + i})
        if lt > dur - 1.1:
            C.brushWipe(C.seg(lt, dur - 1.1, dur) / 1.1, (C.PAL['night'], C.PAL['indigo']))

def shot7(t, lt, dur):  # 135-150 : Mount Nebo, the promised land
    """The last look: Moses, very old, sees the land he will not enter."""
    C.set_t(t)
    nebo()
    # Moses and Joshua on the ridge, looking out
    human(760, 1000, 34, {'style': 'moses', 'old': True, 'view': 'q', 'flip': True,
                          'aL': 0.45, 'aR': -0.55, 'armR': None,
                          'eyes': 'shine', 'mouth': 'smile', 'beard': True})
    human(940, 1024, 28, {'style': 'moses', 'beard': False, 'view': 'q', 'flip': True,
                          'aR': 0.55, 'eyes': 'happy', 'mouth': 'smile',
                          'hat': None})
    # birds over the valley
    for i in range(5):
        C.boilSeed('bird %d' % i)
        bx_ = 1150 + i * 130 + 40 * math.sin(C._T * 0.7 + i)
        by_ = 520 + 26 * math.sin(C._T * 1.1 + i * 2)
        C.inkLine([[bx_ - 12, by_], [bx_, by_ - 7], [bx_ + 12, by_]], 2.0, C.PAL['ink'])
    # the staff planted in the ground at the end
    if lt > dur - 3.0:
        k = C.ease(C.seg(lt, dur - 3.0, dur - 1.6))
        C.inkLine([[1130, 1000], [1122, 1000 - 210 * k]], 5.0, C.PAL['ink'])
    # iris out to dark
    if lt > dur - 1.6:
        p = C.seg(lt, dur - 1.6, dur)
        C.iris(880, 800, C.lerp(1500, 0, C.easeIn(p)), C.hex2('#101430'))

SHOTS = [[B[0], shot1], [B[1], shot2], [B[2], shot3], [B[3], shot4],
         [B[4], shot5], [B[5], shot6], [B[6], shot7]]
