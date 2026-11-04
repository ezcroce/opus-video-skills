#!/usr/bin/env python3
"""Procedural orchestral score + Italian narration + SFX for the Noah video."""
import numpy as np, wave, subprocess, os, math
import imageio_ffmpeg

SR = 44100
DUR = 175.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)

class Buf:
    def __init__(self, n=N):
        self.L = np.zeros(n, dtype=np.float64); self.R = np.zeros(n, dtype=np.float64)
    def add(self, start, sig, gain=1.0, pan=0.0):
        i0 = int(start * SR)
        if i0 >= len(self.L): return
        if i0 < 0: sig = sig[-i0:]; i0 = 0
        i1 = min(len(self.L), i0 + len(sig))
        if i1 <= i0: return
        seg = sig[:i1 - i0] * gain
        l = math.sqrt(0.5 * (1 - pan)); r = math.sqrt(0.5 * (1 + pan))
        self.L[i0:i1] += seg * l; self.R[i0:i1] += seg * r

def env(n, a=0.02, d=0.1, s=0.7, r=0.2, total=None):
    total = total or n
    e = np.zeros(n)
    a_n = max(1, int(a * SR)); d_n = max(1, int(d * SR)); r_n = max(1, int(r * SR))
    s_n = max(0, n - a_n - d_n - r_n)
    e[:a_n] = np.linspace(0, 1, a_n) ** 1.5
    if d_n: e[a_n:a_n + d_n] = np.linspace(1, s, d_n)
    if s_n: e[a_n + d_n:a_n + d_n + s_n] = s
    if r_n:
        st = a_n + d_n + s_n
        e[st:st + r_n] = np.linspace(s, 0, r_n) ** 1.2
    return e

def osc(freq, n, kind='sine', detune=0.0, vib=0.0, vibf=5.0, phase=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * vibf * t + phase))
    ph = 2 * np.pi * np.cumsum(f) / SR + phase
    if kind == 'sine': return np.sin(ph)
    if kind == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == 'saw':
        out = np.zeros(n)
        for k in range(1, 9): out += np.sin(k * ph) / k
        return out * 0.55
    if kind == 'softsaw':
        out = np.zeros(n)
        for k in range(1, 7): out += np.sin(k * ph) / (k * k)
        return out * 0.9
    return np.sin(ph)

def lowpass(x, cutoff):
    # simple one-pole lowpass
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y

def lowpass_fast(x, cutoff):
    # FFT brickwall-ish lowpass (sufficient for pads)
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (freqs / cutoff) ** 4)
    return np.fft.irfft(X, n=len(x))

def strings(freq, dur, amp=0.05, attack=0.5, release=1.2, pan=0.0, cutoff=1800, detune=0.004):
    n = int(dur * SR)
    e = env(n, attack, 0.2, 0.75, release)
    sig = np.zeros(n)
    for k, d in enumerate([-detune, 0, detune]):
        sig += osc(freq, n, 'softsaw', detune=d, vib=0.0025, vibf=4.6 + k * 0.3, phase=k * 1.7)
    sig = lowpass_fast(sig / 3, cutoff)
    return sig * e * amp

def choir(freq, dur, amp=0.05, attack=0.8, release=1.5, pan=0.0):
    n = int(dur * SR)
    e = env(n, attack, 0.3, 0.8, release)
    sig = np.zeros(n)
    # formant-ish "ah"
    for k, (mul, a) in enumerate([(1, 1.0), (2, 0.5), (3, 0.35), (4, 0.18), (5, 0.12), (6, 0.08)]):
        sig += a * osc(freq * mul, n, 'sine', vib=0.004, vibf=4.2 + k * 0.2, phase=k)
    sig = lowpass_fast(sig, 2200)
    return sig * e * amp

def flute(freq, dur, amp=0.08, attack=0.06, release=0.25, pan=0.0):
    n = int(dur * SR)
    e = env(n, attack, 0.05, 0.85, release)
    t = np.arange(n) / SR
    sig = osc(freq, n, 'sine', vib=0.006, vibf=5.2) + 0.18 * osc(freq * 2, n, 'sine', vib=0.006, vibf=5.2)
    breath = lowpass_fast(rng.normal(0, 1, n), 3000) * 0.05
    return (sig + breath) * e * amp

