import sys, numpy as np
from PIL import Image
for name in sys.argv[1:]:
    im=np.asarray(Image.open(name).convert('RGB')).astype(int)
    h,w,_=im.shape
    r,g,b=im[...,0],im[...,1],im[...,2]
    gray=(abs(r-g)<12)&(abs(g-b)<12)&(r>90)&(r<190)
    cols=gray.sum(0); rows=gray.sum(1)
    vc=[x for x in range(w) if cols[x]>0.35*h]
    hr=[y for y in range(h) if rows[y]>0.35*w]
    def groups(v):
        out=[];
        for x in v:
            if out and x-out[-1][-1]<=2: out[-1].append(x)
            else: out.append([x])
        return [round(sum(g)/len(g),1) for g in out]
    print(name.split('at ')[-1], w,h,'V',groups(vc),'H',groups(hr))
