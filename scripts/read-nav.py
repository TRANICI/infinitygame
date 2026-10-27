"""Inspect Source 2 navigation polygons and their elevations (NAV v31-v36).

Format reference: ValveResourceFormat/NavMesh, https://github.com/ValveResourceFormat/ValveResourceFormat
This parser only reads geometry and links; it does not import game materials.
"""
import io
import json
import struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
f=io.BytesIO((ROOT/'test-results/source-map/de_dust2.nav').read_bytes())
def read(fmt):
    values=struct.unpack('<'+fmt,f.read(struct.calcsize('<'+fmt)))
    return values[0] if len(values)==1 else values
def skip_kv3():
    f.seek((f.tell()+7)&~7)
    start=f.tell(); magic=read('I');assert magic==0x4b563305
    f.read(16);compression=read('I');f.read(24)
    raw,compressed,blocks,blobs=read('4I');assert blocks==blobs==0
    f.read(56)
    assert f.tell()-start==120
    f.read(compressed if compression else raw)

magic,version,sub=read('3I');assert magic==0xfeedface and 31<=version<=36
read('B');places=[]
for _ in range(read('H')):places.append(f.read(read('H')).rstrip(b'\0').decode())
read('B')
if version>=36:skip_kv3()
corners=[read('3f') for _ in range(read('I'))]
polys=[]
for _ in range(read('I')):
    ids=[read('I') for _ in range(read('B'))]
    if version>=35:read('I')
    polys.append(ids)
if version>=32 and read('I')&1:f.read(read('I')*12)
if version>=35:
    for _ in range(read('I')):
        while f.read(1)!=b'\0':pass
        f.read(48)
if version>=36:skip_kv3()
areas=[]
for _ in range(read('I')):
    aid,flags,hull,polygon=read('IQBI');read('f');links=[]
    for _ in polys[polygon]:
        links.extend(read('II')[0] for _ in range(read('I')))
    hiding=read('B');assert hiding==0
    encounters=read('I');assert encounters==0
    f.read(read('I')*4);f.read(read('I')*4)
    areas.append(dict(id=aid,hull=hull,polygon=polygon,links=links))
out=dict(version=version,vertices=corners,polygons=polys,areas=areas)
(ROOT/'test-results/source-map/nav.json').write_text(json.dumps(out),encoding='utf-8')
print(json.dumps(dict(version=version,vertices=len(corners),polygons=len(polys),areas=len(areas),
     bounds=[[min(p[i] for p in corners),max(p[i] for p in corners)] for i in range(3)],
     hulls=sorted(set(a['hull'] for a in areas)))))

# Register the local NAV against the supplied overhead. Navigation hulls are inset
# from visible walls; this transform aligns both courtyards and doorway corners.
terrain=dict(sourceVersion=version,unitsToMetres=.0254,registration=[.18,472,-.182,591],
 vertices=[[round(x*.18+472,3),round(-y*.182+591,3),round((z+182)*.0254,4)] for x,y,z in corners],
 polygons=polys)
(ROOT/'dust2-terrain-data.js').write_text('"use strict";\nconst DUST2_TERRAIN_DATA='+json.dumps(terrain,separators=(',',':'))+';\n',encoding='utf-8')
