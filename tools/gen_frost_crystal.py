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


# ---------------------------------------------------------------------------------------------------------------------
# The fusion dance ("Lưỡng Long Nhất Thể", FrostCrystalFusion.tsx). The same crystal, built from a small rig (leaning
# body, two-part arms ending in a fist or a pointing index finger, legs between hip and foot) so the dance is real body
# motion. Drawn facing right (the left dancer; the game mirrors it for the right one) in DCELL_W x DCELL_H cells, feet on
# row DBASE, body centre at x = DCX, sampled at DFPS from 0 to DANCE_END s. The root (the point between the feet) moves
# while stepping; it is not baked in: the json gives it per frame as `dx`, with the visible tip of the index finger
# (`tip`, after the outline) and the body's rightmost pixel without its arms (`bodyRight`).
#   0-.8 stand facing each other · .8-1.65 "Fuuu": three side steps out, both arms swung out, leaning out ·
#   1.65-2.5 "-sion": arms swept over the head to the inside, three steps in, outer knee up ·
#   2.5-3.2 "Ha!": lunge in (inner leg straight, outer bent), lean in, inner arm level with the index finger out, outer arm
#   arched over the head; the fingertips meet at TOUCH · TOUCH-DANCE_END the pose is held.
# ---------------------------------------------------------------------------------------------------------------------
import json

DCELL_W, DCELL_H, DCX, DBASE, DFPS = 56, 40, 28, 37, 24
TOUCH, DANCE_END = 3.2, 4.0
UPPER, FORE, FINGER = 5, 5, 5


def smooth(u):
    u = min(1, max(0, u)); return u * u * (3 - 2 * u)


def mix(a, b, u):
    return tuple(mix(x, y, u) for x, y in zip(a, b)) if isinstance(a, tuple) else a + (b - a) * u


def keyed(keys, t):
    """Value at t of [(time, number or nested tuple)], eased between neighbours."""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t <= t1: return mix(a, b, smooth((t - t0) / (t1 - t0)))
    return keys[-1][1]


# Arms: (upper-arm angle, forearm angle) in degrees, 0 = toward the partner, 90 = straight up. F = inner arm, B = outer.
ARMS = [
    # Angles are written so each move turns the right way: down-and-out to the side (298 -> 165), then up over the head (165 -> 20).
    (0, ((298, 280), (242, 260))), (.8, ((298, 280), (242, 260))),
    (1.05, ((165, 172), (172, 178))), (1.65, ((165, 172), (172, 178))),        # Fuuu: both arms out to the outer side
    (2.2, ((20, 14), (32, 24))), (2.5, ((20, 14), (32, 24))),                  # -sion: swept over the head to the inside
    (3.0, ((4, 0), (116, 64))), (DANCE_END, ((4, 0), (116, 64))),              # Ha!: inner arm level, outer arched over
]
LEAN = [(0, 0), (.8, 0), (1.05, -.2), (1.65, -.2), (2.2, .12), (2.5, .12), (3.0, .3), (DANCE_END, .3)]
CROUCH = [(0, 1), (.8, 1), (1.05, 2), (1.65, 2), (2.2, 1), (2.5, 2), (3.0, 3), (DANCE_END, 3)]
POINT_FROM = 2.7                                                              # the fist opens into the pointing finger
STEP = 3
# Footwork: (start, end, foot, dx, lift). Root = midpoint of the feet, so the body travels with the steps.
FEET0 = {'in': 4, 'out': -4}
STEPS = []
for k in range(3):                                                            # Fuuu: outer foot leads outward
    t = .8 + k * .283
    STEPS += [(t, t + .14, 'out', -STEP, 3), (t + .14, t + .283, 'in', -STEP, 2)]
for k in range(3):                                                            # -sion: inner foot leads inward
    t = 1.65 + k * .2
    STEPS += [(t, t + .1, 'in', STEP, 3), (t + .1, t + .2, 'out', STEP, 2)]
STEPS += [(2.3, 2.5, 'out', 0, 5)]                                            # knee up
STEPS += [(2.5, TOUCH, 'in', 9, 1)]                                           # Ha!: the lunge that brings the fingers together


def feet(t):
    pos = dict(FEET0); lift = {'in': 0.0, 'out': 0.0}
    for t0, t1, foot, dx, up in STEPS:
        if t >= t1: pos[foot] += dx
        elif t > t0:
            u = (t - t0) / (t1 - t0); pos[foot] += dx * smooth(u); lift[foot] = up * math.sin(u * math.pi)
    return pos, lift