def harp(freq, dur, amp=0.07, pan=0.0):
    n = int(dur * SR)
    e = np.exp(-np.arange(n) / SR * 3.2)
    e *= np.minimum(1, np.arange(n) / (0.005 * SR))
    sig = np.zeros(n)
    for k in range(1, 7):
        sig += np.sin(2 * np.pi * freq * k * np.arange(n) / SR + k * 0.3) / (k ** 1.6)
    return sig * e * amp

def piano(freq, dur, amp=0.07, pan=0.0):
    n = int(dur * SR)
    e = np.exp(-np.arange(n) / SR * 2.2)
    e *= np.minimum(1, np.arange(n) / (0.004 * SR))
    sig = np.zeros(n)
    for k in range(1, 8):
        sig += np.sin(2 * np.pi * freq * k * np.arange(n) / SR + k * 0.7) / (k ** 1.8)
    return sig * e * amp

def brass(freq, dur, amp=0.06, attack=0.25, release=0.5, pan=0.0, cutoff=1400):
    n = int(dur * SR)
    e = env(n, attack, 0.15, 0.8, release)
    sig = osc(freq, n, 'saw', vib=0.002, vibf=4.0)
    sig = lowpass_fast(sig, cutoff)
    return np.tanh(sig * 1.4) * e * amp

def timpani(freq=70, dur=2.5, amp=0.18, pan=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.35 * np.exp(-t * 8))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t * 1.8)
    sig += lowpass_fast(rng.normal(0, 1, n), 400) * np.exp(-t * 12) * 0.5
    return sig * amp

