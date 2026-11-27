"""Tanuki's snow moments for the Noel shop, drawn on his own winter frames.

Input  public/assets/ui/noel/tanuki-merchant-winter-v2.png    4 x 2 frames of 256 x 256
Output public/assets/ui/noel/tanuki-merchant-winter-snow.png  4 x 2 frames of 256 x 256, same anchor

Frames: 0-2 snow piling up on his hat and shoulders, 3 he shakes it off (snow flying),
4 a flake lands on his nose, 5 he holds up a snowball he made, 6 he catches a flake on his tongue,
7 settled flakes after the shake. src/components/TanukiShop.tsx (WINTER_IDLE) plays them as
frames 8-15 between his normal winter idle frames.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/assets/ui/noel/tanuki-merchant-winter-v2.png'
OUT = ROOT / 'public/assets/ui/noel/tanuki-merchant-winter-snow.png'
F = 256

SNOW = (246, 251, 255, 255)
SNOW_MID = (214, 232, 246, 255)
SNOW_SHADE = (166, 196, 224, 255)
OUTLINE = (28, 30, 44, 255)
FLAKE = (236, 248, 255, 255)

sheet = Image.open(SRC).convert('RGBA')
frames = [sheet.crop(((i % 4) * F, (i // 4) * F, (i % 4 + 1) * F, (i // 4 + 1) * F)) for i in range(8)]


def is_red(c):
    r, g, b, a = c
    return a > 200 and r > 120 and r > g * 1.7 and r > b * 1.6


def hat_top(img):
    """Top outline row of the hat for each column whose first opaque pixels lead into red cloth."""
    px = img.load()
    out = {}
    for x in range(F):
        for y in range(0, 120):
            if px[x, y][3] > 200:
                if any(is_red(px[x, yy]) for yy in range(y, min(F, y + 6))):
                    out[x] = y
                break
    return out


def pile(img, top, height):
    """Lumpy snow resting on the outline: dark outline above, shading at the base, 2 px blocks."""
    if not top or height <= 0:
        return
    d = ImageDraw.Draw(img)
    xs = sorted(top)
    x0, x1 = xs[0], xs[-1]
    span = max(1, x1 - x0)
    for x in range(x0, x1 + 1, 2):
        if x not in top:
            continue
        u = (x - x0) / span
        h = height * math.sin(math.pi * u) ** 0.7 + (1.6 * math.sin(x * 0.45) if height > 4 else 0)
        h = int(round(max(0, h) / 2) * 2)
        if h <= 0:
            continue
        base = top[x] + 2
        y_top = base - h
        d.rectangle([x, y_top - 2, x + 1, y_top - 1], fill=OUTLINE)
        d.rectangle([x, y_top, x + 1, base - 1], fill=SNOW)
        d.rectangle([x, base - 2, x + 1, base + 1], fill=SNOW_MID)
        if h >= 6 and (x // 2) % 3 == 0:
            d.rectangle([x, y_top + 2, x + 1, y_top + 3], fill=(255, 255, 255, 255))


def flake(d, x, y, big=False):
    if big:
        d.rectangle([x - 2, y - 6, x + 2, y + 6], fill=OUTLINE)   # a dark rim so it reads on fur
        d.rectangle([x - 6, y - 2, x + 6, y + 2], fill=OUTLINE)
        d.rectangle([x - 1, y - 5, x + 1, y + 5], fill=FLAKE)
        d.rectangle([x - 5, y - 1, x + 5, y + 1], fill=FLAKE)
        for ox, oy in ((-3, -3), (3, -3), (-3, 3), (3, 3)):
            d.rectangle([x + ox - 1, y + oy - 1, x + ox, y + oy], fill=FLAKE)
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, 255))
    else:
        d.rectangle([x - 1, y - 1, x, y], fill=FLAKE)


def shift(img, dx, dy):
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.alpha_composite(img, (max(0, dx), max(0, dy)), (max(0, -dx), max(0, -dy)))
    return out


def snowball_over_coin(img):
    """Frame 7 holds a gold coin: paint it into a snowball and drop the gold sparkle ticks."""
    px = img.load()
    for x in range(198, 232):                    # the sparkle ticks sit on empty background here
        for y in range(108, 152):
            px[x, y] = (0, 0, 0, 0)
    cx, cy, r = 177, 146, 14                     # the coin, measured on frame 7
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=OUTLINE)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SNOW_MID)
    d.ellipse([cx - r, cy - r, cx + r - 4, cy + r - 4], fill=SNOW)
    d.rectangle([cx - 8, cy - 8, cx - 5, cy - 5], fill=(255, 255, 255, 255))
    for ox, oy in ((6, 6), (9, 1), (2, 9)):
        d.rectangle([cx + ox, cy + oy, cx + ox + 1, cy + oy + 1], fill=SNOW_SHADE)
    return img


def frame(kind):
    if kind in ('pile1', 'pile2', 'pile3', 'settled'):
        img = frames[0].copy()
        pile(img, hat_top(img), {'pile1': 6, 'pile2': 12, 'pile3': 18, 'settled': 0}[kind])
        d = ImageDraw.Draw(img)
        if kind in ('pile2', 'pile3'):
            for x, y in ((40, 66), (186, 40)):
                flake(d, x, y)
        if kind == 'pile3':
            for x, y in ((24, 30), (212, 70), (60, 120)):
                flake(d, x, y, big=True)
        if kind == 'settled':
            for x, y in ((96, 30), (170, 52), (120, 168), (186, 160)):
                flake(d, x, y)
        return img
    if kind == 'shake':
        img = shift(frames[2], 5, 0)
        d = ImageDraw.Draw(img)
        top = hat_top(frames[2])
        cx = sum(top) / max(1, len(top)) + 5
        cy = min(top.values()) if top else 30
        for i, (ang, dist) in enumerate(((-150, 34), (-120, 28), (-95, 36), (-70, 30), (-40, 34), (-20, 26),
                                          (-165, 22), (-10, 40), (-130, 44), (-55, 46))):
            a = math.radians(ang)
            x = int(cx + math.cos(a) * dist * 1.6)
            y = int(cy + 18 + math.sin(a) * dist)
            s = 2 if i % 3 else 3
            d.rectangle([x - s, y - s, x + s, y + s], fill=SNOW)
            d.rectangle([x - s, y + s - 1, x + s, y + s], fill=SNOW_SHADE)
        for side in (-1, 1):                      # motion ticks beside the head
            for k in range(3):
                x = int(cx + side * (70 + k * 6))
                d.rectangle([x, 80 + k * 12, x + 3, 86 + k * 12], fill=(250, 250, 255, 220))
        return img
    if kind == 'nose':
        img = frames[4].copy()
        flake(ImageDraw.Draw(img), 140, 108, big=True)   # on the tip of his nose (measured)
        return img
    if kind == 'snowball':
        return snowball_over_coin(frames[7].copy())
    if kind == 'tongue':
        img = frames[3].copy()
        d = ImageDraw.Draw(img)
        flake(d, 140, 136, big=True)                     # landing on his tongue (measured)
        flake(d, 182, 60)
        flake(d, 70, 80)
        return img
    raise ValueError(kind)


order = ['pile1', 'pile2', 'pile3', 'shake', 'nose', 'snowball', 'tongue', 'settled']
out = Image.new('RGBA', (F * 4, F * 2), (0, 0, 0, 0))
for i, k in enumerate(order):
    out.paste(frame(k), ((i % 4) * F, (i // 4) * F))
out.save(OUT)
print('wrote', OUT.relative_to(ROOT), out.size)
