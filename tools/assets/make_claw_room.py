"""Walls of the Noel claw-machine room, painted as pixel art (1 px = 1 world unit).

Outputs (public/assets/ui/noel/):
  claw-room-back.png  640 x 270  back wall, x = -44 .. 596 (column c -> x = -44 + c)
  claw-room-side.png  480 x 270  left wall, z = 68 .. -412 (column c -> z = 68 - c)
Both run well past the edges of the widest view, so nothing behind them shows.
Row r is wall height y = 270 - r on both.

Drawn in the claw machine's own style: every object has a 1 px ink outline (the cabinet's
#120c14), a lit top-left edge and a shaded bottom-right edge. The wallpaper is a warm tan so the
red cabinet and Crimson stand out against it.

The page (public/minigames/claw-noel.html, drawCabinetRoom / drawRoomLife / drawSnowballFight) maps
each image onto its wall plane and animates what moves on top of them: window snow and the two
skins playing outside (glass x 40..150, y 112..230; the middle bar at columns 93..96), candle
flames (x 52 and 134), tree lights and the star. Keep those spots where they are.
"""
from pathlib import Path
import math, random
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'public/assets/ui/noel'
H = 270
INK = '#120c14'
WOOD, WOOD_D, WOOD_L = '#6b4630', '#4a2d1f', '#93653f'
PAPER, PAPER_D, PAPER_L, MOTIF = '#b49a74', '#a38963', '#c4ab84', '#8f744f'
RED, RED_D, RED_L = '#b8323d', '#7d1f2b', '#dd5a5a'
GREEN, GREEN_D, GREEN_L = '#2f6b3c', '#1f4a2a', '#4c9258'
GOLD, GOLD_D, GOLD_L = '#e8b23a', '#a86e22', '#ffe08a'
SNOW, SNOW_D = '#f2f6ff', '#bccbe3'