def cymbal(dur=3.0, amp=0.05, pan=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = rng.normal(0, 1, n)
    # highpass by subtracting a lowpassed version
    sig = sig - lowpass_fast(sig, 5000)
    return sig * np.exp(-t * 1.4) * amp

def boom(dur=3.0, amp=0.15, pan=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 55 * (1 + 0.5 * np.exp(-t * 5))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 1.2) * amp

# chord progressions (MIDI note numbers)
def chord(name):
    return {
        'D':  [50, 57, 62, 66], 'A':  [45, 52, 57, 61], 'Bm': [47, 54, 59, 62], 'G':  [43, 50, 55, 59],
        'F#m':[42, 49, 54, 57], 'Em': [40, 47, 52, 55], 'Dm': [38, 50, 53, 57], 'Bb': [34, 46, 50, 53],
        'Gm': [31, 43, 46, 50], 'C':  [36, 48, 52, 55], 'Am': [33, 45, 48, 52], 'E':  [40, 47, 52, 56],
    }[name]

def add_chord(buf, start, dur, name, gain=1.0, octave=0, cutoff=1800, amp=0.045, kind='strings'):
    notes = chord(name)
    for i, m in enumerate(notes):
        f = midi(m + octave)
        pan = (i - 1.5) * 0.22
        if kind == 'strings': sig = strings(f, dur, amp=amp, attack=0.6, release=1.0, pan=pan, cutoff=cutoff)
        elif kind == 'choir': sig = choir(f, dur, amp=amp * 0.9, attack=0.9, release=1.2, pan=pan)
        elif kind == 'brass': sig = brass(f, dur, amp=amp * 0.8, attack=0.3, release=0.5, pan=pan, cutoff=cutoff)
        else: sig = strings(f, dur, amp=amp, attack=0.6, release=1.0, pan=pan, cutoff=cutoff)
        buf.add(start, sig, gain)

def add_melody(buf, start, dur, notes, amp=0.06, kind='flute', gap=0.0):
    t = start
    for i, (m, d) in enumerate(notes):
        f = midi(m)
        if kind == 'flute': sig = flute(f, d, amp=amp, pan=0.05)
        elif kind == 'harp': sig = harp(f, d, amp=amp, pan=-0.1)
        elif kind == 'piano': sig = piano(f, d, amp=amp, pan=0.0)
        else: sig = flute(f, d, amp=amp, pan=0.0)
        buf.add(t, sig)
        t += d + gap

def add_arp(buf, start, dur, notes, amp=0.035, step=0.25):
    t = start
    i = 0
    while t < start + dur:
        m = notes[i % len(notes)]
        buf.add(t, harp(midi(m), 1.2, amp=amp, pan=-0.15 + (i % 3) * 0.12))
        t += step; i += 1

# ---------------------------------------------------------------------------
# compose
# ---------------------------------------------------------------------------
music = Buf()
# global low drone
for st, d, m, a in [(0, 7, 38, 0.020), (7, 22, 35, 0.018), (29, 18, 43, 0.016), (47, 26, 38, 0.018), (73, 24, 38, 0.022), (97, 18, 43, 0.016), (115, 26, 38, 0.018), (141, 18, 43, 0.014), (159, 16, 38, 0.020)]:
    music.add(st, strings(midi(m), d, amp=a, attack=1.5, release=2.0, pan=0, cutoff=500))

# TITLE 0-7 : D major, harp + flute, wonder
add_chord(music, 0, 7, 'D', amp=0.040, cutoff=1500)
add_chord(music, 0, 7, 'A', amp=0.025, octave=-12, cutoff=900)
add_arp(music, 0.3, 6.4, [62, 66, 69, 74, 69, 66, 62, 66], amp=0.030, step=0.32)
add_melody(music, 1.0, 5.0, [(69, 1.2), (66, 0.8), (64, 0.8), (62, 1.6)], amp=0.045, kind='flute')
music.add(6.6, cymbal(1.2, 0.025), 1.0)

# CITY 7-29 : Bm - G - D - A, low strings, mysterious
prog = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A']
for i, ch in enumerate(prog):
    st = 7 + i * 2.75
    add_chord(music, st, 2.9, ch, amp=0.038, cutoff=1200)
    add_chord(music, st, 2.9, ch, amp=0.018, octave=-12, cutoff=600)
add_melody(music, 8.0, 18.0, [(66, 1.4), (64, 1.0), (62, 1.4), (59, 1.6), (62, 1.2), (66, 1.6), (69, 1.8), (66, 1.4)], amp=0.035, kind='flute')
for i in range(6):
    music.add(9 + i * 3.0, timpani(55, 1.8, 0.05), 1.0)
music.add(7.0, boom(2.0, 0.05), 1.0)

# CALLING 29-47 : G - D - A - Bm, choir + harp + high flute
prog2 = ['G', 'D', 'A', 'Bm', 'G', 'D', 'A', 'D']
for i, ch in enumerate(prog2):
    st = 29 + i * 2.25
    add_chord(music, st, 2.4, ch, amp=0.036, cutoff=1600)
    add_chord(music, st, 2.4, ch, amp=0.026, kind='choir', cutoff=2200)
add_arp(music, 29.2, 17.6, [62, 66, 69, 74, 78, 74, 69, 66], amp=0.030, step=0.28)
add_melody(music, 30.0, 15.0, [(74, 1.0), (76, 0.8), (78, 1.4), (81, 1.2), (78, 1.0), (76, 0.8), (74, 1.6)], amp=0.050, kind='flute')
music.add(29.0, cymbal(2.5, 0.035), 1.0)
music.add(46.0, cymbal(2.0, 0.030), 1.0)

# CONSTRUCTION 47-73 : D - A - Bm - G, rhythmic, hopeful
prog3 = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'D']
for i, ch in enumerate(prog3):
    st = 47 + i * 3.25
    add_chord(music, st, 3.4, ch, amp=0.040, cutoff=1700)
    add_chord(music, st, 3.4, ch, amp=0.020, octave=-12, cutoff=700)
    # rhythmic pulse
    for k in range(4):
        music.add(st + k * 0.82, harp(midi(chord(ch)[0] + 12), 0.5, amp=0.020, pan=-0.1), 1.0)
add_melody(music, 48.0, 23.0, [(62, 0.8), (66, 0.8), (69, 0.8), (71, 1.2), (69, 0.8), (66, 0.8), (62, 1.6), (64, 0.8), (66, 0.8), (69, 1.2), (66, 0.8), (62, 1.6)], amp=0.045, kind='flute')
for i in range(8):
    music.add(48 + i * 3.0, timpani(60, 1.6, 0.06), 1.0)
