"""Rebuild the first chapter footprint from the supplied 820 x 805 reference.

Development only: Python, Pillow, numpy.
Usage: python scripts/trace-layout.py <reference.png>
The game ships only generated vector coordinates, not the reference screenshot.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from collections import deque


ROOT = Path(__file__).resolve().parents[1]
im = Image.open(sys.argv[1]).convert('RGB')
assert im.size == (820, 805), 'Expected the supplied reference at its original resolution'
rgb = np.asarray(im)
# The dark background is distinct from both floor colours and solid cover.
mask = rgb.max(axis=2) > 43
# Remove the yellow cursor extending past the tunnel's east boundary.
for y in range(486, 521):
    edge = round(241 + (y - 486) * 0.13)
    mask[y, edge:257] = False
mask = np.asarray(Image.fromarray(np.uint8(mask)*255).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 0

def components(binary):
    unseen = set(zip(*np.where(binary)))
    result = []
    while unseen:
        start = unseen.pop(); queue = deque([start]); region = [start]
        while queue:
            y,x = queue.popleft()
            for p in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if p in unseen:
                    unseen.remove(p); queue.append(p); region.append(p)
        result.append(region)
    return result

regions = components(mask)
mask[:] = False
for y,x in max(regions, key=len): mask[y,x] = True
for region in components(~mask):
    if len(region) < 1200:
        for y,x in region: mask[y,x] = True

# Follow directed pixel boundary edges, then simplify to sub-two-pixel precision.
edges = {}
def edge(a,b): edges.setdefault(a,[]).append(b)
for y,x in zip(*np.where(mask)):
    if y == 0 or not mask[y-1,x]: edge((x,y),(x+1,y))
    if x == 819 or not mask[y,x+1]: edge((x+1,y),(x+1,y+1))
    if y == 804 or not mask[y+1,x]: edge((x+1,y+1),(x,y+1))
    if x == 0 or not mask[y,x-1]: edge((x,y+1),(x,y))

def rdp(points, epsilon=1.15):
    if len(points) < 3: return points
    a,b = np.array(points[0]),np.array(points[-1]); vec=b-a
    p = np.array(points)-a
    d = np.abs(p[:,0]*vec[1]-p[:,1]*vec[0])/max(1,np.linalg.norm(vec))
    i=int(d.argmax())
    return rdp(points[:i+1],epsilon)[:-1]+rdp(points[i:],epsilon) if d[i]>epsilon else [points[0],points[-1]]

contours=[]
while edges:
    start=next(iter(edges)); loop=[start]; p=start
    while True:
        q=edges[p].pop()
        if not edges[p]: del edges[p]
        loop.append(q); p=q
        if p==start: break
    if len(loop)<50: continue
    split=max(range(len(loop)),key=lambda i:(loop[i][0]-start[0])**2+(loop[i][1]-start[1])**2)
    result=rdp(loop[:split+1])[:-1]+rdp(loop[split:])
    contours.append([[int(x),int(y)] for x,y in result])
contours.sort(key=lambda p:abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]))),reverse=True)
# Rasterize the simplified polygon so collision follows exactly the visible walls.
flat = Image.new('1', im.size)
draw = ImageDraw.Draw(flat)
for points in contours:
    # All internal contours in this map are voids; there are no nested islands.
    draw.polygon([tuple(p) for p in points], fill=1 if points is contours[0] else 0)
poly = np.asarray(flat).astype(bool)
rows = []
for row in poly:
    transitions = np.flatnonzero(np.diff(np.pad(row.astype(np.int8), (1, 1))))
    rows.append(transitions.tolist())
data = dict(sourceSize=list(im.size), scale=.14, contours=contours, rows=rows,
            source='User-supplied Dust II overhead, 2026-10-27', tolerancePixels=1.15)
(ROOT/'dust2-layout.js').write_text('"use strict";\nconst DUST2_LAYOUT=' + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
out = ROOT/'test-results'; out.mkdir(exist_ok=True)
overlay = im.copy(); d = ImageDraw.Draw(overlay)
for points in contours:
    d.line([tuple(p) for p in points], fill=(255, 70, 210), width=2)
overlay.save(out/'dust2-outline-overlay.png')
Image.fromarray(np.uint8(poly)*255).save(out/'dust2-footprint.png')
print(json.dumps({'contours':len(contours),'vertices':sum(map(len,contours)),
                  'footprintIoU':float((poly & mask).sum()/(poly | mask).sum()),
                  'areaPixels':int(poly.sum())}))
