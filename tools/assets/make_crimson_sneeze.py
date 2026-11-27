"""Crimson's Christmas-outfit sneeze, drawn from her own front-facing stance cell.

Input  public/assets/combat/crimson-stance-reference-matched.png  (4 x 2 cells, row 1 = Christmas outfit)
Output public/assets/combat/crimson-winter-sneeze.png            (4 x 2 cells, same cell size and anchor)

Frames (columns): 0 cold (half-shut eyes, shiver marks), 1 inhale (eyes shut, head tipped back),
2 sneeze (eyes squeezed, head jerked forward, spray), 3 sniffle (eyes back, a drip and a puff).
Both rows hold the same frames, so the game's cell lookup (row = sheet height / 2) works unchanged.
Everything is drawn in 4 px blocks to match the art's pixel size.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/assets/combat/crimson-stance-reference-matched.png'
OUT = ROOT / 'public/assets/combat/crimson-winter-sneeze.png'

sheet = Image.open(SRC).convert('RGBA')
CW, CH = sheet.width // 4, sheet.height // 2
base = sheet.crop((0, CH, CW, 2 * CH))           # Christmas outfit, facing the viewer

SKIN = (247, 202, 170, 255)
INK = (40, 14, 18, 255)
WHITE = (250, 253, 255, 255)
ICE = (150, 205, 235, 255)
BREATH = (230, 245, 255, 210)
EYES = [(216, 144, 244, 170), (265, 144, 293, 170)]   # left, right eye boxes (x0, y0, x1, y1)
NECK = 226                                             # the head ends here (cell coordinates)
B = 4                                                  # pixel block


def block(d, x, y, c, w=1, h=1):
    d.rectangle([x, y, x + w * B - 1, y + h * B - 1], fill=c)


def shifted(eyes, dy):
    return [(x0, y0 + dy, x1, y1 + dy) for x0, y0, x1, y1 in eyes]


def clear_eyes(d, eyes):
    for x0, y0, x1, y1 in eyes:
        d.rectangle([x0, y0, x1, y1], fill=SKIN)


def half_lids(d, eyes):
    for x0, y0, x1, y1 in eyes:
        mid = (y0 + y1) // 2
        d.rectangle([x0, y0, x1, mid], fill=SKIN)
        d.rectangle([x0, mid, x1, mid + B - 1], fill=INK)


def shut_eyes(d, eyes):
    """Closed and relaxed: a short downward curve."""
    for x0, y0, x1, y1 in eyes:
        cy = (y0 + y1) // 2
        for i, x in enumerate(range(x0 + 2, x1 - 2, B)):
            block(d, x, cy + (0 if 1 < i < 5 else -B), INK)


def squeezed_eyes(d, eyes):
    """Squeezed shut: > on the left eye, < on the right."""
    (lx0, ly0, lx1, ly1), (rx0, ry0, rx1, ry1) = eyes
    cy = (ly0 + ly1) // 2
    for i in range(4):                                   # the two strokes meet at the inner point
        block(d, lx0 + 6 + i * B, cy - 12 + i * B, INK)
        block(d, lx0 + 6 + i * B, cy + 12 - i * B, INK)
        block(d, rx1 - 10 - i * B, cy - 12 + i * B, INK)
        block(d, rx1 - 10 - i * B, cy + 12 - i * B, INK)


def shiver_marks(d):
    for x in (150, 336):
        for k in range(3):
            block(d, x + (k % 2) * B, 250 + k * 12, ICE, 1, 2)


def move_head(img, dx, dy):
    """Shift everything above the neck (hat, hair, face), keeping the body in place."""
    head = img.crop((0, 0, CW, NECK))
    out = img.copy()
    out.paste((0, 0, 0, 0), (0, 0, CW, NECK))
    out.alpha_composite(head, (max(0, dx), max(0, dy)), (max(0, -dx), max(0, -dy)))
    return out


def spray(d):
    """A burst of droplets from the mask, fanning out and down toward the viewer."""
    drops = [(-60, 6, 2), (-44, -10, 1), (-30, 18, 2), (-74, 28, 1), (-18, 34, 1),
             (40, 8, 2), (56, -8, 1), (30, 24, 2), (70, 30, 1), (14, 40, 1), (-52, 44, 1), (50, 46, 1)]
    cx, cy = 254, 204
    for x, y, s in drops:
        block(d, cx + x - B, cy + y - B, ICE, s + 1, s + 1)
        block(d, cx + x, cy + y, WHITE, s, s)
    for i in range(3):                                   # motion ticks at the sides of the head
        block(d, 170 - i * B, 178 + i * 8, WHITE)
        block(d, 336 + i * B, 178 + i * 8, WHITE)


def frame(kind):
    img = base.copy()
    dy = {'inhale': -6, 'sneeze': 8}.get(kind, 0)
    if dy:
        img = move_head(img, 0, dy)
    d = ImageDraw.Draw(img)
    eyes = shifted(EYES, dy)
    if kind == 'cold':
        half_lids(d, eyes); shiver_marks(d)
    elif kind == 'inhale':
        clear_eyes(d, eyes); shut_eyes(d, eyes)
        for i in range(3):                               # a breath drawn in
            block(d, 238 + i * 10, 212 - i * 6, BREATH)
    elif kind == 'sneeze':
        clear_eyes(d, eyes); squeezed_eyes(d, eyes); spray(d)
    elif kind == 'sniffle':
        half_lids(d, eyes)
        block(d, 262, 202, ICE, 1, 2)                    # a drip under the mask
        block(d, 300, 196, BREATH, 2, 1)                 # a small puff of breath
    return img


frames = [frame(k) for k in ('cold', 'inhale', 'sneeze', 'sniffle')]
out = Image.new('RGBA', (CW * 4, CH * 2), (0, 0, 0, 0))
for row in range(2):
    for col, f in enumerate(frames):
        out.paste(f, (col * CW, row * CH))
out.save(OUT)
print('wrote', OUT.relative_to(ROOT), out.size)
