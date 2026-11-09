#!/usr/bin/env python3
"""
Genera le icone dell'app (PNG, ICO, ICNS) senza dipendenze di sistema.
Disegna lo stesso soggetto di icon.svg: fumetto crema su fondo verde profondo.

    python3 assets/make-icons.py
"""
import os
import struct
from PIL import Image, ImageDraw

SIZE = 1024
HERE = os.path.dirname(os.path.abspath(__file__))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, top, bottom):
    """Gradiente verticale, morbido."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        color = lerp(top, bottom, y / (size - 1))
        for x in range(size):
            px[x, y] = color
    return img


def rounded_mask(size, box, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle(box, radius=radius, fill=255)
    return mask


def main():
    # --- fondo: quadrato arrotondato verde, come icon.svg
    bg = gradient(SIZE, (29, 61, 51), (14, 33, 28)).convert("RGBA")
    bg.putalpha(rounded_mask(SIZE, (0, 0, SIZE - 1, SIZE - 1), 224))

    # --- fumetto
    bubble_mask = rounded_mask(SIZE, (224, 246, 800, 684), 140)
    tail = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(tail).polygon([(372, 636), (352, 792), (524, 676)], fill=255)
    bubble_mask = Image.composite(Image.new("L", (SIZE, SIZE), 255), bubble_mask, tail)

    cream = gradient(SIZE, (243, 230, 201), (217, 195, 149)).convert("RGBA")
    cream.putalpha(bubble_mask)
    bg = Image.alpha_composite(bg, cream)

    # --- occhi e sorriso
    face = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(face)
    ink = (22, 48, 42, 255)
    for cx in (424, 600):
        d.ellipse((cx - 20, 432, cx + 20, 472), fill=ink)
    d.arc((406, 470, 618, 600), start=20, end=160, fill=ink, width=28)
    bg = Image.alpha_composite(bg, face)

    bg.save(os.path.join(HERE, "icon.png"))
    for size in (512, 192, 48):
        bg.resize((size, size), Image.LANCZOS).save(os.path.join(HERE, f"icon-{size}.png"))

    # --- ICO multi-risoluzione
    bg.save(
        os.path.join(HERE, "icon.ico"),
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )

    # --- ICNS (macOS): contenitore con PNG dentro, scritto a mano
    entries = []
    for kind, size in (("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)):
        path = os.path.join(HERE, f"_tmp-{size}.png")
        bg.resize((size, size), Image.LANCZOS).save(path)
        with open(path, "rb") as fh:
            data = fh.read()
        os.remove(path)
        entries.append(kind.encode("ascii") + struct.pack(">I", len(data) + 8) + data)
    payload = b"".join(entries)
    with open(os.path.join(HERE, "icon.icns"), "wb") as fh:
        fh.write(b"icns" + struct.pack(">I", len(payload) + 8) + payload)

    print("icone generate:", ", ".join(sorted(f for f in os.listdir(HERE) if f.startswith("icon."))))


if __name__ == "__main__":
    main()
