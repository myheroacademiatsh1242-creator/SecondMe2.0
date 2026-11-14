"""Ember Demon: set the blade on fire.

Reads public/assets/demon-boss/sheet.png (288 x 160 cells, 22 columns x 5 rows) and writes
public/assets/demon-boss/sheet-fire.png, the same sheet with the blade heated to glowing metal and a flame
licking up from its edge, campfire flames from pixelfx stamped along its edge, a different one in every frame so the cut-scene (CSS) and the game (canvas) both
get the flicker for free from the frame animation. The source sheet is never touched.

    python tools/assets/prepare_demon_fire.py
"""
from pathlib import Path
import math
import random

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# (source, result, cell width, cell height, columns, rows). The slime transformation (BossIntro.tsx) uses the same blade colours.
JOBS = [
    ('sheet.png', 'sheet-fire.png', 288, 160, 22, 5),
    ('slime-transform-strip.png', 'slime-transform-strip-fire.png', 214, 200, 32, 1),
]

# The blade's two colours in the source sheet, and what they become once heated.
BLADE_LIGHT, BLADE_MID = (200, 181, 184), (171, 114, 120)
HOT_LIGHT, HOT_MID = (255, 232, 140), (238, 118, 34)
BANDS = [(255, 244, 190), (255, 204, 70), (246, 124, 32), (196, 52, 22)]   # white-hot, yellow, orange, red
# The flame is the campfire from pixelfx (public/assets/effects/fx/campfire.png, 120 x 100 cells, 90 frames, 9 columns):
# only its warm bright pixels, so the logs and the smoke stay behind. Rows FLAME_TOP..FLAME_BOT, 25 px wide round x = 60.
FIRE = ROOT / 'public/assets/effects/fx/campfire.png'
FRAMES, FCOLS, FW, FH = 90, 9, 120, 100
FLAME_TOP, FLAME_BOT, FLAME_HALF = 46, 80, 12
FLAME_H = FLAME_BOT - FLAME_TOP