def dancer(t, arms=True):
    """One frame: (image, root dx, fingertip or None)."""
    img = Image.new('RGBA', (DCELL_W, DCELL_H)); d = ImageDraw.Draw(img)
    pos, lift = feet(t)
    root = (pos['in'] + pos['out']) / 2
    lean, c = keyed(LEAN, t), keyed(CROUCH, t) + (math.sin(t / .8 * math.pi * 2) * .5 if t < .8 else 0)
    (fa1, fa2), (ba1, ba2) = keyed(ARMS, t)
    piv = (0, 7 - c)

    def P(x, y, body=True):
        """Local point (y up, from the root) -> cell pixel; body points lean about the hips."""
        if body:
            y -= c
            dx_, dy_ = x - piv[0], y - piv[1]
            x, y = piv[0] + dx_ * math.cos(lean) + dy_ * math.sin(lean), piv[1] - dx_ * math.sin(lean) + dy_ * math.cos(lean)
        return (DCX + x, DBASE - y)

    def limb(a, b, w, light, dark):
        (ax, ay), (bx, by) = a, b
        L = math.hypot(bx - ax, by - ay) or 1
        nx, ny = -(by - ay) / L * w / 2, (bx - ax) / L * w / 2
        d.polygon([(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)], fill=dark)
        d.line([a, b], fill=light, width=1)

    def arm(side, a1, a2, front, point):
        sh = P(side * 7, 15)
        el = (sh[0] + UPPER * math.cos(math.radians(a1)), sh[1] - UPPER * math.sin(math.radians(a1)))
        ha = (el[0] + FORE * math.cos(math.radians(a2)), el[1] - FORE * math.sin(math.radians(a2)))
        limb(sh, el, 3.2, L if front else M, M if front else D)
        limb(el, ha, 3, L if front else M, M if front else D)
        cl, cd = (H, L) if front else (L, M)
        x, y = ha
        d.polygon([(x, y - 3), (x + 3, y), (x, y + 3), (x - 3, y)], fill=cd)
        d.polygon([(x, y - 3), (x, y + 3), (x - 3, y)], fill=cl)
        if point:   # index finger along the forearm; the other fingers stay curled in the fist
            ux, uy = math.cos(math.radians(a2)), -math.sin(math.radians(a2))
            d.line([(x + ux * 2.5, y + uy * 2.5), (x + ux * FINGER, y + uy * FINGER)], fill=H, width=1)
            return (x + ux * FINGER, y + uy * FINGER)

    if arms: arm(-1, ba1, ba2, False, False)
    for foot, x0 in (('out', -4), ('in', 4)):                                 # legs: hip to foot, outer one behind
        hip = P(x0, 8)
        fx = pos[foot] - root
        toe = P(fx, lift[foot], body=False)
        knee = ((hip[0] + toe[0]) / 2 - (1.5 if foot == 'out' and c > 2 else 0), (hip[1] + toe[1]) / 2)
        limb(hip, knee, 4, M, D); limb(knee, toe, 3.4, M, D)
    C = P(-1, 13)
    TL, TP, TR, R, B, Lf = P(-8, 18), P(0, 21), P(8, 17), P(9, 11), P(0, 5), P(-9, 12)
    for tri, col in (((C, TL, TP), H), ((C, TP, TR), L), ((C, TR, R), M), ((C, R, B), D), ((C, B, Lf), M), ((C, Lf, TL), L)):
        d.polygon(tri, fill=col)
    shard(d, P(-7, 16), P(-3, 18), P(-9, 24), L, M)
    shard(d, P(3, 18), P(7, 16), P(8, 23), M, D)
    shard(d, P(-2, 19), P(2, 19), P(0, 28), H, L)
    cx, cy = (round(v) for v in P(3, 13))
    d.polygon([(cx, cy - 2), (cx + 2, cy), (cx, cy + 2), (cx - 2, cy)], fill=CORE2, outline=DEEP)
    d.point((cx, cy), fill=CORE)
    tip = arm(1, fa1, fa2, True, t >= POINT_FROM) if arms else None
    px = img.load()
    edge = [(x, y) for y in range(DCELL_H) for x in range(DCELL_W) if px[x, y][3] == 0 and any(
        0 <= x + dx < DCELL_W and 0 <= y + dy < DCELL_H and px[x + dx, y + dy][3] and px[x + dx, y + dy] != OUT
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for e in edge: px[e] = OUT
    if tip:   # the visible tip: the rightmost pixel (outline included) on the finger's row
        ty = round(tip[1]); tx = max(x for x in range(DCELL_W) if px[x, ty][3])
        tip = [tx, ty]
    return img, root, tip


dframes = [dancer(i / DFPS) for i in range(round(DANCE_END * DFPS))]
DCOLS = 12
dsheet = Image.new('RGBA', (DCELL_W * DCOLS, DCELL_H * math.ceil(len(dframes) / DCOLS)))
for i, (im, _, _) in enumerate(dframes):
    dsheet.paste(im, ((i % DCOLS) * DCELL_W, (i // DCOLS) * DCELL_H))
dsheet.save(os.path.join(root, 'public/assets/enemies/frost-crystal-dance.png'))
touch = round(TOUCH * DFPS)
meta = {
    'cell': [DCELL_W, DCELL_H], 'centerX': DCX, 'feetY': DBASE, 'fps': DFPS, 'columns': DCOLS, 'frames': len(dframes),
    'touchFrame': touch,
    'dx': [round(r, 3) for _, r, _ in dframes],
    'tip': [t for _, _, t in dframes],
    'bodyRight': [max(x for y in range(DCELL_H) for x in range(DCELL_W) if b.getpixel((x, y))[3]) for b, _, _ in
                  (dancer(i / DFPS, arms=False) for i in range(len(dframes)))],
}
with open(os.path.join(root, 'src/game/data/frostFusionDance.json'), 'w') as f:
    json.dump(meta, f, separators=(',', ':'))
dprev = Image.new('RGBA', dsheet.size, (24, 48, 66, 255)); dprev.alpha_composite(dsheet)
dprev.resize((dsheet.width * 3, dsheet.height * 3), Image.NEAREST).save(os.path.join(root, 'tools/preview/frost-crystal-dance-3x.png'))
print('dance', dsheet.size, 'touch frame', touch, 'tip', meta['tip'][touch], 'dx', meta['dx'][touch])
