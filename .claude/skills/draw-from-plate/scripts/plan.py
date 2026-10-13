"""Plan the Pen gestures that draw one polity from a plate: extract, classify, sequence."""
import sys, json, math
import numpy as np
from PIL import Image
from skimage import measure, morphology
from scipy import ndimage

import os
sys.path.insert(0, os.path.dirname(__file__))
from plates import M, plate, year

def km(a,b):
    c=math.cos(math.radians((a[1]+b[1])/2)); return math.hypot((a[0]-b[0])*111.2*c,(a[1]-b[1])*111.2)
def segd(p,a,b):
    c=math.cos(math.radians(p[1])); P=(p[0]*c*111.2,p[1]*111.2); A=(a[0]*c*111.2,a[1]*111.2); B=(b[0]*c*111.2,b[1]*111.2)
    dx,dy=B[0]-A[0],B[1]-A[1]; L=dx*dx+dy*dy; t=0 if L==0 else max(0,min(1,((P[0]-A[0])*dx+(P[1]-A[1])*dy)/L))
    return math.hypot(P[0]-A[0]-t*dx,P[1]-A[1]-t*dy)
def dp(idx,pts,tol):
    if len(idx)<3: return idx
    a,b=pts[idx[0]],pts[idx[-1]]; best=(0,-1)
    for k in range(1,len(idx)-1):
        d=segd(pts[idx[k]],a,b)
        if d>best[0]: best=(d,k)
    if best[0]<=tol: return [idx[0],idx[-1]]
    k=best[1]; return dp(idx[:k+1],pts,tol)[:-1]+dp(idx[k:],pts,tol)