music.add(47.0, cymbal(2.0, 0.030), 1.0)

# FLOOD 73-97 : Dm - Bb - Gm - A, storm
prog4 = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A']
for i, ch in enumerate(prog4):
    st = 73 + i * 3.0
    add_chord(music, st, 3.2, ch, amp=0.045, cutoff=1000, kind='brass')
    add_chord(music, st, 3.2, ch, amp=0.025, octave=-12, cutoff=500)
    add_chord(music, st, 3.2, ch, amp=0.020, kind='choir', cutoff=1200)
add_melody(music, 74.0, 20.0, [(62, 1.0), (65, 0.8), (69, 1.2), (68, 0.8), (65, 1.2), (62, 1.6), (61, 0.8), (62, 2.0)], amp=0.040, kind='flute')
for i in range(10):
    music.add(73.5 + i * 2.2, timpani(50, 2.0, 0.10), 1.0)
for i in range(4):
    music.add(75 + i * 5.5, boom(3.0, 0.10), 1.0)

# REBORN 97-115 : D - G - A - D, release, flute + harp
prog5 = ['D', 'G', 'A', 'D', 'G', 'A', 'D']
for i, ch in enumerate(prog5):
    st = 97 + i * 2.6
    add_chord(music, st, 2.8, ch, amp=0.040, cutoff=1900)
    add_chord(music, st, 2.8, ch, amp=0.022, kind='choir', cutoff=2400)
add_arp(music, 97.2, 17.4, [62, 66, 69, 74, 78, 74, 69, 66], amp=0.028, step=0.30)
add_melody(music, 98.0, 15.0, [(69, 1.0), (71, 0.8), (74, 1.4), (76, 1.2), (74, 1.0), (71, 0.8), (69, 1.6)], amp=0.050, kind='flute')
music.add(97.0, cymbal(2.5, 0.030), 1.0)

# RAINBOW 115-141 : D - A - Bm - G - D, triumphant
prog6 = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'D']
for i, ch in enumerate(prog6):
    st = 115 + i * 3.25
    add_chord(music, st, 3.4, ch, amp=0.045, cutoff=2200)
    add_chord(music, st, 3.4, ch, amp=0.030, kind='choir', cutoff=2600)
    add_chord(music, st, 3.4, ch, amp=0.022, octave=-12, cutoff=800)
add_arp(music, 115.2, 25.4, [62, 66, 69, 74, 78, 81, 78, 74], amp=0.032, step=0.26)
add_melody(music, 116.0, 23.0, [(74, 0.8), (76, 0.8), (78, 1.2), (81, 1.4), (78, 0.8), (76, 0.8), (74, 1.6), (76, 0.8), (78, 1.2), (81, 1.4), (78, 0.8), (74, 1.6)], amp=0.055, kind='flute')
for i in range(8):
    music.add(115.5 + i * 3.2, timpani(60, 1.8, 0.08), 1.0)
music.add(115.0, cymbal(3.0, 0.045), 1.0)
music.add(124.0, cymbal(3.0, 0.040), 1.0)
music.add(133.0, cymbal(3.0, 0.040), 1.0)

# CHILD 141-159 : G - D - A - G, intimate piano/strings
prog7 = ['G', 'D', 'A', 'G', 'D', 'G']
for i, ch in enumerate(prog7):
    st = 141 + i * 3.0
    add_chord(music, st, 3.2, ch, amp=0.032, cutoff=1400)
    add_chord(music, st, 3.2, ch, amp=0.016, kind='choir', cutoff=2000)
add_melody(music, 142.0, 15.0, [(71, 1.2), (69, 0.8), (67, 1.2), (62, 1.6), (64, 0.8), (67, 1.2), (69, 1.6)], amp=0.040, kind='piano')
add_arp(music, 141.2, 17.4, [55, 59, 62, 67, 62, 59], amp=0.022, step=0.45)

# FINAL 159-175 : D - G - A - D, big finish then coda
prog8 = ['D', 'G', 'A', 'D']
for i, ch in enumerate(prog8):
    st = 159 + i * 3.0
    add_chord(music, st, 3.2, ch, amp=0.050, cutoff=2400)
    add_chord(music, st, 3.2, ch, amp=0.034, kind='choir', cutoff=2800)
    add_chord(music, st, 3.2, ch, amp=0.024, octave=-12, cutoff=900)
