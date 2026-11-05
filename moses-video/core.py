#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
core.py — p5.brush-inspired painting engine rendered with Pillow.
Every frame is a pure function of time t (set with set_t() before painting).
Hand-made medium: flat wash + ink outline, boiled jittery linework, paper + grain,
glow as additive light. Flat 2D only; depth from overlap/scale/colour.
"""

import math
import random
import zlib
from PIL import Image, ImageDraw, ImageChops, ImageFilter

W, H = 1920, 1080

PAL = {
    'paper':  '#F3EBDC', 'ink':   '#2B2233', 'clay':  '#D97757', 'clayDk': '#A84D33',
    'clayLt': '#F2A283', 'night': '#1F2550', 'indigo':'#2F3C7A', 'rose':   '#E27A92',
    'ochre':  '#E8AA38', 'sap':   '#6E9F58', 'teal':  '#3A9C98', 'violet': '#7B5CA8',
    'cream':  '#FFF5E2', 'sky':   '#8EC3E6', 'sand':  '#E6D4B8', 'sandDk': '#B89A5C',
    'nile':   '#2E5E6E', 'gold':  '#E8B84C', 'navy':  '#161A30', 'charcoal':'#4A4550',
}

def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

hex2 = hex2rgb

def mixCol(a, b, k):
    k = max(0.0, min(1.0, k))
    ra = hex2rgb(a); rb = hex2rgb(b)
    return '#%02x%02x%02x' % (
        int(ra[0] + (rb[0] - ra[0]) * k), int(ra[1] + (rb[1] - ra[1]) * k),
        int(ra[2] + (rb[2] - ra[2]) * k))

# ---------- stable randomness (boil) ----------
def hashv(i):
    return (zlib.crc32(str(i).encode('utf-8')) & 0xFFFFFFFF) / 0xFFFFFFFF

BOIL = 12                       # boil drawings hold for ~2 frames (12 new drawings / s)
_T = 0.0
_rng = random.Random()

def set_t(t):
    global _T
    _T = float(t)

def boiln():
    return int(math.floor(_T * BOIL))

def boilSeed(key):
    _rng.seed('%s|%d' % (str(key), boiln()))

def jit(a):
    return (_rng.random() * 2 - 1) * a

def rnd():
    return _rng.random()

# ---------- timing / motion ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))

def swi(x):
    return max(1, int(round(x)))

def lerp(a, b, x):
    return a + (b - a) * x

def seg(t, a, b):
    return clamp((t - a) / (b - a))

def ease(k):
    k = clamp(k)
    return k * k * (3 - 2 * k)

def easeIn(k):
    return clamp(k) ** 3

def easeOut(k):
    k = clamp(k)
    return 1 - (1 - k) ** 3

def backOut(k):
    k = clamp(k)
    s = 1.9
    return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2

def elasticOut(k):
    k = clamp(k)
    if k == 0 or k == 1:
        return k
    return math.pow(2, -10 * k) * math.sin((k * 10 - 0.75) * (math.pi * 2 / 3)) + 1

def kf(t, keys, e=ease):
    if t <= keys[0][0]:
        return keys[0][1]
    for i in range(1, len(keys)):
        if t < keys[i][0]:
            a, va = keys[i - 1]
            b, vb = keys[i]
            k = e((t - a) / (b - a))
            if isinstance(va, (list, tuple)):
                return [lerp(v, vb[j], k) for j, v in enumerate(va)]
            return lerp(va, vb, k)
    return keys[-1][1]

def pulse(t, k=6.0):
    bp = (_T - 0.0) / 1.0  # placeholder, replaced below
    return 1.0

def beatN(t, bpm=90.0, offset=0.0):
    return int(math.floor((t - offset) / (60.0 / bpm)))

def pulseB(t, bpm=90.0, offset=0.0, k=6.0):
    beat = (t - offset) / (60.0 / bpm)
    frac = beat - math.floor(beat)
    return math.exp(-frac * k)

def wob(t, f=1.0, ph=0.0):
    return math.sin((t * f + ph) * math.pi * 2)

def jump(t, t0, t1, h=3.0):
    """Crouch, arc, stretch, squash-land. Returns (dy, sq) in body units."""
    if t < t0 - 0.12:
        return 0.0, 0.0
    if t < t0:
        return 0.0, 0.18 * ease(seg(t, t0 - 0.12, t0))
    if t < t1:
        k = (t - t0) / (t1 - t0)
        return -h * 4 * k * (1 - k), -0.16 * abs(1 - 2 * k)
    a = t - t1
    return 0.0, 0.22 * math.exp(-8 * a) * math.cos(20 * a)

def take(t, t0, amt=1.0):
    if t < t0 - 0.1:
        return 0.0, 0.0
    if t < t0:
        return 0.0, 0.12 * amt * ease(seg(t, t0 - 0.1, t0))
    a = t - t0
    return -1.2 * amt * math.exp(-7 * a) * max(0.0, math.cos(9 * a)), -0.26 * amt * math.exp(-6 * a) * math.cos(16 * a)

def stroll(t, t0, t1, x0, x1, u):
    x = lerp(x0, x1, ease(seg(t, t0, t1)))
    moving = t0 < t < t1
    d = abs(x - x0) / (4 * u)
    dy = -abs(math.sin(d * math.pi)) * 0.5 if moving else 0.0
    view = 'q' if moving else 'front'
    flip = x1 < x0
    walk = d if moving else 0.0
    return x, walk, view, flip, dy

def spring(t, t0, k=6.0, w=18.0):
    if t < t0:
        return 0.0
    a = t - t0
    return math.exp(-k * a) * math.sin(w * a)

def ring(t, evs, k=6.0, w=18.0):
    return sum(spring(t, e, k, w) for e in evs)

def arcPt(p0, p1, h, k):
    return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)]

def onTwos(t):
    return math.floor(t * 12 + 1e-6) / 12

# ---------- geometry ----------
def rectPts(x, y, w, h, j=0):
    return [
        [x + jit(j), y + jit(j)],
        [x + w * 0.5 + jit(j) * 0.5, y + jit(j)],
        [x + w + jit(j), y + jit(j)],
        [x + w + jit(j) * 0.5, y + h * 0.5],
        [x + w + jit(j), y + h + jit(j)],
        [x + w * 0.5 + jit(j) * 0.5, y + h + jit(j)],
        [x + jit(j), y + h + jit(j)],
        [x + jit(j) * 0.5, y + h * 0.5],
    ]

def ellPts(cx, cy, rx, ry, n=28, j=0, rot=0.0):
    p = []
    for i in range(n):
        a = rot + i / n * math.pi * 2
        p.append([cx + math.cos(a) * rx + jit(j), cy + math.sin(a) * ry + jit(j)])
    return p

def rrPts(x, y, w, h, r, j=0):
    p = []
    segn = 6
    def corner(cx, cy, a0):
        for i in range(segn + 1):
            a = a0 + i / segn * math.pi / 2
            p.append([cx + math.cos(a) * r + jit(j), cy + math.sin(a) * r + jit(j)])
    corner(x + w - r, y + r, -math.pi / 2)
    corner(x + w - r, y + h - r, 0.0)
    corner(x + r, y + h - r, math.pi / 2)
    corner(x + r, y + r, math.pi)
    return p

def starPts(cx, cy, r, inner=0.38, n=4, rot=-math.pi / 2):
    p = []
    for i in range(n * 2):
        a = rot + i * math.pi / n
        q = r * inner if i % 2 else r
        p.append([cx + math.cos(a) * q, cy + math.sin(a) * q])
    return p

def heartPts(cx, cy, r, n=22):
    p = []
    for i in range(n):
        a = i / n * math.pi * 2
        p.append([cx + 16 * math.pow(math.sin(a), 3) * r / 16,
                  cy - (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) * r / 16])
    return p

def through(P, n=6):
    if len(P) < 3:
        return P[:]
    out = []
    for i in range(len(P) - 1):
        p0 = P[max(0, i - 1)]; p1 = P[i]; p2 = P[i + 1]; p3 = P[min(len(P) - 1, i + 2)]
        for k in range(n):
            u = k / n
            u2 = u * u; u3 = u2 * u
            pt = [0.5 * (2 * p1[d] + (p2[d] - p0[d]) * u +
                 (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 +
                 (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3) for d in (0, 1)]
            out.append(pt)
    out.append(P[-1])
    return out

def ribbon(P, w0, w1=None):
    if w1 is None:
        w1 = w0
    C = through(P)
    n = len(C)
    L, R = [], []
    for i in range(n):
        a = C[max(0, i - 1)]; b = C[min(n - 1, i + 1)]
        dx = b[0] - a[0]; dy = b[1] - a[1]
        d = math.hypot(dx, dy) or 1.0
        w = lerp(w0, w1, i / max(1, n - 1)) / 2.0
        L.append([C[i][0] - dy / d * w, C[i][1] + dx / d * w])
        R.append([C[i][0] + dy / d * w, C[i][1] - dx / d * w])
    return L + list(reversed(R))

# ---------- camera ----------
CAM = None

def camBegin(cx=W / 2, cy=H / 2, zoom=1.0):
    global CAM
    CAM = (cx, cy, zoom)

def camEnd():
    global CAM
    CAM = None

def to_screen(p):
    if CAM is None:
        return [p[0], p[1]]
    cx, cy, z = CAM
    return [(p[0] - cx) * z + W / 2, (p[1] - cy) * z + H / 2]

def shakeXY(t, amt):
    f = int(math.floor(t * 24))
    return [(hashv(f * 1.7) - 0.5) * 2 * amt, (hashv(f * 2.3 + 9) - 0.5) * 2 * amt]

# ---------- frame buffer ----------
IMG = None          # PIL RGB image being painted into
D = None            # ImageDraw
ZOOM = 1.0          # current camera zoom (for outline weight scaling)

def begin_frame(bg=PAL['paper']):
    global IMG, D
    IMG = Image.new('RGB', (W, H), hex2rgb(bg))
    D = ImageDraw.Draw(IMG)

def get_frame():
    return IMG

# ---------- painting ----------
def screen_pts(pts):
    return [to_screen(p) for p in pts]

def paint(pts, o=None):
    """One painted shape. wash = flat fill; fill = watercolour alpha fill; ink = outline."""
    o = o or {}
    global ZOOM, IMG, D
    z = CAM[2] if CAM else 1.0
    ZOOM = z
    S = screen_pts(pts)
    if len(S) < 2:
        return
    # fill
    if o.get('wash') or o.get('fill'):
        col = o.get('wash') or o.get('fill')
        op = o.get('washOp' if o.get('wash') else 'fillOp', 255)
        rgb = hex2rgb(col) if isinstance(col, str) else col
        if op >= 254:
            D.polygon(S, fill=rgb)
        else:
            layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer)
            ld.polygon(S, fill=rgb + (int(op),))
            IMG = Image.alpha_composite(IMG.convert('RGBA'), layer).convert('RGB')
            D = ImageDraw.Draw(IMG)
    # hatch (sparse parallel lines)
    if o.get('hatch'):
        h = o['hatch']
        d = h.get('d', 44); a = h.get('a', 0)
        col = h.get('c', PAL['ink']); w = h.get('w', 1.0)
        # bounding box of shape
        xs = [p[0] for p in S]; ys = [p[1] for p in S]
        x0, x1 = min(xs), max(xs); y0, y1 = min(ys), max(ys)
        ca, sa = math.cos(a), math.sin(a)
        step = d
        n = int(math.hypot(x1 - x0, y1 - y0) / step) + 2
        for i in range(-n, n + 1):
            t = i * step
            p1 = [x0 + t * ca - 2000 * sa, y0 + t * sa + 2000 * ca]
            p2 = [x1 + t * ca + 2000 * sa, y1 + t * sa - 2000 * ca]
            D.line([p1, p2], fill=hex2rgb(col), width=max(1, w))
    # outline
    if o.get('ink') is not None:
        col = o.get('ink', PAL['ink'])
        sw = o.get('sw', 1.0) * z
        sw = max(0.25, sw)
        rgb = hex2rgb(col) if isinstance(col, str) else col
        D.line(S + [S[0]], fill=rgb, width=swi(sw), joint='curve')

def inkLine(pts, sw=1.0, col=PAL['ink'], br='ink', curv=0.5):
    """Textured stroke along points. 'ink' = solid; 'dry' = bristly broken stroke."""
    global ZOOM
    z = CAM[2] if CAM else 1.0
    ZOOM = z
    S = screen_pts(pts)
    if len(S) < 2:
        return
    sw = max(0.25, sw * z)
    # boil wobble on the stroke
    j = jit(sw * 0.10)
    Sj = [[p[0] + jit(sw * 0.06), p[1] + jit(sw * 0.06)] for p in S]
    if br == 'dry':
        # bristly: spaced dashes
        for i in range(len(Sj) - 1):
            a = Sj[i]; b = Sj[i + 1]
            dist = math.hypot(b[0] - a[0], b[1] - a[1])
            nseg = max(1, int(dist / 6.0))
            for k in range(nseg):
                k0 = k / nseg; k1 = (k + 0.7) / nseg
                p0 = [a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0]
                p1 = [a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1]
                if rnd() > 0.35:
                    rgb = hex2rgb(col) if isinstance(col, str) else col
                    D.line([p0, p1], fill=rgb, width=swi(sw * 0.9))
    else:
        rgb = hex2rgb(col) if isinstance(col, str) else col
        D.line(Sj, fill=rgb, width=swi(sw), joint='curve')

def glow(x, y, r, col='#FFC766', a=1.0):
    """Additive soft halo; drawn into the glow layer, composited at flush_glow()."""
    if a <= 0 or r < 1:
        return
    sx, sy = to_screen([x, y])
    if CAM:
        r = r * CAM[2]
    _glow.append((sx, sy, r, col, a))

_glow = []

def flush_glow():
    if not _glow:
        return
    global IMG
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for (x, y, r, col, a) in _glow:
        rr = r * (1 + jit(0.03))
        rgb = hex2rgb(col)
        steps = max(4, int(rr / 8))
        for s in range(steps, 0, -1):
            k = s / steps
            al = int(255 * (1 - k) * k * 1.5 * a)
            if al <= 0:
                continue
            rad = rr * k
            ld.ellipse([x - rad, y - rad * 0.55, x + rad, y + rad * 0.55],
                       fill=(rgb[0], rgb[1], rgb[2], min(255, al)))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=16))
    screened = ImageChops.screen(IMG, layer.convert('RGB'))
    IMG = Image.blend(IMG, screened, 0.85)
    _glow.clear()

# ---------- full-frame effects ----------
def flash(k, col='#FFFDF6'):
    if k > 0.01:
        paint(rectPts(-60, -60, W + 120, H + 120),
              {'wash': col, 'washOp': 255 * clamp(k), 'ink': None})

def brushWipe(p, cols=(PAL['clayDk'], PAL['clay'])):
    """Fat strokes cover the frame (p 0 -> 0.5) then drag off (0.5 -> 1). Call last."""
    if p <= 0 or p >= 1:
        return
    c1, c2 = cols
    n = 5
    bh = (H + 420) / n + 40
    # screen-space: no camera
    save_cam = CAM
    camEnd()
    push_rot = -0.1
    for i in range(n):
        y0 = -230 + i * (H + 420) / n
        d = [0, 0.14, 0.06, 0.18, 0.1][i]
        if p < 0.5:
            q = easeOut(clamp((p * 2 - d) / (1 - d)))
            x0 = -300.0
            x1 = lerp(-300, W + 400, q)
        else:
            q = ease(clamp(((p - 0.5) * 2 - d) / (1 - d)))
            x0 = lerp(-300, W + 400, q)
            x1 = W + 400.0
        if x1 - x0 < 30:
            continue
        pts = []
        for k in range(0, 9):
            pts.append([lerp(x0, x1, k / 8.0), y0 + math.sin(k * 0.9 + i) * 14 + jit(5)])
        for k in range(1, 9):
            pts.append([x1 + 40 + 50 * hashv(i * 31 + k) + jit(12), y0 + bh * k / 9.0])
        for k in range(8, -1, -1):
            pts.append([lerp(x0, x1, k / 8.0), y0 + bh + math.sin(k * 0.8 + i * 2) * 14 + jit(5)])
        if p >= 0.5:
            for k in range(8, 0, -1):
                pts.append([x0 - 40 - 50 * hashv(i * 31 + k + 20) + jit(12), y0 + bh * k / 9.0])
        col = c1 if i % 2 else c2
        paint(pts, {'wash': col, 'washOp': 255, 'fill': col if i % 2 else PAL['cream'], 'fillOp': 70,
                    'bleed': 0.05, 'tex': 0.8, 'border': 0.6, 'ink': None,
                    'hatch': {'d': 44, 'a': 0, 'o': {'rand': 0.6}, 'b': 'charcoal', 'c': PAL['cream'], 'w': 0.8}})
    if save_cam:
        camBegin(*save_cam)

def irisShape(pts, col=PAL['ink']):
    """Paint everything outside the given polygon hole (screen space)."""
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    far = 4000
    out = lambda p: [cx + (p[0] - cx) / max(math.hypot(p[0] - cx, p[1] - cy), 1) * far,
                     cy + (p[1] - cy) / max(math.hypot(p[0] - cx, p[1] - cy), 1) * far]
    save = CAM
    camEnd()
    for i in range(n):
        a = pts[i]; b = pts[(i + 1) % n]
        ex = (b[0] - a[0]) * 0.06; ey = (b[1] - a[1]) * 0.06
        a2 = [a[0] - ex, a[1] - ey]; b2 = [b[0] + ex, b[1] + ey]
        quad = [a2, b2, out(b2), out(a2)]
        paint(quad, {'wash': col, 'washOp': 255, 'ink': None})
    if save:
        camBegin(*save)

def iris(cx, cy, r, col=PAL['ink']):
    if r < 4:
        paint(rectPts(-60, -60, W + 120, H + 120), {'wash': col, 'washOp': 255, 'ink': None})
    else:
        irisShape(ellPts(cx, cy, r, r, 40), col)

def spotDark(cx, cy, r, a):
    """Vignette spotlight: keeps the circle lit, darkens outside with soft edge (screen space)."""
    if a <= 0:
        return
    save = CAM
    camEnd()
    layer = Image.new('L', (W, H), 0)
    ld = ImageDraw.Draw(layer)
    ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    layer = layer.filter(ImageFilter.GaussianBlur(radius=r * 0.25))
    dark = Image.new('RGB', (W, H), hex2rgb(PAL['night']))
    darkened = Image.blend(IMG, dark, a)
    IMG.paste(Image.composite(IMG, darkened, layer))
    if save:
        camBegin(*save)

# ---------- paper & grain ----------
def _lcg(seed):
    s = seed
    while True:
        s = (s * 16807) % 2147483647
        yield s / 2147483647

_PAPER = None
_GRAIN = None

def _make_paper():
    g = Image.new('RGB', (W, H), hex2rgb(PAL['paper']))
    rnd = _lcg(11)
    # soft noise blobs
    buf = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(buf)
    for _ in range(45):
        x = rnd.__next__() * W; y = rnd.__next__() * H
        rad = 120 + rnd.__next__() * 380
        col = (160, 125, 80)
        al = int(0.045 * rnd.__next__() * 255)
        # radial gradient approximated by nested ellipses
        for s in range(12, 0, -1):
            k = s / 12.0
            rr = rad * k
            aa = int(al * k * k)
            if aa > 0:
                bd.ellipse([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], fill=col + (aa,))
    g = Image.composite(buf.convert('RGB'), g, buf.getchannel('A'))
    # fine grain strokes
    buf = Image.new('L', (W, H), 0)
    bd = ImageDraw.Draw(buf)
    for _ in range(900):
        x = rnd.__next__() * W; y = rnd.__next__() * H
        l = 6 + rnd.__next__() * 26
        a = rnd.__next__() * math.pi * 2
        al = int((0.035 + rnd.__next__() * 0.06) * 255)
        x2 = x + math.cos(a) * l; y2 = y + math.sin(a) * l
        bd.line([x, y, x2, y2], fill=al, width=1)
    g = Image.blend(g, ImageChops.multiply(g, Image.merge('RGB', (buf, buf, buf))), 0.5)
    return g

def _make_grain():
    id_ = Image.new('L', (W, H))
    put = id_.putpixel
    rnd = _lcg(5)
    for y in range(H):
        for x in range(W):
            pass
    return id_

def make_grain():
    # fast grain: noise image via frombytes
    rnd = _lcg(5)
    total = W * H
    vals = bytearray(total)
    for i in range(total):
        v = rnd.__next__()
        vals[i] = int(255 - (v * v * 34 if v < 0.55 else 0))
    img = Image.frombytes('L', (W, H), bytes(vals))
    # darken the noise a little, then mask with a vignette (centre keeps grain, edges fade to white paper)
    dark_lum = Image.new('L', (W, H), int(0.35 * 255))
    grain_lum = ImageChops.screen(img, dark_lum)
    grain_rgb = Image.merge('RGB', (grain_lum, grain_lum, grain_lum))
    vign = Image.new('L', (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.ellipse([-W * 0.05, -H * 0.05, W * 1.05, H * 1.05], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(radius=H * 0.4))
    return Image.composite(grain_rgb, Image.new('RGB', (W, H), (255, 255, 255)), vign)

def paper_texture():
    global _PAPER
    if _PAPER is None:
        _PAPER = _make_paper()
    return _PAPER

def grain_texture():
    global _GRAIN
    if _GRAIN is None:
        _GRAIN = make_grain()
    return _GRAIN

# remove leftover helper
del _make_grain

def composite(IMG):
    """Multiply paper texture + grain over the painted frame."""
    out = Image.blend(IMG, ImageChops.multiply(IMG, paper_texture()), 0.30)
    out = Image.blend(out, ImageChops.multiply(out, grain_texture()), 0.45)
    return out

def save_frame(path, q=90):
    out = composite(IMG)
    out.convert('RGB').save(path, 'JPEG', quality=q, optimize=True)
