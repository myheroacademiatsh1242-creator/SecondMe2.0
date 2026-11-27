"""Pack the approved Noel preview and generated 4x3 motion sheets for one costume.
Usage: python prepare_noel_outfits.py snowman|reindeer APPROVED WALK COMBAT
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps

OUTPUT = Path(__file__).resolve().parents[2] / "public/assets/christmas-outfits"


def sections(image, count, axis):
    """Find the transparent gutter nearest each nominal grid boundary."""
    alpha = np.asarray(image.getchannel("A")) > 64
    coverage = alpha.sum(axis=axis)
    size = len(coverage)
    cuts = [0]
    for n in range(1, count):
        nominal = round(n * size / count)
        radius = round(size / count / 8)
        candidates = range(nominal - radius, nominal + radius + 1)
        cuts.append(min(candidates, key=lambda p: (coverage[p], abs(p - nominal))))
    return cuts + [size]


def cells(image):
    rows = sections(image, 3, 1)
    result = []
    for top, bottom in zip(rows, rows[1:]):
        strip = image.crop((0, top, image.width, bottom))
        columns = sections(strip, 4, 0)
        for left, right in zip(columns, columns[1:]):
            result.append((strip.crop((left, 0, right, strip.height)), left, top))
    return result


def place(cell, image, anchor, target, scale):
    # Trim before scaling. Anchor both sheets on the hero's feet, independent of spell size.
    box = image.getchannel("A").point(lambda a: 255 if a >= 80 else 0).getbbox()
    if box is None:
        raise ValueError("Empty pose")
    cropped = image.crop(box)
    cropped.putalpha(cropped.getchannel("A").point(lambda a: 255 if a >= 96 else 0))
    size = tuple(max(1, round(v * scale)) for v in cropped.size)
    sprite = cropped.resize(size, Image.Resampling.NEAREST)
    xy = tuple(round(t - (a - b) * scale) for t, a, b in zip(target, anchor, box[:2]))
    if xy[0] < 0 or xy[1] < 0 or xy[0]+size[0] > cell.width or xy[1]+size[1] > cell.height:
        raise ValueError(f"Pose outside {cell.size}: {xy}, {size}")
    cell.paste(sprite, xy)


def preview_frames(path):
    board = Image.open(path).convert("RGB")
    rgb = np.asarray(board).astype(np.int16)
    bg = np.median(rgb[:30], axis=(0,1))
    mask = np.abs(rgb - bg).max(axis=2) > 18
    board = board.convert("RGBA")
    board.putalpha(Image.fromarray(np.uint8(mask)*255))
    cuts = [round(i*board.width/3) for i in range(4)]
    return [board.crop((a,0,b,board.height)) for a,b in zip(cuts,cuts[1:])]


def black_fringe(frame, center, radii, repair_matte=False):
    # Dark teal hair in the approved board partly matched its green background.
    # Recover enclosed pixels inside the fringe, then retain its stepped shading in charcoal.
    pixels = np.array(frame)
    x, y = center
    rx, ry = radii
    yy, xx = np.ogrid[:frame.height, :frame.width]
    fringe = ((xx-x)/rx)**2 + ((yy-y)/ry)**2 <= 1
    rgb = pixels[:, :, :3].astype(np.int16)
    cool = (rgb.max(axis=2) < 115) & (rgb[:, :, 0] <= rgb[:, :, 1]+5)
    if repair_matte:
        alpha = Image.fromarray(pixels[:, :, 3]).copy()
        ImageDraw.floodfill(alpha, (0, 0), 128)
        enclosed = np.asarray(alpha) != 128
        pixels[fringe & cool & enclosed, 3] = 255
    selected = fringe & cool & (pixels[:, :, 3] > 0)
    gray = np.minimum(43, (rgb[:, :, 1] * 45 // 100))
    pixels[selected, :3] = gray[selected, None]
    return Image.fromarray(pixels)


def pack(name, preview, walk, combat):
    approved = preview_frames(preview)
    walking = []
    for image, _, _ in cells(Image.open(walk).convert("RGBA")):
        box = image.getchannel("A").point(lambda a: 255 if a >= 80 else 0).getbbox()
        anchor = ((box[0]+box[2])/2,box[3])
        cell = Image.new("RGBA",(200,200))
        place(cell,image,anchor,(100,186),160/(box[3]-box[1]))
        if name == "snowman" and len(walking) < 8:
            side = len(walking) >= 4
            cell = black_fringe(cell, (116,87) if side else (101,88), (18,17) if side else (25,19))
        walking.append(cell)
    front = Image.new("RGBA",(200,200))
    box = approved[0].getbbox()
    place(front,approved[0],((box[0]+box[2])/2,box[3]),(100,186),160/(box[3]-box[1]))
    if name == "snowman":
        front = black_fringe(front, (100,91), (27,23), repair_matte=True)
    left = [ImageOps.mirror(frame) for frame in walking[4:8]]
    rows = [[front,walking[4],walking[8],left[0],*walking[:4]],
            left,walking[4:8],walking[8:12]]
    atlas = Image.new("RGBA",(1600,800))
    for y,row in enumerate(rows):
        for x,frame in enumerate(row):
            atlas.paste(frame,(200*x,200*y))
    atlas.save(OUTPUT/f"{name}-walk.png",optimize=True)

    # Body centres and sole positions in a 400x300 layout; VFX can extend beyond the feet.
    if name=="snowman":
        xs = [48,145,239,343,50,146,244,345,50,146,244,345]
        ys = [85]*4+[181]*4+[284,282,280,284]
        reference_height=254
        approved_anchors=[(1080-723,628),(1818-1447,578)]
    else:
        xs = [51,146,240,345,51,145,243,344,51,145,241,344]
        ys = [85]*4+[182]*4+[283,283,282,283]
        reference_height=247
        approved_anchors=[(1052-723,630),(1764-1447,617)]
    attacks=[]
    for i,(image,left,top) in enumerate(cells(Image.open(combat).convert("RGBA"))):
        frame=Image.new("RGBA",(360,270))
        anchor=(xs[i]*1448/400-left,ys[i]*1086/300-top)
        place(frame,image,anchor,(165,227),184/reference_height)
        if name == "snowman":
            centers = [(176,119),(177,120),(171,120),(172,122),(177,122),(181,123),
                       (170,118),(178,119),(175,128),(174,116),(177,126),(184,117)]
            frame = black_fringe(frame, centers[i], (27,20))
        attacks.append(frame)
    for image,anchor in zip(approved[1:],approved_anchors):
        frame=Image.new("RGBA",(360,270))
        place(frame,image,anchor,(165,227),184/(450 if name=="snowman" else 446))
        if name == "snowman":
            center = (167,114) if len(attacks) == 12 else (170,132)
            frame = black_fringe(frame, center, (30,23), repair_matte=True)
        attacks.append(frame)
    atlas=Image.new("RGBA",(4*360,4*270))
    for i,frame in enumerate(attacks):
        atlas.paste(frame,(i%4*360,i//4*270))
    atlas.save(OUTPUT/f"{name}-combat.png",optimize=True)


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name",choices=["snowman","reindeer"])
    for source in ("preview","walk","combat"):
        parser.add_argument(source,type=Path)
    pack(**vars(parser.parse_args()))