def load_flames():
    sheet = Image.open(FIRE).convert('RGBA')
    out = []
    for f in range(FRAMES):
        ox, oy = (f % FCOLS) * FW, (f // FCOLS) * FH
        rows = []
        for y in range(FLAME_TOP, FLAME_BOT):
            row = []
            for x in range(60 - FLAME_HALF, 60 + FLAME_HALF + 1):
                r, g, b, a = sheet.getpixel((ox + x, oy + y))
                row.append((r, g, b, 255) if a > 200 and r >= 215 and g >= 90 and b < 150 and r - b > 90 else None)
            rows.append(row)
        out.append(rows)
    return out


def is_blade(px):
    return px[3] > 0 and px[:3] in (BLADE_LIGHT, BLADE_MID)


ORB = {(228, 200, 23), (239, 247, 19)}


def orbs(px):
    """The two flame orbs floating over the demon's shoulders: yellow blobs of 60+ pixels (chest patches are under 30)."""
    seen, found = set(), []
    for y in range(H):
        for x in range(W):
            if (x, y) in seen or px[x, y][3] == 0 or px[x, y][:3] not in ORB:
                continue
            todo, pts = [(x, y)], []
            seen.add((x, y))
            while todo:
                a, b = todo.pop()
                pts.append((a, b))
                for q in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and px[q][3] and px[q][:3] in ORB:
                        seen.add(q)
                        todo.append(q)
            if len(pts) >= 60:
                found.append((round(sum(p[0] for p in pts) / len(pts)), round(sum(p[1] for p in pts) / len(pts)), pts))
    return sorted(found, key=lambda o: o[1])[:2]                # the two highest; a big shoulder patch can pass 60 px too


ORB_R = 11


def fireball(d, cx, cy, pts, flame, rng):
    """A round fireball round an orb: the densest part of a campfire flame cut to a ragged disc, the orb's own
    yellow heart kept in the middle, and one small tongue licking up from the top."""
    for dy in range(-ORB_R - 2, ORB_R + 3):
        for dx in range(-ORB_R - 2, ORB_R + 3):
            if math.hypot(dx, dy) > ORB_R + rng.choice((-1.5, -.5, .5)):
                continue
            col = flame[FLAME_H - 14 + (dy + ORB_R) * 12 // (2 * ORB_R + 1)][FLAME_HALF + dx * 11 // ORB_R]
            x, y = cx + dx, cy + dy
            if 0 <= x < W and 0 <= y < H:
                d[x, y] = col or (238, 118, 34, 255)
    for x, y in pts:                                           # the hot heart, a little smaller than the orb was
        if math.hypot(x - cx, y - cy) <= 5:
            d[x, y] = (255, 244, 190, 255) if math.hypot(x - cx, y - cy) <= 2.5 else (255, 204, 70, 255)
    for k in range(1, 9):                                      # the tongue
        for ox in range(-(3 - k // 3), 4 - k // 3):
            x, y = cx + ox + (1 if k > 5 else 0), cy - ORB_R - k + 2
            if 0 <= x < W and 0 <= y < H and not (k > 6 and rng.random() < .5):
                d[x, y] = BANDS[min(3, k // 2)] + (255,)


def stamp(d, blade, cx, base, flame):
    """Paints one campfire flame, `base` being the row its foot sits on; returns how many pixels it painted."""
    n = 0
    for fy in range(FLAME_H):
        for fx in range(-FLAME_HALF, FLAME_HALF + 1):
            col = flame[fy][fx + FLAME_HALF]
            x2, y2 = cx + fx, base - (FLAME_H - 1 - fy)
            if col and 0 <= x2 < W and 0 <= y2 < H and (x2, y2) not in blade:
                d[x2, y2] = col
                n += 1
    return n


def main():
    global FLAME, W, H, COLS, ROWS
    FLAME = load_flames()
    for src, dst, W, H, COLS, ROWS in JOBS:
        burn(ROOT / 'public/assets/demon-boss' / src, ROOT / 'public/assets/demon-boss' / dst)


def burn(SRC, DST):
    sheet = Image.open(SRC).convert('RGBA')
    out = sheet.copy()
    painted = 0
    for r in range(ROWS):
        for c in range(COLS):
            box = (c * W, r * H, (c + 1) * W, (r + 1) * H)
            cell = sheet.crop(box)
            px = cell.load()
            blade = {(x, y) for y in range(H) for x in range(W) if is_blade(px[x, y])}
            if not blade:
                continue
            dst = cell.copy()
            d = dst.load()
            for x, y in blade:                                   # heated metal
                d[x, y] = HOT_LIGHT + (255,) if px[x, y][:3] == BLADE_LIGHT else HOT_MID + (255,)
            tops = {}
            for x, y in blade:
                tops[x] = min(tops.get(x, y), y)
            xs = sorted(tops)
            n = r * COLS + c
            for layer in (0,):                                   # one row of flames, drawn over the body
                for k, cx in enumerate(range(xs[0] + 4, xs[-1] - 2, 12)):
                    cx = min(xs, key=lambda v: abs(v - cx))
                    painted += stamp(d, blade, cx, tops[cx] + 3 - layer * 8, FLAME[(n * 2 + k * 23 + layer * 41) % FRAMES])
            rng = random.Random(n)
            for k, (ox, oy, pts) in enumerate(orbs(px)):          # the shoulder orbs become round fireballs
                fireball(d, ox, oy, pts, FLAME[(n * 2 + k * 37 + 11) % FRAMES], rng)
            for x, y in blade:                                    # faint glow around the metal
                for ox, oy in ((-1, 0), (1, 0), (0, 1), (0, -1)):
                    gx, gy = x + ox, y + oy
                    if 0 <= gx < W and 0 <= gy < H and d[gx, gy][3] == 0:
                        d[gx, gy] = (255, 150, 50, 90)
            out.paste(dst, box[:2])
    out.save(DST)
    print(f'wrote {DST.relative_to(ROOT)}; {painted} flame pixels')


if __name__ == '__main__':
    main()
