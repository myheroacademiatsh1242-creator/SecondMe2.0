"""Walls of the Noel claw-machine room, painted as pixel art (1 px = 1 world unit).

Outputs (public/assets/ui/noel/):
  claw-room-back.png  640 x 270  back wall, x = -44 .. 596 (column c -> x = -44 + c)
  claw-room-side.png  480 x 270  left wall, z = 68 .. -412 (column c -> z = 68 - c)
Both run well past the edges of the widest view, so the old masonry behind them never shows.
Row r is wall height y = 270 - r on both.
The page (public/minigames/claw-noel.html, drawCabinetRoom / drawRoomLife) maps each image onto its
wall plane and animates what moves on top of them (window snow, candle flames, tree lights, the star),
using the same column/row coordinates listed in ROOM_FX there. Keep the two in step.
"""
from pathlib import Path
import math, random
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'public/assets/ui/noel'
H = 270


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

    def base(self):
        W, r = self.w, self.rect
        r(0, 77, W, H - 77, '#4a2833')                      # plum wallpaper
        for c in range(0, W, 14):
            r(c, 77, 6, H - 77, '#53303b')
        for y in range(92, H, 22):
            for c in range(10, W, 28):
                cc = c + (7 if (y // 22) % 2 else 0)
                for dy, w in ((0, 1), (1, 3), (2, 1)):
                    r(cc - w // 2, y + dy, w, 1, '#7a5040')
        r(0, 0, W, 77, '#5a3826')                           # wainscot
        for c in range(4, W, 34):
            r(c, 10, 28, 56, '#4a2d1f'); r(c + 2, 12, 24, 52, '#64402b'); r(c + 2, 62, 24, 2, '#7a5236')
        r(0, 0, W, 8, '#2e1c14')
        r(0, 72, W, 7, '#b0844a'); r(0, 78, W, 1, '#e3b56a'); r(0, 72, W, 1, '#6e4a26')
        for c in range(W):                                  # garland swag with bows
            y = 252 - int(9 * abs(math.sin(c * math.pi / 64)))
            r(c, y - 2, 1, 5, '#2f6b3c' if c % 3 else '#3f8a4c')
        for c in range(64, W, 64):
            r(c - 4, 247, 9, 5, '#c8333f'); r(c - 3, 240, 2, 7, '#c8333f'); r(c + 2, 240, 2, 7, '#c8333f')

    def save(self, name):
        path = OUT_DIR / name
        self.img.save(path)
        print('wrote', path.relative_to(ROOT), self.img.size)


# ---------------------------------------------------------------- back wall: tree, gifts, painting
back = Wall(640)
back.base()
r, p = back.rect, back.px
# a framed winter painting above where Crimson stands
FX, FY = 214, 150
r(FX - 3, FY - 3, 50, 40, '#b0844a'); r(FX - 2, FY - 2, 48, 38, '#6e4a26')
for i in range(34):
    t = i / 34
    r(FX, FY + i, 44, 1, (int(40 - 20 * t), int(70 - 30 * t), int(120 - 40 * t), 255))
for c in range(44):
    h = int(10 + 4 * math.sin(c / 6))
    r(FX + c, FY, 1, h, '#e6eefb')
for k in range(7):                                         # a little pine in the painting
    r(FX + 30 - k, FY + 8 + k * 2, 2 * k + 1, 2, '#2f6b3c')
r(FX + 8, FY + 24, 4, 4, '#fff0b8')                         # moon
TX = 262 + 44                                               # tree trunk centre (x = 262)
r(TX - 4, 10, 9, 12, '#5a3a24')
for base_y, top, half in ((22, 82, 42), (70, 128, 33), (114, 166, 24), (152, 196, 14)):
    for y in range(base_y, top):
        w = int(half * (1 - (y - base_y) / (top - base_y))) + 1
        for x in range(-w, w + 1):
            p(TX + x, y, '#1f5a34' if abs(x) >= w - 1 else ('#2f7a46' if (x + y) % 5 else '#3a8c52'))
for k in range(5):                                          # tinsel
    for x in range(-40 + k * 8, 41 - k * 8):
        p(TX + x, 40 + k * 32 + int(4 * math.sin((x + k * 9) / 6)), '#e8c060' if (x // 2) % 2 else '#fff0a8')
for ox, oy, col in ((-22, 50, '#c8333f'), (18, 58, '#3e6fd0'), (-8, 96, '#e8c060'), (16, 108, '#c8333f'),
                    (-14, 140, '#3e6fd0'), (6, 150, '#e8c060'), (-28, 30, '#e8c060'), (30, 34, '#c8333f')):
    r(TX + ox - 2, oy - 2, 5, 5, col); p(TX + ox - 1, oy + 1, '#ffffff')
r(TX - 1, 196, 3, 4, '#b8862c')                             # star stem (the star is animated)
for gx, gw, gh, body, ribbon in ((250, 26, 20, '#c8333f', '#f2d27a'), (280, 18, 14, '#3e6fd0', '#f4efe4'),
                                 (328, 24, 18, '#2f7a46', '#e0414a'), (350, 14, 24, '#e8c060', '#c8333f')):
    r(gx, 8, gw, gh, body); r(gx + gw // 2 - 1, 8, 3, gh, ribbon); r(gx, 8 + gh // 2, gw, 2, ribbon)
    r(gx + gw // 2 - 4, 8 + gh, 3, 3, ribbon); r(gx + gw // 2 + 2, 8 + gh, 3, 3, ribbon)
back.save('claw-room-back.png')

# ---------------------------------------------------------------- side wall: window, stockings
side = Wall(480)
side.base()
r, p = side.rect, side.px
rnd = random.Random(7)
WX, WY, WW, WH = 40, 112, 110, 118                          # window glass
for i in range(WH):
    t = i / WH
    r(WX, WY + i, WW, 1, (int(36 - 22 * t), int(54 - 30 * t), int(100 - 44 * t), 255))
for _ in range(28):
    p(WX + rnd.randrange(WW), WY + 55 + rnd.randrange(WH - 60), '#dfe9ff')
for dy in range(-9, 10):
    for dx in range(-9, 10):
        if dx * dx + dy * dy <= 81:
            p(WX + 82 + dx, WY + 92 + dy, '#fff0b8' if dx < 3 else '#ffe48a')
for x in range(WW):
    h = int(34 + 6 * math.sin(x / 13) + 4 * math.sin(x / 5.3))
    r(WX + x, WY, 1, h, '#2a3d63'); r(WX + x, WY + h - 2, 1, 2, '#c9d9ef')
for hx, hw, hh in ((4, 18, 20), (28, 22, 24), (56, 16, 18), (78, 24, 26)):
    r(WX + hx, WY, hw, hh, '#1d2a45')
    for k in range(hw // 2 + 2):
        r(WX + hx - 1 + k, WY + hh + k, hw + 2 - 2 * k, 1, '#e8f1ff' if k < 2 else '#cfdcf0')
    for wx in range(hx + 3, hx + hw - 3, 7):
        r(WX + wx, WY + 6, 3, 4, '#ffcf6a'); r(WX + wx, WY + hh - 9, 3, 3, '#f5b453')
r(WX, WY, WW, 5, '#e6eefb')
r(WX - 6, WY - 8, WW + 12, 8, '#7a5133'); r(WX - 8, WY - 10, WW + 16, 3, '#9b6a40'); r(WX - 6, WY - 3, WW + 12, 3, '#f2f6ff')
r(WX - 6, WY, 6, WH + 6, '#6b4630'); r(WX + WW, WY, 6, WH + 6, '#6b4630'); r(WX - 6, WY + WH, WW + 12, 6, '#6b4630')
r(WX + WW // 2 - 2, WY, 4, WH, '#6b4630'); r(WX, WY + 58, WW, 4, '#6b4630')
for k in range(10):
    for c0 in (WX + k, WX + WW - 1 - k):
        r(c0, WY + 62, 1, 9 - k, '#dfeaff'); r(c0, WY + WH - 10 + k, 1, 10 - k, '#e7f0ff')
for cx in (WX - 18, WX + WW + 6):
    for i in range(12):
        r(cx + i, WY - 4, 1, WH + 12, '#8e2f3c' if i % 4 < 2 else '#a93a46')
    r(cx, WY + 34, 12, 4, '#e3b56a')
r(WX - 22, WY + WH + 8, WW + 44, 3, '#b0844a')
cx, cy = WX + WW // 2, WY + WH - 18
for a in range(0, 360, 10):
    x = cx + round(11 * math.cos(math.radians(a))); y = cy + round(11 * math.sin(math.radians(a)))
    r(x - 2, y - 2, 4, 4, '#2f6b3c' if a % 30 else '#3f8a4c')
for a in range(15, 360, 45):
    p(cx + round(11 * math.cos(math.radians(a))), cy + round(11 * math.sin(math.radians(a))), '#e0414a')
r(cx - 4, cy - 14, 9, 4, '#c8333f'); r(cx - 3, cy - 19, 2, 5, '#c8333f'); r(cx + 2, cy - 19, 2, 5, '#c8333f')
for cx in (WX + 12, WX + WW - 16):                          # candles (flames are animated)
    r(cx, WY - 2, 4, 12, '#f2e6cc'); r(cx + 3, WY - 2, 1, 12, '#d6c6a6')
for i, (sx, col) in enumerate(((178, '#c8333f'), (196, '#2f7a46'), (214, '#c8333f'))):
    r(sx + 3, 64, 1, 8, '#6e4a26'); r(sx, 46, 9, 18, col); r(sx, 40, 15, 7, col); r(sx - 1, 60, 11, 5, '#f4efe4')
    for k in range(0, 14, 4):
        r(sx + 2, 48 + k, 5, 1, '#f4efe4' if i != 1 else '#e0414a')
side.save('claw-room-side.png')