add_melody(music, 159.5, 12.0, [(74, 0.8), (76, 0.8), (78, 1.2), (81, 1.6), (78, 0.8), (76, 0.8), (74, 1.6)], amp=0.055, kind='flute')
for i in range(4):
    music.add(159.5 + i * 3.0, timpani(60, 2.0, 0.09), 1.0)
music.add(159.0, cymbal(3.5, 0.050), 1.0)
music.add(168.0, cymbal(4.0, 0.035), 1.0)
# gentle coda
add_chord(music, 171.0, 4.0, 'D', amp=0.030, cutoff=1600)
add_melody(music, 171.5, 3.0, [(74, 1.0), (69, 1.0), (66, 1.0)], amp=0.035, kind='piano')

# simple stereo reverb (Schroeder)
def reverb(buf, mix=0.22):
    combs = [0.0297, 0.0371, 0.0411, 0.0437]
    for ch in (buf.L, buf.R):
        out = np.zeros_like(ch)
        for d in combs:
            d_n = int(d * SR)
            y = np.zeros_like(ch)
            for i in range(d_n, len(ch)):
                y[i] = ch[i] + 0.82 * y[i - d_n]
            out += y * 0.25
        # allpass
        for d, g in [(0.005, 0.7), (0.0017, 0.7)]:
            d_n = int(d * SR)
            y = np.zeros_like(ch)
            for i in range(d_n, len(ch)):
                y[i] = -g * ch[i] + ch[i - d_n] + g * y[i - d_n]
            out = y
        ch[:] = ch * (1 - mix) + out * mix

# The reverb loop above is too slow in pure Python for 7.7M samples; use a lighter FFT reverb instead.
def fft_reverb(buf, mix=0.20):
    n = len(buf.L)
    ir_n = int(2.2 * SR)
    t = np.arange(ir_n) / SR
    ir = rng.normal(0, 1, ir_n) * np.exp(-t * 2.2)
    ir = lowpass_fast(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    for ch in (buf.L, buf.R):
        wet = np.fft.irfft(np.fft.rfft(ch) * np.fft.rfft(ir, n), n=n)
        ch[:] = ch * (1 - mix) + wet * mix * 0.8

# normalize music
def norm(buf, peak=0.9):
    m = max(np.max(np.abs(buf.L)), np.max(np.abs(buf.R)), 1e-9)
    buf.L *= peak / m; buf.R *= peak / m

# ---------------------------------------------------------------------------
# narration
# ---------------------------------------------------------------------------
def load_mp3(path):
    wav = path.replace('.mp3', '.wav')
    if not os.path.exists(wav):
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', path, '-ar', str(SR), '-ac', '2', wav], check=True)
    with wave.open(wav, 'rb') as w:
        n = w.getnframes(); data = w.readframes(n)
    a = np.frombuffer(data, dtype=np.int16).astype(np.float64) / 32768
    a = a.reshape(-1, 2)
    return a

narr = Buf()
placements = [
    ('scene1', 7.0 + 0.5), ('scene2', 29.0 + 0.5), ('scene3', 47.0 + 0.5),
    ('scene4', 73.0 + 0.5), ('scene5', 97.0 + 0.5), ('scene6', 115.0 + 0.5),
    ('scene7', 141.0 + 0.5), ('final', 159.0 + 2.6),
]
for name, st in placements:
    a = load_mp3(f'audio/narration/{name}.mp3')
    narr.add(st, a[:, 0], 1.0, pan=-0.05)
    narr.add(st, a[:, 1], 1.0, pan=0.05)

# ducking envelope from narration
narr_env = np.sqrt(np.convolve((np.abs(narr.L) + np.abs(narr.R)) / 2, np.ones(2205) / 2205, mode='same'))
narr_env = np.clip(narr_env * 6, 0, 1)
# smooth
k = np.ones(4410) / 4410
narr_env = np.convolve(narr_env, k, mode='same')
duck = 0.92 - 0.38 * narr_env

# ---------------------------------------------------------------------------
# SFX
# ---------------------------------------------------------------------------
sfx = Buf()
# city crowd murmur
n = int(22 * SR); t = np.arange(n) / SR
murmur = lowpass_fast(rng.normal(0, 1, n), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t))
sfx.add(7.0, murmur, 0.020, pan=0.0)
# hammering during construction
for i in range(26):
    st = 48.0 + i * 0.92
    n = int(0.18 * SR); tt = np.arange(n) / SR
    hit = np.sin(2 * np.pi * (180 - 300 * tt) * tt) * np.exp(-tt * 35)
    hit += rng.normal(0, 1, n) * np.exp(-tt * 60) * 0.4
    sfx.add(st, hit, 0.05, pan=-0.2 + (i % 3) * 0.2)
