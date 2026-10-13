import sys
from PIL import Image, ImageDraw
src,x0,y0,x1,y1,k,out=sys.argv[1],*map(int,sys.argv[2:7]),sys.argv[7]
im=Image.open(src).convert('RGB').crop((x0,y0,x1,y1)); im=im.resize((im.width*k,im.height*k))
d=ImageDraw.Draw(im)
for X in range((x0//20+1)*20,x1,20):
    px=(X-x0)*k; d.line([(px,0),(px,im.height)],fill=(0,160,0) if X%100 else (0,90,0),width=1)
    if X%100==0: d.text((px+2,2),str(X),fill=(0,0,0))
for Y in range((y0//20+1)*20,y1,20):
    py=(Y-y0)*k; d.line([(0,py),(im.width,py)],fill=(0,160,0) if Y%100 else (0,90,0),width=1)
    if Y%100==0: d.text((2,py+2),str(Y),fill=(0,0,0))
im.save(out)
