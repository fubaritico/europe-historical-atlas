"""Coastal land no polity claims, right beside a drawn polity and the sea: a coast not followed."""
import json, math, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from plates import ROOT, year
B=os.path.join(ROOT,'packages/atlas/public/')
meta=json.load(open(B+'masks/europe-land.json')); W,H=meta['width'],meta['height']; bb=meta['bbox']
bits=np.unpackbits(np.frombuffer(open(B+'masks/europe-land.bin','rb').read(),dtype=np.uint8))[:W*H].reshape(H,W).astype(bool)
M=lambda p: math.log(math.tan(math.pi/4+math.radians(p)/2))
def px(lo,la): return ((lo-bb['west'])/(bb['east']-bb['west'])*W, (M(bb['north'])-M(la))/(M(bb['north'])-M(bb['south']))*H)
doc=year(); A=doc['anchors']
img=Image.new('L',(W,H),0); d=ImageDraw.Draw(img)
for c in doc['claims']:
    for r in c['rings']: d.polygon([px(*A[i]) for i in r],fill=255)
claimed=np.asarray(img)>0
kmpx=(bb['east']-bb['west'])/W*111.2*math.cos(math.radians(45))
r=max(2,int(6/kmpx))
near_claim=ndimage.binary_dilation(claimed,iterations=r)
sea=~bits
near_sea=ndimage.binary_dilation(sea,iterations=r)
gap=bits & ~claimed & near_claim & near_sea
lab,n=ndimage.label(gap,structure=np.ones((3,3)))
sizes=ndimage.sum(gap,lab,range(1,n+1))
out=[]
for i,s in enumerate(sizes,1):
    area=s*kmpx*kmpx
    if area<15: continue
    ys,xs=np.where(lab==i); x,y=xs.mean(),ys.mean()
    lo=bb['west']+x/W*(bb['east']-bb['west']); la=math.degrees(2*math.atan(math.exp(M(bb['north'])-y/H*(M(bb['north'])-M(bb['south']))))-math.pi/2)
    out.append((round(area),round(lo,2),round(la,2)))
out.sort(reverse=True)
print('km/px',round(kmpx,2),'gaps >15 km2:',len(out))
for o in out[:40]: print(o)
