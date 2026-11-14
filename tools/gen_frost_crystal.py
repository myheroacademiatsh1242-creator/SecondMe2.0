"""Frost Crystal sprite sheet (the ice pillars' minion in the Frost Guardian fight).

Run:  python -I tools/gen_frost_crystal.py   ->  public/assets/enemies/frost-crystal.png (+ a 6x preview in tools/preview/)
32x32 cells, feet on row 29, facing right (the game mirrors it). Rows (frames):
  0 idle (6)   1 walk (8)   2 attack (8: 0-3 wind-up, 4-5 leap, 6-7 slam/recover)   3 hit (3)   4 death (8)
rendering/frostCrystal.ts reads these numbers; keep them in step.
"""
import math, os
from PIL import Image, ImageDraw

CELL, BASE, CX = 32, 29, 16
ROWS = [6, 8, 8, 3, 8]
OUT = (10, 30, 52, 255)
D, M, L, H = (30, 82, 130, 255), (58, 150, 204, 255), (132, 216, 246, 255), (228, 250, 255, 255)
DEEP = (40, 54, 118, 255)
CORE, CORE2 = (255, 255, 255, 255), (140, 255, 236, 255)


def shard(d, base_l, base_r, tip, light, dark):
    """A crystal shard, lit half on the left of its spine."""
    mid = ((base_l[0] + base_r[0]) / 2, (base_l[1] + base_r[1]) / 2)
    d.polygon([base_l, mid, tip], fill=light)
    d.polygon([mid, base_r, tip], fill=dark)


