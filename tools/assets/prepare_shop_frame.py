"""
Tanuki's catalogue frame, regraded for the sunset shop: the same painted mossy stone and vines,
lit to belong in front of the warm evening scene instead of the cool forest UI.

Input  public/assets/ui/trading-forest-frame.png        the forest UI's catalogue frame (1122 x 1402)
Output public/assets/ui/trading-forest-frame-warm.png   same size and transparency, recoloured

Three changes, nothing redrawn (every stroke stays the painter's):
  * Glowing runes: the bright cyan glyphs and their glow turn amber, like the shop's lanterns.
  * Wells: the cold dark-teal insides of the stock window and description box turn deep warm brown.
  * Everything else (stone, moss, vines, leaves): a light sunset grade, a touch more red and less
    blue, so the stone takes the same light as the counter behind it.

Run: python -I -X utf8 tools/assets/prepare_shop_frame.py
"""
import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/assets/ui/trading-forest-frame.png'
OUT = ROOT / 'public/assets/ui/trading-forest-frame-warm.png'

RUNE_HUE = (0.42, 0.56)      # cyan glow, as a 0-1 hue range
RUNE_TO_HUE = 0.105          # amber
WELL_MAX_VALUE = 0.5         # dark teal panel interiors and the teal haze around rune glyphs
WELL_HUE = (0.40, 0.58)
SUNSET = (1.07, 1.0, 0.88)   # per-channel grade for the rest


def regrade(rgba):
    r, g, b, a = rgba
    if a == 0:
        return rgba
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if RUNE_HUE[0] <= h <= RUNE_HUE[1] and s > 0.35 and v > 0.35:
        # Rune light: keep its brightness and saturation, move it to amber.
        nr, ng, nb = colorsys.hsv_to_rgb(RUNE_TO_HUE, min(1, s * 0.95), min(1, v * 1.02))
        return (round(nr * 255), round(ng * 255), round(nb * 255), a)
    if WELL_HUE[0] <= h <= WELL_HUE[1] and v <= WELL_MAX_VALUE and s > 0.15:
        # Dark teal well: same darkness, warm brown hue.
        nr, ng, nb = colorsys.hsv_to_rgb(0.07, min(0.55, s * 1.1), v * 0.95)
        return (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return (min(255, round(r * SUNSET[0])), min(255, round(g * SUNSET[1])), min(255, round(b * SUNSET[2])), a)


def main():
    src = Image.open(SRC).convert('RGBA')
    out = Image.new('RGBA', src.size)
    out.putdata([regrade(p) for p in src.get_flattened_data()])
    out.save(OUT, optimize=True)
    print(f'wrote {OUT.relative_to(ROOT)} {out.size}')


if __name__ == '__main__':
    main()