# rain during flood
n = int(24 * SR); t = np.arange(n) / SR
rain = lowpass_fast(rng.normal(0, 1, n), 6000) * 0.5
rain = rain * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * t))
sfx.add(73.0, rain, 0.035, pan=0.0)
# thunder
for st in [75.0, 81.5, 88.0, 93.0]:
    n = int(3.5 * SR); tt = np.arange(n) / SR
    th = lowpass_fast(rng.normal(0, 1, n), 180) * np.exp(-tt * 1.2) * (1 + 0.5 * np.sin(2 * np.pi * 3 * tt))
    sfx.add(st, th, 0.10, pan=-0.3)
# waves during flood/reborn
n = int(42 * SR); t = np.arange(n) / SR
waves = lowpass_fast(rng.normal(0, 1, n), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.12 * t))
sfx.add(73.0, waves, 0.030, pan=0.2)
# birds during reborn/rainbow/child
for i in range(18):
    st = 98.0 + i * 3.7
    n = int(0.25 * SR); tt = np.arange(n) / SR
    f = 1800 + 600 * np.sin(tt * 40 + i)
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 12) * 0.5
    sfx.add(st, chirp, 0.018, pan=-0.4 + (i % 5) * 0.2)
# dove wings
n = int(3.0 * SR); tt = np.arange(n) / SR
flutter = lowpass_fast(rng.normal(0, 1, n), 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * 8 * tt)) * np.exp(-tt * 0.8)
sfx.add(97.5, flutter, 0.020, pan=0.1)

# ---------------------------------------------------------------------------
# mix
# ---------------------------------------------------------------------------
# music reverb + normalize
fft_reverb(music, 0.18)
norm(music, 0.55)
# apply ducking
for ch, envch in ((music.L, duck), (music.R, duck)):
    ch *= envch
# narration level
narr.L *= 0.92; narr.R *= 0.92
# sfx level
sfx.L *= 0.55; sfx.R *= 0.55
mixL = music.L + narr.L + sfx.L
mixR = music.R + narr.R + sfx.R
# gentle bus compression / limiter
mixL = np.tanh(mixL * 1.1) / 1.1
mixR = np.tanh(mixR * 1.1) / 1.1
# fades
fade_in = int(0.8 * SR); fade_out = int(2.5 * SR)
mixL[:fade_in] *= np.linspace(0, 1, fade_in); mixR[:fade_in] *= np.linspace(0, 1, fade_in)
mixL[-fade_out:] *= np.linspace(1, 0, fade_out); mixR[-fade_out:] *= np.linspace(1, 0, fade_out)
# normalize to -1 dBFS
peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)), 1e-9)
target = 0.89
mixL *= target / peak; mixR *= target / peak
# write 16-bit stereo WAV
out = np.empty((N, 2), dtype=np.int16)
out[:, 0] = np.clip(mixL, -1, 1) * 32767
out[:, 1] = np.clip(mixR, -1, 1) * 32767
with wave.open('audio/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
# also write music-only for reference
with wave.open('audio/music.wav', 'wb') as w:
    m = np.empty((N, 2), dtype=np.int16)
    m[:, 0] = np.clip(music.L, -1, 1) * 32767; m[:, 1] = np.clip(music.R, -1, 1) * 32767
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(m.tobytes())
print('wrote audio/mix.wav', DUR, 's; peak', round(float(peak),3), 'rms', round(float(np.sqrt(np.mean(mixL**2))),3))
