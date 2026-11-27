"""Prepare Kael and Aeris's Noel atlases from the four original white-matte sheets.

Usage: python prepare_noel_outfits.py KAEL_WALK KAEL_COMBAT AERIS_WALK AERIS_COMBAT
Requires Pillow and NumPy. Cell sizes and feet anchors match christmasOutfits.ts.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ASSETS = Path(__file__).resolve().parents[2] / "public/assets/christmas-outfits"
INK = (12, 15, 23)
CUTS = {
    "reindeer": [
        [0, 198, 401, 618, 815, 1012, 1200], [0, 200, 404, 601, 808, 1005, 1200],
        [0, 205, 401, 598, 810, 1007, 1200], [0, 200, 402, 609, 811, 1041, 1200],
    ],
    "snowman": [
        [0, 199, 400, 600, 798, 996, 1200], [0, 202, 400, 600, 802, 1004, 1200],
        [0, 199, 402, 601, 821, 1007, 1200], [0, 201, 402, 602, 820, 1008, 1200],
    ],
}


def pixel_frame(source, combat):
    # One art pixel is two source pixels. Denoise the JPEG speckle before sampling.
    small = source.filter(ImageFilter.MedianFilter(3)).resize(
        (source.width // 2, source.height // 2), Image.Resampling.BOX)
    rgb = np.asarray(small).astype(np.int16)
    low, high = rgb.min(axis=2), rgb.max(axis=2)
    matte = (low > 210) & (high - low < 32)
    flood = Image.fromarray(np.uint8(matte) * 255).copy()
    # All cells have clear corners. Flooding from the outside retains the whites of the coat.
    ImageDraw.floodfill(flood, (0, 0), 128)
    solid = np.asarray(flood) != 128
    mask = Image.fromarray(np.uint8(solid) * 255).filter(ImageFilter.MedianFilter(3))
    solid = np.array(mask) > 0
    # Darken only the character silhouette. Detached icy bolts, glows and gold sparks
    # retain their own hues. The knight's steel and Aeris's snow use their authored shading.
    dark = solid & (high < 145)
    near_ink = np.array(Image.fromarray(np.uint8(dark)*255).filter(ImageFilter.MaxFilter(5))) > 0
    eroded = np.array(mask.filter(ImageFilter.MinFilter(3))) > 0
    expanded = np.array(mask.filter(ImageFilter.MaxFilter(3))) > 0
    edge = expanded & ~eroded
    if combat:
        edge &= near_ink
        # A white matte around an airborne effect reads as a white box against dark scenery.
        pale_rim = solid & ~eroded & ~near_ink & (low > 185) & (high-low < 24)
        solid &= ~pale_rim
    color = small.filter(ImageFilter.UnsharpMask(radius=1.2, percent=100, threshold=5))
    color = ImageEnhance.Color(color).enhance(1.06)
    pixels = np.array(color)
    pixels[edge] = INK
    pixels[~(solid | edge)] = 0
    return Image.fromarray(np.dstack((pixels, np.uint8(solid | edge)*255)))


def finish(cells, columns):
    w,h = cells[0].size
    atlas = Image.new("RGBA", (columns*w, len(cells)//columns*h))
    for i,frame in enumerate(cells):
        atlas.paste(frame, (i%columns*w, i//columns*h))
    # Share shades between poses so the scarf, hat and face stay stable through animation.
    rgb = atlas.convert("RGB")
    palette = rgb.quantize(colors=112, method=Image.Quantize.MEDIANCUT)
    colored = rgb.quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    colored.putalpha(atlas.getchannel("A"))
    return colored.resize((atlas.width*2, atlas.height*2), Image.Resampling.NEAREST)


def prepare(name, walk_path, combat_path):
    walk = Image.open(walk_path).convert("RGB")
    combat = Image.open(combat_path).convert("RGB")
    if walk.size != (1600,800) or combat.size != (1200,896):
        raise ValueError(f"Unexpected source dimensions for {name}")
    walking = [pixel_frame(walk.crop((x,y,x+200,y+200)),False)
               for y in range(0,800,200) for x in range(0,1600,200)]
    finish(walking,8).save(ASSETS/f"{name}-walk.png", optimize=True)
    rows = [0,216,450,674,896] if name=="snowman" else [0,215,450,675,896]
    poses = []
    for row, cuts in enumerate(CUTS[name]):
        for col, (left,right) in enumerate(zip(cuts,cuts[1:])):
            tile = combat.crop((left,rows[row],right,rows[row+1]))
            # Determine the ground from visible paint before adding an outline.
            values = np.asarray(tile).astype(np.int16)
            paint = (values.min(2)<192) | (values.max(2)-values.min(2)>34)
            feet = int(np.nonzero(paint)[0].max()+1)
            if name=="snowman" and (row,col)==(2,4):
                feet = 202  # airborne bolts have no character feet
            cell = Image.new("RGB",(300,240),"white")
            cell.paste(tile,(150-(100+col*200-left),220-feet))
            poses.append(pixel_frame(cell,True))
    finish(poses,6).save(ASSETS/f"{name}-combat.png", optimize=True)


if __name__ == "__main__":
    args=argparse.ArgumentParser(description=__doc__)
    for name in ["kael_walk","kael_combat","aeris_walk","aeris_combat"]:
        args.add_argument(name,type=Path)
    paths=args.parse_args()
    prepare("reindeer",paths.kael_walk,paths.kael_combat)
    prepare("snowman",paths.aeris_walk,paths.aeris_combat)
