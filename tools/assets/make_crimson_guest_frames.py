"""Idle animation for Crimson leaning on the Noel claw machine.

Input  public/assets/crimson/noel-claw-guest.png         1024 x 1536 illustration
Output public/assets/crimson/noel-claw-guest-frames.png  8 x 2 frames of 256 x 384

Row 0: eight idle frames, a slow breath (the upper body rises up to 2 px) while the scarf tail and the
loose hair sway in a travelling wave. Row 1: the same eight frames with her eyes shut, for blinks.
The page (public/minigames/claw-noel.html, drawCrimsonGuest) loops row 0 and swaps to row 1 to blink.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/assets/crimson/noel-claw-guest.png'
OUT = ROOT / 'public/assets/crimson/noel-claw-guest-frames.png'
FW, FH, N = 256, 384, 8

SKIN = (252, 172, 138, 255)
SKIN_SHADE = (226, 140, 112, 255)
LASH = (46, 16, 22, 255)
# eyes in source pixels: (x0, y0, x1, y1) of the area the lid covers, and the closed-lid line
EYES = [((302, 289, 366, 331), (304, 316, 364)), ((423, 296, 460, 331), (425, 316, 458))]


def closed_eyes(src):
    """Cover each eye with the cheek skin just below it, column by column, then draw the shut lid."""
    img = src.copy()
    px = img.load()
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1), (lx0, ly, lx1) in EYES:
        for x in range(x0, x1 + 1):
            fill = px[x, y1 + 4]
            for y in range(y0, y1 + 1):
                px[x, y] = fill
        for x in range(lx0, lx1, 4):             # a lid line that dips slightly in the middle
            t = (x - lx0) / max(1, lx1 - lx0)
            dy = int(4 * math.sin(math.pi * t))
            d.rectangle([x, ly + dy, x + 3, ly + dy + 4], fill=LASH)
    return img


def shrink(img):
    small = img.resize((FW, FH), Image.LANCZOS)
    px = small.load()
    for y in range(FH):                          # hard edges, like the rest of the pixel art
        for x in range(FW):
            r, g, b, a = px[x, y]
            if a < 90:
                px[x, y] = (0, 0, 0, 0)
            elif a < 250 and a >= 200:
                px[x, y] = (r, g, b, 255)
    return small


def animate(small, k):
    phase = 2 * math.pi * k / N
    breath = round(1 + math.sin(phase - math.pi / 2))        # 0, 1, 2, 1 ... over the loop
    out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    src, dst = small.load(), out.load()
    for y in range(FH):
        # upper body rises with the breath; the shift fades out over the hips
        lift = breath if y < 200 else breath * max(0, 260 - y) / 60 if y < 260 else 0
        sy = min(FH - 1, y + round(lift))
        for x in range(FW):
            dx = 0
            if x >= 148 and 158 <= y <= 266:                  # scarf tail: travelling wave
                u = (y - 158) / 108
                dx = 3.2 * math.sin(phase - u * 4) * u ** 1.3
            elif x >= 150 and 84 <= y < 158:                  # loose hair: a smaller sway
                u = (x - 150) / 70
                dx = 1.4 * math.sin(phase - u * 3) * u
            sx = x - round(dx)
            if 0 <= sx < FW:
                dst[x, y] = src[sx, sy]
    return out


src = Image.open(SRC).convert('RGBA')
rows = [shrink(src), shrink(closed_eyes(src))]
sheet = Image.new('RGBA', (FW * N, FH * 2), (0, 0, 0, 0))
for r, base in enumerate(rows):
    for k in range(N):
        sheet.paste(animate(base, k), (k * FW, r * FH))
sheet.save(OUT)
print('wrote', OUT.relative_to(ROOT), sheet.size)