def creature(p):
    """One pose. p: by (body lift, px), sq (vertical squash), ox (sideways shift), arm (0 down .. 1 overhead, <0 slammed forward),
    flare (spike growth), core (0..1), legs (left lift, right lift), crack (0..3), flash, lift (whole-body jump, px), burst (impact shards)."""
    img = Image.new('RGBA', (CELL, CELL))
    d = ImageDraw.Draw(img)
    by, sq, ox, lift = p.get('by', 0), p.get('sq', 1), p.get('ox', 0), p.get('lift', 0)

    def T(x, y, body=True):
        return (CX + x + ox, BASE - (y * sq + (by if body else 0)) - lift)

    ll, rl = p.get('legs', (0, 0))
    # back arm (behind the body, darker)
    arm = p.get('arm', 0)
    def fist(side, front):
        if arm >= 0:
            fx, fy = side * (11 - arm * 2), 8 + arm * 15
        else:   # slammed down in front of it
            fx, fy = (side * 6 + 7) if front else side * 9, 3 + (1 + arm) * 4
        sh = T(side * 7, 15)
        c = T(fx, fy)
        d.line([sh, c], fill=D if front else DEEP, width=2)
        col_l, col_d = (L, M) if front else (M, D)
        d.polygon([(c[0], c[1] - 4), (c[0] + 3, c[1]), (c[0], c[1] + 3), (c[0] - 3, c[1])], fill=col_d)
        d.polygon([(c[0], c[1] - 4), (c[0], c[1] + 3), (c[0] - 3, c[1])], fill=col_l)
    fist(-1, False)
    # legs: short faceted crystal stubs, narrowing to a pointed foot
    for x0, up in ((-6, ll), (2, rl)):
        hip_l, hip_r, toe_r, toe_l = T(x0, 7, False), T(x0 + 4, 7, False), T(x0 + 3, up, False), T(x0, up, False)
        d.polygon([hip_l, hip_r, toe_r, toe_l], fill=D)
        d.polygon([hip_l, T(x0 + 2, 7, False), T(x0 + 1, up, False), toe_l], fill=M)
    # torso: a cut gem, lit from the top left
    C = T(-1, 13)
    TL, TP, TR, R, B, Lf = T(-8, 18), T(0, 21), T(8, 17), T(9, 11), T(0, 5), T(-9, 12)
    for tri, col in (((C, TL, TP), H), ((C, TP, TR), L), ((C, TR, R), M), ((C, R, B), D), ((C, B, Lf), M), ((C, Lf, TL), L)):
        d.polygon(tri, fill=col)
    # back spikes
    f = p.get('flare', 0)
    shard(d, T(-7, 16), T(-3, 18), T(-9, 24 + f * .7), L, M)
    shard(d, T(3, 18), T(7, 16), T(8, 23 + f * .7), M, D)
    shard(d, T(-2, 19), T(2, 19), T(0, 28 + f), H, L)
    # core / eye, set to the facing side
    k = p.get('core', .6)
    cx, cy = (round(v) for v in T(3, 13))
    d.polygon([(cx, cy - 2), (cx + 2, cy), (cx, cy + 2), (cx - 2, cy)], fill=CORE2 if k > .3 else M, outline=DEEP)
    if k > .5: d.point((cx, cy), fill=CORE)
    if k > .85: d.point([(cx + 1, cy), (cx, cy - 1)], fill=CORE)
    fist(1, True)
    # cracks
    cr = p.get('crack', 0)
    for i, (a, b) in enumerate((((-4, 16), (1, 9)), ((5, 15), (2, 8)), ((-6, 12), (-1, 7)))[:cr]):
        d.line([T(*a), T(*b)], fill=H if i % 2 else OUT, width=1)
    # outline: every empty pixel touching the sprite
    px = img.load()
    edge = [(x, y) for y in range(CELL) for x in range(CELL) if px[x, y][3] == 0 and any(
        0 <= x + dx < CELL and 0 <= y + dy < CELL and px[x + dx, y + dy][3] and px[x + dx, y + dy] != OUT
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for e in edge: px[e] = OUT
    if p.get('flash'):
        for y in range(CELL):
            for x in range(CELL):
                if px[x, y][3] and px[x, y] != OUT: px[x, y] = H
    # impact shards thrown up in front
    for i in range(p.get('burst', 0)):
        x, y = CX + 9 + (i * 5) % 9 - 2, BASE - 1 - (i * 3) % 5
        d.point([(x, y), (x, y - 1)], fill=H if i % 2 else L)
    return img


def death(i):
    """Frames 0-2 crack and flare, 3-7 the gem bursts into falling shards that shrink away."""
    if i < 3:
        return creature({'crack': i + 1, 'flash': i == 0, 'core': 1 if i == 2 else .6, 'sq': 1 - i * .03})
    img = Image.new('RGBA', (CELL, CELL)); d = ImageDraw.Draw(img)
    t = (i - 2) / 5
    pieces = [(-5, 18, -1.2, 1.6, H), (4, 18, 1.3, 1.8, L), (-6, 11, -1.6, .6, M), (6, 11, 1.7, .5, D), (0, 8, .2, .2, M),
              (0, 25, .1, 2.6, H), (-8, 21, -1.5, 2.2, L), (8, 20, 1.6, 2, M)]
    for x, y, vx, vy, col in pieces:
        s = round(4 - 3 * t)   # 4 px shards shrinking to 1
        px_, py = x + vx * 6 * t, y + vy * 7 * t - 34 * t * t   # thrown out, then falls onto the ground
        cx, cy = round(CX + px_), round(BASE - max(py, s))
        d.polygon([(cx, cy - s), (cx + s - 1, cy), (cx, cy + s - 1), (cx - s + 1, cy)], fill=col, outline=OUT if s > 2 else None)
    if i >= 5:   # frost dust settling
        for k in range(6):
            d.point((CX - 9 + k * 4, BASE - (k % 2)), fill=L if i < 7 else M)
    return img


FRAMES = [
    [creature({'by': [0, 0, -1, -1, -1, 0][f], 'core': .55 + .3 * math.sin(f / 6 * 2 * math.pi), 'flare': [0, 0, 1, 1, 1, 0][f]}) for f in range(6)],
    [creature({'legs': [(2, 0), (1, 0), (0, 0), (0, 1), (0, 2), (0, 1), (0, 0), (1, 0)][f], 'by': [-1, 0, 0, -1, -1, 0, 0, -1][f],
               'arm': .12 * math.sin(f / 8 * 2 * math.pi), 'ox': [0, 0, 1, 1, 0, 0, 1, 1][f] - 1}) for f in range(8)],
    [creature(q) for q in (
        {'arm': .35, 'sq': .95, 'core': .7},
        {'arm': .7, 'sq': .9, 'flare': 1, 'core': .85},
        {'arm': 1, 'sq': .86, 'flare': 2, 'core': 1},
        {'arm': 1, 'sq': .86, 'flare': 3, 'core': 1, 'ox': 1},
        {'arm': 1, 'sq': 1.1, 'flare': 2, 'core': 1, 'lift': 3},
        {'arm': .2, 'sq': 1.06, 'flare': 1, 'core': 1, 'lift': 1},
        {'arm': -1, 'sq': .82, 'flare': 3, 'core': 1, 'burst': 6},
        {'arm': -.5, 'sq': .94, 'flare': 1, 'core': .8, 'burst': 3},
    )],
    [creature({'flash': True}), creature({'ox': -1, 'crack': 1, 'sq': .95}), creature({'crack': 1})],
    [death(i) for i in range(8)],
]
assert [len(r) for r in FRAMES] == ROWS

sheet = Image.new('RGBA', (CELL * max(ROWS), CELL * len(ROWS)))
for r, row in enumerate(FRAMES):
    for f, im in enumerate(row):
        sheet.paste(im, (f * CELL, r * CELL))
root = os.path.join(os.path.dirname(__file__), '..')
sheet.save(os.path.join(root, 'public/assets/enemies/frost-crystal.png'))
os.makedirs(os.path.join(root, 'tools/preview'), exist_ok=True)
prev = Image.new('RGBA', sheet.size, (24, 48, 66, 255)); prev.alpha_composite(sheet)
prev.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(os.path.join(root, 'tools/preview/frost-crystal-6x.png'))
print('ok', sheet.size)
