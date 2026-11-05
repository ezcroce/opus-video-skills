#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
figures.py — characters for the Mosè video.
One builder, human(), used for Moses, Egyptians, Hebrews and Pharaoh.
Every drawing goes through core (imported as C) so the current frame image
(C.D) and camera (C.CAM) are always read live.
"""

import math
import core as C
swi = C.swi

STYLES = {
    'moses':    {'robe': C.PAL['indigo'], 'tunic': C.PAL['clayLt'], 'skin': C.PAL['clay'],
                 'hair': C.PAL['clayDk'], 'beard': C.PAL['cream'], 'staff': True},
    'egyptian': {'robe': C.PAL['ochre'],  'tunic': C.PAL['cream'],  'skin': C.PAL['clay'],
                 'hair': '#5C4022', 'beard': None, 'staff': False},
    'pharaoh':  {'robe': C.PAL['gold'],   'tunic': C.PAL['cream'],  'skin': C.PAL['clay'],
                 'hair': C.PAL['ink'], 'beard': C.PAL['gold'], 'staff': True},
    'hebrew':   {'robe': C.PAL['rose'],   'tunic': C.PAL['clayLt'], 'skin': C.PAL['clay'],
                 'hair': C.PAL['clayDk'], 'beard': None, 'staff': False},
}

EMO = {
    'neutral':   {'eyes': 'normal', 'mouth': None},
    'happy':     {'eyes': 'happy',  'mouth': 'smile', 'blush': 0.3},
    'sad':       {'eyes': 'sad',    'mouth': 'frown', 'tint': '#6D86BE', 'gloom': 0.25},
    'afraid':    {'eyes': 'scared', 'mouth': 'wobble', 'tint': '#F6E6D2', 'tintK': 0.6},
    'surprised': {'eyes': 'wide',   'mouth': 'O'},
    'confused':  {'eyes': ['narrow', 'wide'], 'mouth': 'wobble'},
    'determined':{'eyes': 'determined', 'mouth': 'flat'},
    'angry':     {'eyes': 'angry',  'mouth': 'teeth', 'tint': '#E23E36', 'tintK': 0.45},
    'hopeful':   {'eyes': 'shine',  'mouth': 'cat', 'blush': 0.35},
    'proud':     {'eyes': 'closed', 'mouth': 'smile', 'tint': '#F0BE46', 'tintK': 0.3},
    'starstruck':{'eyes': 'spark',  'mouth': 'open', 'tint': '#F0BE46', 'tintK': 0.3},
    'sleepy':    {'eyes': 'sleepy', 'mouth': 'o'},
    'bored':     {'eyes': 'narrow', 'mouth': 'flat'},
    'nervous':   {'eyes': 'look', 'mouth': 'wobble', 'tint': '#F6E6D2', 'tintK': 0.2},
    'disgusted': {'eyes': 'squeeze', 'mouth': 'wobble', 'tint': '#98B25E', 'tintK': 0.5},
    'ko':        {'eyes': 'x', 'mouth': 'wobble', 'tint': '#F6E6D2', 'tintK': 0.3},
}

def _bp(t):
    return t / (60.0 / 90.0)

def _b(t):
    bp = _bp(t); s1 = math.sin(bp * math.pi); ab = abs(s1)
    return {'bp': bp, 's1': s1, 'ab': ab,
            'hit': math.exp(-(bp - math.floor(bp)) * 6.0),
            'f': bp - math.floor(bp)}

def feel(name, t):
    E = EMO.get(name, EMO['neutral'])
    b = _b(t)
    out = {'eyes': E['eyes'], 'mouth': E['mouth'], 'tint': E.get('tint'),
           'tintK': E.get('tintK', 1.0), 'blush': E.get('blush', 0.0), 'gloom': E.get('gloom', 0.0)}
    if name == 'neutral':
        out.update(dy=-0.25 * b['ab'], sq=0.03 * b['hit'], aL=0.15 + 0.05 * b['s1'], aR=0.15 - 0.05 * b['s1'])
    elif name == 'happy':
        out.update(dy=-1.2 * b['ab'], sq=0.1 * b['hit'], aL=0.4 + 0.4 * b['s1'], aR=0.4 - 0.4 * b['s1'])
    elif name == 'sad':
        out.update(sq=0.08, rot=0.03 * math.sin(b['bp'] * math.pi / 4), aL=-0.75, aR=-0.75, lookY=0.5)
    elif name == 'afraid':
        out.update(dx=0.1 * math.sin(t * math.pi * 22), sq=-0.06,
                   aL=1.08 * math.sin(t * math.pi * 17), aR=1.08 * math.sin(t * math.pi * 19),
                   lookX=0.6 * (1 if math.sin(t * 2.3) >= 0 else -1))
    elif name == 'surprised':
        out.update(sq=-0.12, dy=-0.3 - 0.15 * b['ab'],
                   aL=1.1 + 0.05 * math.sin(b['bp'] * math.pi * 2),
                   aR=1.1 - 0.05 * math.sin(b['bp'] * math.pi * 2))
    elif name == 'determined':
        p1 = math.sin(b['f'] * math.pi); p2 = abs(math.cos(b['f'] * math.pi))
        out.update(rot=0.06, sq=-0.04 + 0.06 * b['hit'], dy=-0.3 * b['ab'],
                   aL=0.1 + 0.7 * p1, aR=0.1 + 0.7 * p2)
    elif name == 'hopeful':
        out.update(sq=-0.06 - 0.02 * b['ab'], dy=-0.25 * b['ab'], lookY=-0.4,
                   aL=0.5 + 0.05 * b['s1'], aR=0.5 - 0.05 * b['s1'],
                   rot=0.03 * math.sin(b['bp'] * math.pi / 2))
    elif name == 'proud':
        out.update(sq=-0.1 - 0.03 * b['ab'], dy=-0.3 * b['hit'], aL=-0.9, aR=-0.9, rot=0.02 * b['s1'])
    elif name == 'starstruck':
        h = abs(math.sin(b['bp'] * math.pi))
        out.update(dy=-1.6 * h, sq=0.1 * math.exp(-(b['bp'] - math.floor(b['bp'])) * 6),
                   aL=1.1 + 0.35 * math.sin(b['bp'] * math.pi * 2), aR=1.1 + 0.35 * math.sin(b['bp'] * math.pi * 2))
    elif name == 'sleepy':
        br = math.sin(t * math.pi * 0.6)
        out.update(sq=0.05 + 0.05 * br, rot=0.06 * math.sin(t * 0.8), aL=-0.6, aR=-0.6)
    elif name == 'bored':
        f = (b['bp'] / 4) - math.floor(b['bp'] / 4)
        sigh = f / 0.3 if f < 0.3 else 1 - (f - 0.3) / 0.7
        out.update(lookX=-0.3, lookY=0.4, sq=0.08 - 0.14 * sigh, rot=-0.04,
                   aL=-0.85 + 0.05 * math.sin(t * 2), aR=-0.85 - 0.05 * math.sin(t * 2))
    elif name == 'angry':
        out.update(dx=0.1 * math.sin(t * math.pi * 18), sq=0.12 * b['hit'],
                   aL=-0.3 + 0.1 * b['hit'], aR=-0.3 + 0.1 * b['hit'])
    elif name == 'nervous':
        out.update(lookX=0.8 if C.beatN(t) % 2 else -0.8, dx=0.3 * b['s1'], sq=0.04,
                   aL=-0.1 + 0.2 * math.sin(t * math.pi * 2), aR=-0.1 + 0.2 * math.sin(t * math.pi * 2 + 1))
    elif name == 'disgusted':
        out.update(rot=-0.1, dx=-0.3, sq=0.05, aL=0.7, aR=0.7)
    return out

def emotions(lt, keys, take_scale=1.0):
    i = 0
    while i + 1 < len(keys) and lt >= keys[i + 1][0]:
        i += 1
    tc, name, over = keys[i]
    age = lt - tc
    cur = dict(feel(name, lt))
    if over:
        cur.update(over)
    squint = cur.get('squint', 0.0)
    tn = keys[i + 1][0] if i + 1 < len(keys) else float('inf')
    if tn - lt < 0.1:
        squint = max(squint, 1 - (tn - lt) / 0.1)
    if i > 0 and age < 0.14:
        squint = max(squint, 1 - age / 0.14)
    cur['squint'] = squint
    if i > 0:
        take_amt = cur.pop('take', 0.6) * take_scale
        td, tsq = C.take(lt, tc, take_amt)
        cur['dy'] = (cur.get('dy') or 0.0) + td
        cur['sq'] = (cur.get('sq') or 0.0) + tsq
    return cur

# ---------------- low-level face parts ----------------

def _eye(kind, u, sw, cx, cy, s, lookX, lookY, squint, seed, Tloc, D):
    lx = lookX * u * 0.5
    ly = lookY * u * 0.4
    cx2 = cx + lx
    cy2 = cy + ly
    sy = 1 - squint * 0.7
    if squint > 0.8:
        D.line([(cx2 - 0.8 * u, cy2), (cx2 + 0.8 * u, cy2)], fill=C.PAL['ink'], width=swi(sw))
        return
    if kind == 'blink' or ((Tloc * 0.9 + seed * 1.7) % 3.3) < 0.12 and kind in ('normal', 'look', 'wide'):
        D.line([(cx2 - 0.7 * u, cy2 + 0.5 * u), (cx2 + 0.7 * u, cy2 + 0.5 * u)], fill=C.PAL['ink'], width=swi(sw))
        return
    def ell(rx, ry, fill=C.PAL['ink']):
        D.ellipse([cx2 - rx, cy2 - ry * sy, cx2 + rx, cy2 + ry * sy], fill=fill)
    if kind == 'normal': ell(u * 0.5, u * 1.0)
    elif kind == 'wide': ell(u * 0.62, u * 1.35)
    elif kind == 'happy':
        D.line([(cx2 - 0.9 * u, cy2 + 0.7 * u), (cx2, cy2 - 0.5 * u), (cx2 + 0.9 * u, cy2 + 0.7 * u)],
               fill=C.PAL['ink'], width=swi(sw), joint='curve')
    elif kind == 'closed':
        D.line([(cx2 - 0.9 * u, cy2 + 0.2 * u), (cx2 + 0.9 * u, cy2 + 0.2 * u)], fill=C.PAL['ink'], width=swi(sw * 1.2))
    elif kind == 'sleepy':
        D.rectangle([cx2 - 0.5 * u, cy2 + 0.05 * u, cx2 + 0.5 * u, cy2 + 0.95 * u], fill=C.PAL['ink'])
        D.line([(cx2 - 0.8 * u, cy2 + 0.05 * u), (cx2, cy2 - 0.1 * u), (cx2 + 0.8 * u, cy2 + 0.1 * u)],
               fill=C.PAL['ink'], width=swi(sw * 1.1))
    elif kind == 'narrow':
        D.rectangle([cx2 - 0.6 * u, cy2 - 0.1 * u, cx2 + 0.6 * u, cy2 + 0.7 * u], fill=C.PAL['ink'])
    elif kind in ('angry', 'determined'):
        hi = 0.75 if kind == 'angry' else 0.5
        top = -0.7 if kind == 'angry' else -0.55
        pts = [(cx2 + s * -0.65 * u, cy2 + (top if s < 0 else top + hi) * u),
               (cx2 + s * 0.65 * u, cy2 + (top + hi if s < 0 else top) * u),
               (cx2 + s * 0.65 * u, cy2 + 1.0 * u), (cx2 + s * -0.65 * u, cy2 + 1.0 * u)]
        D.polygon(pts, fill=C.PAL['ink'])
    elif kind in ('sad', 'teary'):
        pts = [(cx2 + s * -0.6 * u, cy2 + (-0.2 if s < 0 else -0.85) * u),
               (cx2 + s * 0.6 * u, cy2 + (-0.85 if s < 0 else -0.2) * u),
               (cx2 + s * 0.6 * u, cy2 + 0.9 * u), (cx2 + s * -0.6 * u, cy2 + 0.9 * u)]
        D.polygon(pts, fill=C.PAL['ink'])
    elif kind == 'cry':
        D.line([(cx2 - s * 0.9 * u, cy2 + 0.45 * u), (cx2 - s * 0.3 * u, cy2 - 0.05 * u),
                (cx2 + s * 0.3 * u, cy2 + 0.15 * u), (cx2 + s * 0.9 * u, cy2 - 0.2 * u)],
               fill=C.PAL['ink'], width=swi(sw * 1.3))
    elif kind == 'squeeze':
        D.line([(cx2 + s * -0.55 * u, cy2 - 0.7 * u), (cx2 + s * 0.55 * u, cy2),
                (cx2 + s * -0.55 * u, cy2 + 0.7 * u)], fill=C.PAL['ink'], width=swi(sw * 1.3))
    elif kind == 'shine':
        ell(u * 0.39, u * 0.56)
        D.ellipse([cx2 - 0.25 * u, cy2 - 0.45 * u, cx2 + 0.15 * u, cy2 - 0.15 * u], fill=C.PAL['cream'])
        D.ellipse([cx2 + 0.25 * u, cy2 + 0.15 * u, cx2 + 0.35 * u, cy2 + 0.35 * u], fill=C.PAL['cream'])
    elif kind == 'scared':
        ell(u * 0.47, u * 0.57, C.PAL['cream'])
        D.ellipse([cx2 - u * 0.15, cy2 - u * 0.2, cx2 + u * 0.15, cy2 + u * 0.2], fill=C.PAL['ink'])
    elif kind == 'blank':
        ell(u * 0.4, u * 0.52, C.PAL['cream'])
    elif kind == 'spark':
        D.ellipse([cx2 - u * 0.75, cy2 - u * 0.75, cx2 + u * 0.75, cy2 + u * 0.75], fill=C.hex2('#E8AA38'))
        D.polygon(C.starPts(cx2, cy2, u * 0.67 * (1 + 0.12 * math.sin(Tloc * 14))),
                  fill=C.PAL['cream'], outline=C.PAL['ink'])
    elif kind == 'red':
        D.ellipse([cx2 - u * 0.85, cy2 - u * 0.85, cx2 + u * 0.85, cy2 + u * 0.85], fill=C.hex2('#E0283F'))
    elif kind == 'heart':
        D.polygon(C.heartPts(cx2, cy2 + 0.05 * u, u * 0.45), fill=C.hex2('#E2476E'), outline=C.PAL['ink'])
    elif kind == 'x':
        D.line([(cx2 - 0.8 * u, cy2 - 0.8 * u), (cx2 + 0.8 * u, cy2 + 0.8 * u)], fill=C.PAL['ink'], width=swi(sw))
        D.line([(cx2 + 0.8 * u, cy2 - 0.8 * u), (cx2 - 0.8 * u, cy2 + 0.8 * u)], fill=C.PAL['ink'], width=swi(sw))
    elif kind == 'swirl':
        sp = []
        for k in range(16):
            a = k * 0.7 + Tloc * 6 * s
            r = k * 0.06 * u
            sp.append((cx2 + math.cos(a) * r, cy2 + math.sin(a) * r))
        C.inkLine([list(p) for p in sp], sw * 0.6, C.PAL['ink'])
    elif kind == 'dot':
        ell(u * 0.22, u * 0.27)
    else:
        ell(u * 0.5, u * 1.0)

def eyes(u, o, sw, cx, cy, sides, D, sep=0.95):
    kinds = o['eyes'] if isinstance(o['eyes'], list) else [o.get('eyes', 'normal'), o.get('eyes', 'normal')]
    squint = clamp0(o.get('squint', 0.0))
    lookX = o.get('lookX', 0) or 0
    lookY = o.get('lookY', 0) or 0
    seed = o.get('seed', 0)
    Tloc = o.get('T', C._T)
    for si, s in enumerate(sides):
        kind = kinds[0] if si == 0 else (kinds[1] if len(kinds) > 1 else kinds[0])
        _eye(kind, u, sw, cx + s * sep * u, cy, s, lookX, lookY, squint, seed, Tloc, D)

def clamp0(x):
    return max(0.0, min(1.0, x))

def mouth(u, o, sw, mx, my, D):
    m = o.get('mouth')
    if not m:
        return
    dark = C.hex2('#4A1F2A')
    def line(pts, w=0.8):
        D.line([(mx + p[0] * u, my + p[1] * u) for p in pts], fill=C.PAL['ink'], width=swi(sw * w), joint='curve')
    Tloc = o.get('T', C._T)
    if m == 'smile': line([(-0.8, -0.3), (0, 0.2), (0.8, -0.3)])
    elif m == 'frown': line([(-0.8, 0.2), (0, -0.3), (0.8, 0.2)])
    elif m == 'flat': line([(-0.7, 0.0), (0.7, 0.0)], w=0.0)
    elif m == 'grin':
        D.polygon([(-1.3 * u + mx, -0.8 * u + my), (1.3 * u + mx, -0.8 * u + my),
                   (0.9 * u + mx, 0.1 * u + my), (-0.9 * u + mx, 0.1 * u + my)],
                  fill=dark, outline=C.PAL['ink'])
    elif m == 'wobble': line([(-1, -0.1), (-0.5, -0.4), (0, -0.1), (0.5, -0.4), (1, -0.1)], w=0.7)
    elif m == 'cat': line([(-0.9, -0.2), (-0.45, 0.2), (0, -0.2), (0.45, 0.2), (0.9, -0.2)], w=0.7)
    elif m == 'smirk': line([(-0.8, 0.0), (0.2, 0.1), (0.9, -0.45)], w=0.8)
    elif m == 'laugh':
        D.polygon([(-1.4 * u + mx, -0.9 * u + my), (1.4 * u + mx, -0.9 * u + my),
                   (1.0 * u + mx, 0.0 * u + my), (0, 0.6 * u + my), (-1.0 * u + mx, 0.0 * u + my)],
                  fill=dark, outline=C.PAL['ink'])
        D.ellipse([-0.35 * u + mx, 0.15 * u + my, 0.35 * u + mx, 0.47 * u + my], fill=C.hex2('#E2476E'))
    elif m == 'open':
        D.ellipse([-0.375 * u + mx, -0.25 * u + my, 0.375 * u + mx, 0.35 * u + my], fill=dark, outline=C.PAL['ink'])
    elif m == 'wail':
        D.polygon([(-1.5 * u + mx, -0.5 * u + my), (-0.5 * u + mx, -0.9 * u + my),
                   (0.5 * u + mx, -0.9 * u + my), (1.5 * u + mx, -0.5 * u + my),
                   (1.2 * u + mx, 0.7 * u + my), (-1.2 * u + mx, 0.7 * u + my)],
                  fill=dark, outline=C.PAL['ink'])
        D.ellipse([-0.4 * u + mx, 0.4 * u + my, 0.4 * u + mx, 0.65 * u + my], fill=C.hex2('#E2476E'))
    elif m == 'teeth':
        D.rectangle([-1.3 * u + mx, -0.85 * u + my, 1.3 * u + mx, 0.05 * u + my], fill=C.PAL['cream'], outline=C.PAL['ink'])
        for tx in (-0.65, 0, 0.65):
            D.line([(tx * u + mx, -0.8 * u + my), (tx * u + mx, 0.05 * u + my)], fill=C.PAL['ink'], width=swi(sw * 0.35))
    elif m == 'tongue':
        D.polygon([(0.05 * u + mx, -0.3 * u + my), (0.75 * u + mx, -0.3 * u + my),
                   (0.72 * u + mx, 0.25 * u + my), (0.4 * u + mx, 0.45 * u + my),
                   (0.08 * u + mx, 0.25 * u + my)], fill=C.hex2('#E2476E'), outline=C.PAL['ink'])
        line([(-0.8, -0.3), (0, 0.1), (0.8, -0.2)])
    elif m == 'pout':
        line([(-0.45, -0.2), (0, -0.5), (0.45, -0.2)], w=1.0)
        line([(-0.25, 0.0), (0, 0.3), (0.25, -0.0)], w=0.6)
    elif m == 'yawn':
        D.ellipse([-0.3 * u + mx, -0.1 * u + my, 0.3 * u + mx, 1.05 * u + my], fill=dark, outline=C.PAL['ink'])
    else:
        line([(-0.7, 0.0), (0.7, 0.0)], w=0.0)

EMOTE_TOP = ('steam', 'stars', 'cloud', 'bulb', 'scribble')

def backOut_e(k):
    k = clamp0(k)
    s = 1.9
    return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2

def emote(kind, x, y, s, k=1.0, age=0.0):
    p = backOut_e(k)
    if p < 0.02:
        return
    sw = max(0.4, min(2.4, s / 15))
    save = C.CAM
    C.camEnd()
    D = C.D
    def dot(dx, col):
        D.ellipse([x + dx - 0.21 * s, y + s - 0.21 * s, x + dx + 0.21 * s, y + s + 0.21 * s],
                  fill=col, outline=C.PAL['ink'])
    def bang(dx, col):
        rot = 0.1 + 0.08 * math.sin(age * 16) * math.exp(-age * 3)
        ca, sa = math.cos(rot), math.sin(rot)
        base = [(-0.62 * s, -2.3 * s), (0.62 * s, -2.3 * s), (0.22 * s, 0.45 * s), (-0.22 * s, 0.45 * s)]
        pts = [(x + (px * ca - py * sa), y + (px * sa + py * ca)) for px, py in base]
        D.polygon(pts, fill=col, outline=C.PAL['ink'])
        dot(0, col)
    def quest(dx, col):
        rot = -0.08 + 0.08 * math.sin(age * 12) * math.exp(-age * 3)
        ca, sa = math.cos(rot), math.sin(rot)
        base = [(-1 * s, -1.3 * s), (-0.55 * s, -2.15 * s), (0.35 * s, -2.3 * s),
                (1 * s, -1.6 * s), (0.7 * s, -0.75 * s), (0.05 * s, -0.3 * s), (0, 0.4 * s)]
        pts = [(x + (px * ca - py * sa), y + (px * sa + py * ca)) for px, py in base]
        D.polygon(C.through([list(p) for p in pts]), fill=C.PAL['sky'], outline=C.PAL['ink'])
        dot(0, col)
    if kind == '!': bang(0, C.PAL['ochre'])
    elif kind == '?': quest(0, C.PAL['sky'])
    elif kind == '!!': bang(-0.8 * s, C.PAL['ochre']); bang(0.9 * s, C.PAL['ochre'])
    elif kind == '!?': bang(-0.9 * s, C.PAL['ochre']); quest(1.0 * s, C.PAL['sky'])
    elif kind == 'zzz':
        for i in range(3):
            ph = (age * 0.4 + i / 3) - math.floor(age * 0.4 + i / 3)
            a = math.sin(ph * math.pi)
            zs = (0.8 + ph * 0.7) * s * min(1, a * 1.6)
            if a < 0.12:
                continue
            zx = ph * 2.6 * s; zy = -ph * 4.2 * s
            Z = [[-0.6, -0.6], [0.6, -0.6], [0.6, -0.28], [-0.12, 0.3], [0.6, 0.3], [0.6, 0.6],
                 [-0.6, 0.6], [-0.6, 0.28], [0.12, -0.3], [-0.6, -0.3]]
            rot = -0.15 + 0.1 * math.sin(age * 2 + i)
            ca, sa = math.cos(rot), math.sin(rot)
            rpts = [(x + zx + (px * ca - py * sa) * zs, y + zy + (px * sa + py * ca) * zs) for px, py in Z]
            D.polygon(rpts, fill=C.PAL['sky'], outline=C.PAL['ink'])
    elif kind == 'sweat':
        for dx, dy_, r in ((0, 0, 1), (1.6, 1.4, 0.7)):
            D.polygon([(x + dx, y + dy_ - 1.6 * r * s), (x + dx + 0.9 * r * s, y + dy_ + 0.2 * r * s),
                       (x + dx, y + dy_ + 0.9 * r * s), (x + dx - 0.9 * r * s, y + dy_ + 0.2 * r * s)],
                      fill=C.PAL['sky'], outline=C.PAL['ink'])
    elif kind == 'heart':
        tw = 1 + 0.12 * math.exp(-(age - math.floor(age)) * 6)
        D.polygon(C.heartPts(x, y, s * 0.9 * tw), fill=C.hex2('#E2476E'), outline=C.PAL['ink'])
    elif kind == 'bulb':
        gl = 0.5 + 0.5 * math.sin(age * 10)
        C.glow(x, y - 1.4 * s, 4.5 * s, '#FFD27A', 0.75 + 0.25 * gl)
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * 0.45
            D.line([(x + math.cos(a) * 1.6 * s, y - 1.4 * s + math.sin(a) * 1.6 * s),
                    (x + math.cos(a) * 2.6 * s, y - 1.4 * s + math.sin(a) * 2.6 * s)],
                   fill=C.PAL['ochre'], width=swi(sw * 0.8))
        D.ellipse([x - 0.575 * s, y - 1.98 * s, x + 0.575 * s, y - 0.82 * s], fill=C.hex2('#FFE68A'), outline=C.PAL['ink'])
        D.rectangle([x - 0.5 * s, y - 0.3 * s, x + 0.5 * s, y + 0.5 * s], fill=C.hex2('#9A93A8'), outline=C.PAL['ink'])
    elif kind == 'stars':
        for i in range(3):
            a = age * 5 + i * math.pi * 2 / 3
            d = 0.75 + 0.25 * math.sin(a)
            D.polygon(C.starPts(x + math.cos(a) * 4.2 * s, y + math.sin(a) * s,
                                0.375 * s * d, 0.45, 5, age * 3)),
    elif kind == 'scribble':
        pts = []
        for i in range(34):
            a = i * 0.95
            r = (1.1 + 0.5 * math.sin(i * 1.7)) * s
            pts.append([x + math.cos(a) * r * 1.5 + C.jit(0.2 * s),
                        y + math.sin(a) * r * 0.8 + C.jit(0.2 * s)])
        C.inkLine(pts, sw * 0.8, C.PAL['ink'])
    elif kind == 'cloud':
        bob = math.sin(age * 2) * 0.15 * s
        c = []
        for i in range(40):
            a = i / 40 * math.pi * 2
            up = math.sin(a) < 0
            r = 1 + 0.38 * math.pow(abs(math.sin(a * 3)), 0.6) if up else 1
            c.append([x + math.cos(a) * 2.8 * s * (r * 0.92 if up else 1),
                      y + bob - 0.2 * s + math.sin(a) * (1.35 if up else 0.7) * s * r])
        for i in range(6):
            ph = (age * 2.4 + C.hashv(i)) - math.floor(age * 2.4 + C.hashv(i))
            rx = (-2 + i * 0.8) * s; ry = (0.7 + ph * 2) * s
            D.line([(rx, ry), (rx - 0.12 * s, ry + 0.7 * s)],
                   fill=C.mixCol(C.PAL['sky'], C.PAL['indigo'], 0.3), width=swi(sw * 1.1))
        D.polygon(c, fill=C.hex2('#A3A8C4'), outline=C.PAL['ink'])
    if save:
        C.camBegin(*save)

# ---------------- character builder ----------------

def human(x, y, u, o=None):
    """One painted figure. (x, y) = world position of the feet, u = one unit in px."""
    o = o or {}
    style = STYLES.get(o.get('style', 'moses'), STYLES['moses'])
    view = o.get('view', 'front')
    flip = bool(o.get('flip', False))
    sxm = -1.0 if flip else 1.0
    dx = (o.get('dx', 0) or 0) * u
    dy = (o.get('dy', 0) or 0) * u
    sq = o.get('sq', 0) or 0
    rot = o.get('rot', 0) or 0
    walk = o.get('walk')
    C.boilSeed('fig %d %d' % (int(o.get('boilKey', 0)), int(C._T * 12)))
    z = C.CAM[2] if C.CAM else 1.0
    iw = C.clamp(u / 15.0, 0.45, 2.4) * (o.get('swMul', 1.0) or 1.0)
    cx = x + dx
    cy = y + dy
    ux = u * (1 + sq * 0.55)
    uy = u * (1 - sq)
    ca, sa = math.cos(rot), math.sin(rot)

    class _DProxy:
        def __getattr__(self, k):
            return getattr(C.D, k)

    D = _DProxy()
    INK = C.hex2rgb(C.PAL['ink'])
    J = 0.045

    # --- colours (with optional tint wash) ---
    tc = o.get('tint'); kt = clamp0(o.get('tintK', 1.0))
    robe = C.mixCol(style['robe'], tc, 0.55 * kt) if tc else style['robe']
    tunic = C.mixCol(style['tunic'], tc, 0.45 * kt) if tc else style['tunic']
    skin = C.mixCol(style['skin'], tc, 0.30 * kt) if tc else style['skin']
    hair = C.mixCol(style['hair'], tc, 0.20 * kt) if tc else style['hair']
    beard_col = style['beard'] or hair
    if o.get('old'):
        hair = C.mixCol(hair, C.PAL['cream'], 0.7)
        beard_col = C.mixCol(beard_col, C.PAL['cream'], 0.75)

    # --- local -> world -> screen ---
    def UW(lx, ly):
        px, py = lx * sxm * ux, ly * uy
        return [cx + px * ca - py * sa, cy + px * sa + py * ca]

    def U(lx, ly):
        return C.to_screen(UW(lx, ly))

    def poly(pts, fill, ink=True, w=1.0):
        S = [U(a + C.jit(J), b + C.jit(J)) for a, b in pts]
        D.polygon(S, fill=C.hex2rgb(fill) if isinstance(fill, str) else fill)
        if ink:
            D.line(S + [S[0]], fill=INK, width=max(1, int(round(iw * w * z))), joint='curve')
        return S

    def disc(cxl, cyl, rx, ry, fill, ink=True, w=1.0, n=18):
        pts = [[cxl + math.cos(i / n * math.pi * 2) * rx,
                cyl + math.sin(i / n * math.pi * 2) * ry] for i in range(n)]
        return poly(pts, fill, ink, w)

    # --- proportions (units, y up = negative) ---
    side = view == 'side'
    sh_y = -6.85
    hem_y = -1.55
    half_sh = 1.35 if side else 2.05
    half_hem = 1.75 if side else 2.70
    head_cy = -9.05
    head_rx = 1.5 if side else 1.9
    head_ry = 1.9
    brow_y = head_cy - 0.72

    # shadow
    if not o.get('noShadow'):
        sp = []
        for i in range(18):
            a = i / 18 * math.pi * 2
            wpt = UW(math.cos(a) * 2.6, 0.05 + math.sin(a) * 0.45)
            sp.append(wpt)
        C.paint(sp, {'fill': C.PAL['ink'], 'fillOp': 40, 'ink': None})

    # legs + feet
    leg_col = C.mixCol(robe, C.PAL['ink'], 0.38)
    foot_col = C.mixCol(C.PAL['ink'], robe, 0.30)
    for i, lxc in enumerate((-0.95, 0.95)):
        sw_off = 0.0
        if walk is not None:
            ph = (walk + (0.5 if i else 0.0)) * math.pi * 2
            sw_off = math.sin(ph) * 0.40
        disc(lxc + sw_off + 0.12, -0.10, 0.62, 0.30, foot_col)
        poly([(lxc - 0.40 + sw_off, -0.15), (lxc + 0.40 + sw_off, -0.15),
              (lxc + 0.44, hem_y + 0.55), (lxc - 0.44, hem_y + 0.55)], leg_col, ink=False)

    # robe
    poly([(-half_sh, sh_y), (half_sh, sh_y), (half_hem, hem_y), (-half_hem, hem_y)], robe)
    # central tunic stripe
    poly([(-0.42, sh_y + 0.25), (0.42, sh_y + 0.25), (0.60, hem_y + 0.10), (-0.60, hem_y + 0.10)], tunic)
    # belt
    band = C.mixCol(robe, C.PAL['ink'], 0.40)
    poly([(-half_sh * 0.95, -4.30), (half_sh * 0.95, -4.30),
          (half_sh * 1.05, -3.70), (-half_sh * 1.05, -3.70)], band)
    # hem folds
    for fx in (-1.5, -0.5, 0.5, 1.5):
        p0 = U(fx, hem_y + 0.05); p1 = U(fx * 1.05, hem_y + 0.55)
        D.line([p0, p1], fill=INK, width=max(1, int(round(iw * 0.6 * z))))

    # arms
    def arm(sd, ang, hook=None):
        shx = sd * (half_sh - 0.15)
        shy = sh_y + 0.45
        a = ang if ang is not None else 0.18
        L = 3.45
        hx = shx + sd * math.sin(a) * L
        hy = shy + math.cos(a) * L
        sleeve = C.mixCol(robe, C.PAL['ink'], 0.45)
        ex = (shx + hx) * 0.5 + sd * 0.22 * math.sin(a) * L
        ey = (shy + hy) * 0.5
        S = [U(shx, shy), U(ex, ey), U(hx, hy)]
        D.line(S, fill=C.hex2rgb(sleeve), width=max(4, int(round(iw * 3.2 * z))), joint='curve')
        D.line(S + [S[-1]], fill=INK, width=max(1, int(round(iw * 0.55 * z))), joint='curve')
        disc(hx, hy, 0.42, 0.42, skin)
        if hook:
            hook(UW(hx, hy), u * 0.9, iw * 1.2)

    armL = o.get('armL'); armR = o.get('armR')
    if side:
        arm(1.0, o.get('aR', 0.18), o.get('armR'))
    else:
        arm(-1.0, o.get('aL', 0.18), None)
        arm(1.0, o.get('aR', 0.18), armR)

    # neck
    poly([(-0.52, sh_y + 0.15), (0.52, sh_y + 0.15), (0.58, head_cy + 1.45), (-0.58, head_cy + 1.45)],
         C.mixCol(skin, C.PAL['ink'], 0.12))

    # hair mass behind the head (frames the face)
    disc(0, head_cy + 0.16, head_rx * 1.12, head_ry * 1.10, hair, ink=True)
    # head
    disc(0, head_cy, head_rx, head_ry, skin)
    # hair cap over the crown, down to the brow
    cap = []
    for i in range(15):
        a = math.pi + i / 14 * math.pi
        cap.append([math.cos(a) * head_rx * 1.12, head_cy + 0.16 + math.sin(a) * head_ry * 1.10])
    cap.append([head_rx * 1.12, brow_y])
    cap.append([-head_rx * 1.12, brow_y])
    poly(cap, hair)

    # beard (grows down from the cheeks)
    if o.get('beard'):
        ct = head_cy + 1.22
        bw = head_rx * 0.62
        poly([(-bw, ct), (bw, ct), (bw * 1.10, ct + 0.40), (bw * 0.60, ct + 0.95),
              (0, ct + 1.20), (-bw * 0.60, ct + 0.95), (-bw * 1.10, ct + 0.40)], beard_col)

    # face
    sides = [1] if side else [-1, 1]
    fcx, fcy = U(0.0, head_cy - 0.15)
    uu = head_rx * ux * z * 0.175
    eyes(uu, {'eyes': o.get('eyes', 'normal'), 'squint': o.get('squint', 0),
              'lookX': o.get('lookX', 0), 'lookY': o.get('lookY', 0),
              'seed': o.get('seed', 0), 'T': o.get('T', C._T)},
         iw, fcx, fcy, sides, D, sep=0.95 if not side else 0.0)

    if o.get('mouth'):
        mx_, my_ = U(0.0, head_cy + 0.80)
        mouth(head_rx * ux * z * 0.175, {'mouth': o['mouth'], 'T': o.get('T', C._T)}, iw, mx_, my_, D)

    # blush
    if o.get('blush', 0) > 0:
        b = clamp0(o['blush'])
        for s in sides:
            bx_, by_ = U(s * head_rx * 0.72, head_cy + 0.35)
            rad = head_rx * ux * z * 0.16 * b
            D.ellipse([bx_ - rad, by_ * 1.0 - rad * 0.55, bx_ + rad, by_ + rad * 0.55],
                      fill=C.hex2rgb(C.mixCol(C.PAL['rose'], C.PAL['ink'], 0.2)))

    # hat
    if o.get('hat') == 'crown':
        cb = head_cy - head_ry * 0.88
        poly([(-head_rx * 0.92, cb), (-head_rx * 0.92, cb - 1.35), (-head_rx * 0.42, cb - 0.55),
              (0, cb - 1.65), (head_rx * 0.42, cb - 0.55), (head_rx * 0.92, cb - 1.35),
              (head_rx * 0.92, cb)], C.hex2('#F2C53D'))
    elif o.get('hat') == 'hood':
        poly([(-head_rx * 1.3, head_cy + 0.9), (0, head_cy - 3.4),
              (head_rx * 1.3, head_cy + 0.9), (head_rx * 1.5, head_cy + 1.6),
              (0, head_cy - 1.2), (-head_rx * 1.5, head_cy + 1.6)], C.PAL['violet'])

    # gloom (despair)
    if (o.get('gloom') or 0) > 0.02:
        g = o['gloom']
        gx0, gy0 = U(-head_rx * 1.05, head_cy - head_ry * 1.1)
        gx1, gy1 = U(head_rx * 1.05, head_cy + head_ry * 0.1)
        D.polygon([(gx0, gy0), (gx1, gy0), (gx1, gy1), (gx0, gy1)],
                  fill=C.hex2rgb(C.mixCol(C.PAL['indigo'], C.PAL['ink'], 0.35 * g)))

    # emote
    if o.get('emote'):
        top = o['emote'] in EMOTE_TOP
        ex_, ey_ = U(0 if top else head_rx * 1.5, head_cy - (2.4 if top else 0.4))
        emote(o['emote'], ex_, ey_, head_rx * ux * z * 0.85,
              o.get('emoteK', 1.0), o.get('emoteAge', C._T))


# ---------------- cheap crowd silhouettes ----------------

def crowd(xs, base_y, u, t, style='hebrew'):
    st = STYLES.get(style, STYLES['hebrew'])
    for i, x0 in enumerate(xs):
        C.boilSeed('crowd %d %d' % (i, int(C._T * 24)))
        dx = 0.12 * math.sin(C._T * 3 + i)
        x = x0 + dx
        D = C.D
        # screen-space via camera
        r1 = C.to_screen([x - u * 1.6, base_y - u * 3.2]); r2 = C.to_screen([x + u * 1.6, base_y - u * 0.6])
        D.rectangle([r1[0], r1[1], r2[0], r2[1]], fill=st['robe'], outline=C.PAL['ink'])
        e1 = C.to_screen([x - u * 0.9, base_y - u * 4.1]); e2 = C.to_screen([x + u * 0.9, base_y - u * 2.3])
        D.ellipse([e1[0], e1[1], e2[0], e2[1]], fill=st['skin'], outline=C.PAL['ink'])
        l1 = C.to_screen([x - u * 1.1, base_y - u * 0.6]); l2 = C.to_screen([x - u * 0.5, base_y])
        D.rectangle([l1[0], l1[1], l2[0], l2[1]], fill=st['robe'], outline=C.PAL['ink'])
        r1 = C.to_screen([x + u * 0.5, base_y - u * 0.6]); r2 = C.to_screen([x + u * 1.1, base_y])
        D.rectangle([r1[0], r1[1], r2[0], r2[1]], fill=st['robe'], outline=C.PAL['ink'])
