from PIL import Image, ImageFilter
import numpy as np
from pathlib import Path
from collections import deque

root = Path(__file__).resolve().parents[2]
source = root / 'tools/assets/source/crimson/Crimson_Source_Poster.png'
out = root / 'public/assets/crimson'
out.mkdir(parents=True, exist_ok=True)
im = Image.open(source).convert('RGB')

# Coordinates enclose only character poses; typography and shown projectile paths stay outside.
boxes = {
 'idle0':(98,328,300,580),'idle1':(330,328,535,580),'idle2':(558,328,765,580),'idle3':(780,328,995,580),
 'run0':(1360,328,1560,580),'run1':(1590,328,1800,580),'run2':(1820,328,2040,580),'run3':(2080,328,2310,580),'run4':(2320,328,2545,580),
 'atk1a':(95,700,310,960),'atk1b':(330,700,560,960),
 'atk2a':(985,700,1215,960),'atk2b':(1210,700,1450,960),
 'atk3a':(1780,700,2015,960),'atk3b':(2020,700,2255,960),
 'skill0':(90,1080,325,1350),'skill1':(420,1080,620,1350),'skill2':(655,1080,815,1350),'skill3':(855,1080,1005,1350),'skill4':(1015,1080,1230,1350),
 'hurt':(1700,1070,1915,1340),'kneel':(1940,1070,2180,1340),'dead':(2220,1070,2510,1340),
 'dart':(585,780,790,865),
}

palette=np.array([[42,52,61],[54,68,82],[38,47,57],[47,57,66],[36,45,55]], dtype=np.int16)

for name,box in boxes.items():
    crop=im.crop(box)
    a=np.asarray(crop).astype(np.int16)
    distance=np.linalg.norm(a[:,:,None,:]-palette[None,None,:,:],axis=3).min(axis=2)
    # The warm hair, skin and scarf are definitive. Outlines and dark costume are
    # retained through colour distance, while the blue-gray grid is keyed away.
    warm=(a[:,:,0]>a[:,:,2]*1.10)&(a[:,:,0]>a[:,:,1]*1.09)
    dark=(a[:,:,0]<34)&(a[:,:,1]<39)&(a[:,:,2]<52)
    grid=(a[:,:,1]-a[:,:,0]>=7)&(a[:,:,2]-a[:,:,1]>=5)&(a[:,:,0]>=34)&(a[:,:,0]<=90)&(a[:,:,1]<=110)
    foreground=((distance>13)|(warm)|(dark))&(~grid)
    # Keep only foreground near the pose's dominant centre. This drops most poster speckles.
    mask=Image.fromarray((foreground*255).astype('uint8'),'L')
    mask=mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    # A dark jacket can match the poster's navy background. Fill only enclosed
    # holes; transparent gaps between the legs remain connected to the edge.
    m=np.asarray(mask).copy()>0
    h,w=m.shape
    seen=np.zeros_like(m)
    q=deque()
    for xx in range(w):
        if not m[0,xx]:q.append((0,xx))
        if not m[h-1,xx]:q.append((h-1,xx))
    for yy in range(h):
        if not m[yy,0]:q.append((yy,0))
        if not m[yy,w-1]:q.append((yy,w-1))
    while q:
        yy,xx=q.popleft()
        if yy<0 or yy>=h or xx<0 or xx>=w or seen[yy,xx] or m[yy,xx]:continue
        seen[yy,xx]=True
        q.extend(((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)))
    m |= ~seen
    mask=Image.fromarray((m*255).astype('uint8'),'L')
    rgba=crop.convert('RGBA')
    rgba.putalpha(mask)
    rgba.save(out/f'{name}.png')
print(f'Extracted {len(boxes)} exact-source pose crops to {out}')