def run(spec):
    fn,lon,lat,to_px=plate(spec['img'])
    im=np.asarray(Image.open(fn).convert('RGB')).astype(int)
    mask=np.zeros(im.shape[:2],bool)
    seaw=(np.abs(im-np.array([240,245,255])).sum(2)<spec.get('seatol',22))
    for s in spec['seeds']:
        x,y=s[:2]; tol=s[2] if len(s)>2 else spec.get('tol',40)
        col=np.median(im[y-4:y+5,x-4:x+5].reshape(-1,3),axis=0); m=(np.abs(im-col).sum(2)<tol)&~seaw
        m=morphology.binary_closing(m,morphology.disk(spec.get('close',3)))
        lab,_=ndimage.label(m); mask|= ndimage.binary_fill_holes(lab==lab[y,x])
    for x0,y0,x1,y1 in spec.get('cut',[]): mask[y0:y1,x0:x1]=False
    mask=ndimage.binary_fill_holes(morphology.binary_closing(mask,morphology.disk(2)))&~morphology.binary_erosion(seaw,morphology.disk(2))
    lab,_=ndimage.label(mask); x,y=spec['seeds'][0][:2]; mask=lab==lab[y,x]
    cs=measure.find_contours(np.pad(mask,1).astype(float),0.5)
    c=max(cs,key=len)[:-1]-1
    # smooth the pixel contour (circular moving average) so dotted lines and lettering stop showing as teeth
    w=spec.get('smooth',9)
    if w>1:
        k=np.ones(w)/w; n_=len(c)
        ext=np.vstack([c[-w:],c,c[:w]])
        c=np.column_stack([np.convolve(ext[:,0],k,'same'),np.convolve(ext[:,1],k,'same')])[w:w+n_]
    px=[(float(col),float(row)) for row,col in c]
    ll=[(lon(x),lat(y)) for x,y in px]
    keep=dp(list(range(len(ll)))+[0],ll,spec.get('dp',1.2))[:-1]
    # drop spikes: a vertex whose two legs fold back on each other over a short distance
    changed=True
    while changed and len(keep)>4:
        changed=False
        for t in range(len(keep)):
            a_,b_,c_=ll[keep[t-1]],ll[keep[t]],ll[keep[(t+1)%len(keep)]]
            if km(a_,c_)<spec.get('fold',0.5)*min(km(a_,b_),km(b_,c_)) and min(km(a_,b_),km(b_,c_))<spec.get('spike',25):
                keep.pop(t); changed=True; break
    sea=(np.abs(im-np.array([240,245,255])).sum(2)<10)
    H_,W_=sea.shape
    def is_coast(i):
        x,y=px[i]; r=spec.get('sear',7); y0,y1=max(0,int(y)-r),min(H_,int(y)+r+1); x0,x1=max(0,int(x)-r),min(W_,int(x)+r+1)
        return sea[y0:y1,x0:x1].mean()>0.08
    # existing rings
    doc=year(); A=doc['anchors']
    rings=[[A[i] for i in r] for cl in doc['claims'] if cl['polity']!=spec.get('id') for r in cl['rings']]
    allA=[a for r in rings for a in r]
    def near_anchor(p):
        best=(1e9,None)
        for a in allA:
            if abs(a[0]-p[0])>1.0 or abs(a[1]-p[1])>1.0: continue
            d=km(a,p)
            if d<best[0]: best=(d,a)
        return best
    segs=[(r[k],r[(k+1)%len(r)]) for r in rings for k in range(len(r))]
    def near_seg(p):
        best=1e9
        for a,b in segs:
            if min(a[0],b[0])-0.15>p[0] or max(a[0],b[0])+0.15<p[0] or min(a[1],b[1])-0.15>p[1] or max(a[1],b[1])+0.15<p[1]: continue
            best=min(best,segd(p,a,b))
        return best
    V_=[]
    for i in keep:
        p=ll[i]; d,a=near_anchor(p)
        kind='shared' if near_seg(p)<=spec.get('share',4.0) else ('coast' if is_coast(i) else 'free')
        V_.append(dict(p=[round(p[0],4),round(p[1],4)],k=kind,a=a))
    n0=len(V_)
    G=spec.get('gap',4)
    for i in range(n0):
        if V_[i]['k']=='shared' and V_[(i+1)%n0]['k']!='shared':
            for g in range(2,G+2):
                if V_[(i+g)%n0]['k']=='shared':
                    for t in range(1,g): V_[(i+t)%n0]['k']='shared'; V_[(i+t)%n0]['a']=V_[(i+t)%n0]['a'] or V_[i]['a']
                    break
    for v in V_:
        if v['k']=='shared' and v['a'] is None: v['k']='free'
    # rotate to start at a free vertex whose neighbours are free
    n=len(V_); start=next((i for i in range(n) if V_[i]['k']=='free' and V_[(i-1)%n]['k']=='free'),None)
    if start is None: start=next(i for i in range(n) if V_[i]['k']=='free')
    V_=V_[start:]+V_[:start]
    ops=[]; i=0
    while i<n:
        k=V_[i]['k']; j=i
        while j+1<n and V_[j+1]['k']==k: j+=1
        if k=='free': ops+= [['free',v['p']] for v in V_[i:j+1]]
        elif k=='shared':
            # candidates: neighbour-ring anchors from the run's start to its end, nearest first at each end
            run_=V_[i:j+1]
            ring=max(rings,key=lambda r: sum(1 for v in run_ if v['a'] in r))
            if not any(v['a'] in ring for v in run_): ops+= [['free',v['p']] for v in run_]
            else:
                near=lambda q: min(range(len(ring)),key=lambda t: km(ring[t],q))
                ia,ib=near(V_[i]['p']),near(V_[j]['p']); L=len(ring)
                fw=(ib-ia)%L; bw=(ia-ib)%L
                st=1 if fw<=bw else -1; m=fw if fw<=bw else bw; E=spec.get('extend',3)
                path=[ring[(ia+st*t)%L] for t in range(-E,m+E+1)]
                ops.append(['shared',path])

        else:
            run_=V_[i:j+1]; ops.append(['coast',run_[0]['p']]); acc=0
            for a_,b_ in zip(run_,run_[1:]):
                acc+=km(a_['p'],b_['p'])
                if acc>spec.get('chunk',250) and b_ is not run_[-1]: ops.append(['coast',b_['p']]); acc=0
            if j>i: ops.append(['coast',run_[-1]['p']])
        i=j+1
    ops.append(['close',V_[0]['p']])
    kinds={k:sum(1 for v in V_ if v['k']==k) for k in ('free','coast','shared')}
    return dict(name=spec['name'],ops=ops,kinds=kinds,n=n)

if __name__=='__main__':
    spec=json.loads(sys.argv[1]); r=run(spec)
    json.dump(r,open(sys.argv[2],'w')); print(r['name'],r['n'],r['kinds'],len(r['ops']),'ops')
    if len(sys.argv)>3:
        # preview: the planned outline, shared runs drawn in full, over the plate
        from PIL import ImageDraw
        fn,lon,lat,P=plate(spec['img'])
        im=Image.open(fn).convert('RGB'); d=ImageDraw.Draw(im)
        pts=[]; cols=[]
        col={'free':(0,0,255),'coast':(0,160,0),'shared':(255,0,0),'close':(0,0,0)}
        for k,v in r['ops']:
            for q in (v if k=='shared' else [v]): pts.append(P(*q)); cols.append(col[k])
        d.line(pts,fill=(0,0,0),width=2)
        for p,c in zip(pts,cols): d.ellipse([p[0]-4,p[1]-4,p[0]+4,p[1]+4],fill=c)
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        im.crop((max(0,min(xs)-60),max(0,min(ys)-60),min(im.width,max(xs)+60),min(im.height,max(ys)+60))).save(sys.argv[3])