class Wall:
    def __init__(self, width):
        self.w = width
        self.img = Image.new('RGBA', (width, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def rect(self, c, y, w, h, col):
        """(c, y) is the bottom-left corner: column, height above the floor."""
        if w <= 0 or h <= 0:
            return
        self.d.rectangle([c, H - (y + h), c + w - 1, H - y - 1], fill=col)

    def px(self, c, y, col):
        self.rect(c, y, 1, 1, col)

    def box(self, c, y, w, h, fill, light=None, dark=None):
        """An outlined block: ink border, lit top and left edges, shaded bottom and right edges."""
        self.rect(c, y, w, h, INK)
        self.rect(c + 1, y + 1, w - 2, h - 2, fill)
        if light:
            self.rect(c + 1, y + h - 2, w - 2, 1, light); self.rect(c + 1, y + 1, 1, h - 2, light)
        if dark:
            self.rect(c + 1, y + 1, w - 2, 1, dark); self.rect(c + w - 2, y + 1, 1, h - 3, dark)

    def base(self):
        W, r = self.w, self.rect
        # wallpaper: soft vertical stripes with a small diamond motif
        r(0, 77, W, H - 77, PAPER)
        for c in range(0, W, 12):
            r(c, 77, 5, H - 77, PAPER_D)
            r(c + 5, 77, 1, H - 77, PAPER_L)
        for y in range(96, H - 14, 24):
            for c in range(8, W, 24):
                cc = c + (12 if (y // 24) % 2 else 0)
                for dy, w in ((0, 1), (1, 3), (2, 1)):
                    r(cc - w // 2, y + dy, w, 1, MOTIF)
        # crown moulding under the ceiling
        r(0, H - 9, W, 9, INK); r(0, H - 8, W, 6, WOOD); r(0, H - 8, W, 1, WOOD_D); r(0, H - 3, W, 1, WOOD_L)
        # wainscot: outlined raised panels with a bevel
        r(0, 0, W, 77, WOOD_D)
        for c in range(4, W, 34):
            self.box(c, 12, 28, 52, WOOD, WOOD_L, INK)
            r(c + 4, 16, 20, 44, WOOD_D); r(c + 5, 17, 18, 42, WOOD)
        r(0, 0, W, 9, INK); r(0, 1, W, 7, '#2e1c14'); r(0, 7, W, 1, WOOD)
        # chair rail
        r(0, 71, W, 9, INK); r(0, 72, W, 7, '#b0844a'); r(0, 78, W, 1, '#e3b56a'); r(0, 72, W, 1, '#6e4a26')
        # garland swag with outlined bows and gold baubles
        for c in range(W):
            y = 248 - int(9 * abs(math.sin(c * math.pi / 64)))
            r(c, y - 3, 1, 7, INK)
            r(c, y - 2, 1, 5, GREEN if c % 3 else GREEN_L)
            if c % 5 == 0:
                r(c, y - 2, 1, 1, GREEN_D)
        for c in range(32, W, 64):
            y = 248 - int(9 * abs(math.sin(c * math.pi / 64)))
            self.box(c - 2, y - 7, 5, 5, GOLD, GOLD_L, GOLD_D)
        for c in range(64, W, 64):
            self.box(c - 5, 243, 11, 7, RED, RED_L, RED_D)
            self.box(c - 4, 233, 4, 10, RED, RED_L, RED_D); self.box(c + 1, 233, 4, 10, RED, RED_L, RED_D)
            self.box(c - 1, 244, 3, 5, RED_D)

    def save(self, name):
        path = OUT_DIR / name
        self.img.save(path)
        print('wrote', path.relative_to(ROOT), self.img.size)


# ---------------------------------------------------------------- back wall: tree, gifts, painting
back = Wall(640)
back.base()
r, p, box = back.rect, back.px, back.box
FX, FY = 214, 150                                           # a framed winter painting
box(FX - 5, FY - 5, 54, 44, '#b0844a', GOLD_L, '#6e4a26')
r(FX - 2, FY - 2, 48, 38, INK)
for i in range(34):
    t = i / 34
    r(FX, FY + i, 44, 1, (int(40 - 20 * t), int(70 - 30 * t), int(120 - 40 * t), 255))
for c in range(44):
    h = int(10 + 4 * math.sin(c / 6))
    r(FX + c, FY, 1, h, '#e6eefb')
    r(FX + c, FY + h, 1, 1, SNOW_D)
for k in range(7):
    r(FX + 30 - k, FY + 8 + k * 2, 2 * k + 1, 2, GREEN)
r(FX + 8, FY + 24, 4, 4, '#fff0b8')
TX = 262 + 44                                               # tree trunk centre (x = 262)
box(TX - 5, 9, 11, 14, '#5a3a24', '#7a5230', '#3a2416')
for base_y, top, half in ((22, 82, 42), (70, 128, 33), (114, 166, 24), (152, 196, 14)):
    for y in range(base_y, top):
        w = int(half * (1 - (y - base_y) / (top - base_y))) + 1
        for x in range(-w - 1, w + 2):
            if abs(x) >= w:
                p(TX + x, y, INK)
            else:
                p(TX + x, y, '#1f5a34' if x > w // 2 else ('#2f7a46' if (x + y) % 5 else '#3a8c52'))
    for x in range(-half, half + 1):
        p(TX + x, base_y, INK)
        if abs(x) < half - 1:
            p(TX + x, base_y + 1, SNOW if (x // 3) % 2 else SNOW_D)
for k in range(5):                                          # tinsel
    for x in range(-40 + k * 8, 41 - k * 8):
        p(TX + x, 40 + k * 32 + int(4 * math.sin((x + k * 9) / 6)), '#e8c060' if (x // 2) % 2 else '#fff0a8')
for ox, oy, col, lit in ((-22, 50, RED, RED_L), (18, 58, '#3e6fd0', '#7fa8ff'), (-8, 96, GOLD, GOLD_L), (16, 108, RED, RED_L),
                         (-14, 140, '#3e6fd0', '#7fa8ff'), (6, 150, GOLD, GOLD_L), (-28, 30, GOLD, GOLD_L), (30, 34, RED, RED_L)):
    box(TX + ox - 3, oy - 3, 7, 7, col, lit)
    p(TX + ox - 1, oy + 1, '#ffffff')
box(TX - 2, 195, 5, 5, '#b8862c')                           # star stem (the star is animated)
for gx, gw, gh, body, lit, ribbon in ((250, 26, 20, RED, RED_L, '#f2d27a'), (280, 18, 14, '#3e6fd0', '#7fa8ff', '#f4efe4'),
                                      (328, 24, 18, GREEN, GREEN_L, '#e0414a'), (350, 14, 24, GOLD, GOLD_L, RED)):
    box(gx, 8, gw, gh, body, lit, INK)
    r(gx + gw // 2 - 1, 9, 3, gh - 2, ribbon); r(gx + 1, 8 + gh // 2, gw - 2, 2, ribbon)
    box(gx + gw // 2 - 6, 7 + gh, 5, 4, ribbon); box(gx + gw // 2 + 2, 7 + gh, 5, 4, ribbon)
back.save('claw-room-back.png')

# ---------------------------------------------------------------- side wall: window, stockings
side = Wall(480)
side.base()
r, p, box = side.rect, side.px, side.box
rnd = random.Random(7)
WX, WY, WW, WH = 40, 112, 110, 118                          # window glass
# curtains behind the frame: deep red with folds, an ink edge and gold tie-backs
for cx in (WX - 22, WX + WW + 8):
    r(cx - 1, WY - 8, 16, WH + 22, INK)
    for i in range(14):
        r(cx + i, WY - 7, 1, WH + 20, RED_D if i % 5 == 0 else RED if i % 5 < 3 else RED_L)
    box(cx - 1, WY + 30, 16, 6, GOLD, GOLD_L, GOLD_D)
# frame: an outlined wooden casing with a bevel
box(WX - 10, WY - 10, WW + 20, WH + 20, WOOD, WOOD_L, WOOD_D)
r(WX - 1, WY - 1, WW + 2, WH + 2, INK)
for i in range(WH):                                         # night sky
    t = i / WH
    r(WX, WY + i, WW, 1, (int(36 - 22 * t), int(54 - 30 * t), int(100 - 44 * t), 255))
for _ in range(34):
    p(WX + rnd.randrange(WW), WY + 55 + rnd.randrange(WH - 60), '#dfe9ff')
for dy in range(-10, 11):                                   # moon with a soft ink rim
    for dx in range(-10, 11):
        d2 = dx * dx + dy * dy
        if d2 <= 100:
            p(WX + 82 + dx, WY + 92 + dy, '#2c3550' if d2 > 81 else '#fff0b8' if dx < 3 else '#ffe48a')
for x in range(WW):                                         # snowy hills
    h = int(34 + 6 * math.sin(x / 13) + 4 * math.sin(x / 5.3))
    r(WX + x, WY, 1, h, '#2a3d63'); r(WX + x, WY + h - 2, 1, 2, '#c9d9ef')
for hx, hw, hh in ((4, 18, 20), (28, 22, 24), (56, 16, 18), (78, 24, 26)):
    r(WX + hx - 1, WY, hw + 2, hh + 1, INK)
    r(WX + hx, WY, hw, hh, '#1d2a45')
    for k in range(hw // 2 + 2):
        r(WX + hx - 1 + k, WY + hh + k, hw + 2 - 2 * k, 1, SNOW if k < 2 else '#cfdcf0')
    for wx in range(hx + 3, hx + hw - 3, 7):
        r(WX + wx, WY + 6, 3, 4, '#ffcf6a'); r(WX + wx, WY + hh - 9, 3, 3, '#f5b453')
r(WX, WY, WW, 5, SNOW)
for k in range(10):                                         # frost in the corners
    for c0 in (WX + k, WX + WW - 1 - k):
        r(c0, WY + 62, 1, 9 - k, '#dfeaff'); r(c0, WY + WH - 10 + k, 1, 10 - k, '#e7f0ff')
for g in range(3):                                          # glass glints
    for k in range(6):
        p(WX + 8 + g * 5 + k, WY + WH - 8 - g * 3 - k, '#5d6f9c')
# muntins: the middle bar (redrawn by the page over the children outside) and the cross bar
r(WX + WW // 2 - 3, WY, 6, WH, INK); r(WX + WW // 2 - 2, WY, 4, WH, WOOD)
r(WX, WY + 57, WW, 6, INK); r(WX, WY + 58, WW, 4, WOOD); r(WX, WY + 61, WW, 1, WOOD_L)
# sill with snow, then candles standing on it (flames are animated)
box(WX - 16, WY - 14, WW + 32, 8, '#b0844a', '#e3b56a', '#6e4a26')
r(WX - 14, WY - 7, WW + 28, 2, SNOW); r(WX - 12, WY - 8, WW + 24, 1, SNOW_D)
for cx in (WX + 12, WX + WW - 16):
    box(cx - 1, WY - 3, 6, 14, '#f2e6cc', '#ffffff', '#d6c6a6')
# wreath on the glass
cx, cy = WX + WW // 2, WY + WH - 18
for a in range(0, 360, 10):
    x = cx + round(11 * math.cos(math.radians(a))); y = cy + round(11 * math.sin(math.radians(a)))
    r(x - 3, y - 3, 6, 6, INK)
for a in range(0, 360, 10):
    x = cx + round(11 * math.cos(math.radians(a))); y = cy + round(11 * math.sin(math.radians(a)))
    r(x - 2, y - 2, 4, 4, GREEN if a % 30 else GREEN_L)
for a in range(15, 360, 45):
    p(cx + round(11 * math.cos(math.radians(a))), cy + round(11 * math.sin(math.radians(a))), '#e0414a')
box(cx - 5, cy - 15, 11, 6, RED, RED_L, RED_D); box(cx - 4, cy - 21, 4, 7, RED, RED_L); box(cx + 1, cy - 21, 4, 7, RED, RED_L)
# stockings hanging from the chair rail
for i, (sx, col, lit) in enumerate(((178, RED, RED_L), (196, GREEN, GREEN_L), (214, RED, RED_L))):
    r(sx + 3, 62, 1, 10, '#6e4a26')
    box(sx - 1, 45, 11, 20, col, lit)
    box(sx - 1, 39, 17, 9, col, lit)
    box(sx - 2, 59, 13, 7, '#f4efe4', '#ffffff', '#cfc6b4')
    for k in range(2, 14, 4):
        r(sx + 2, 49 + k, 5, 1, '#f4efe4' if i != 1 else '#e0414a')
side.save('claw-room-side.png')
