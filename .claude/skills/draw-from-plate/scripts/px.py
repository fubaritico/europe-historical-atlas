"""Print the colour under points of an image (median of a 9x9 patch). usage: px.py <image> x,y [x,y ...]"""
import sys, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
for p in sys.argv[2:]:
    x, y = [int(float(v)) for v in p.split(',')]
    print(p, np.median(im[y - 4:y + 5, x - 4:x + 5].reshape(-1, 3), axis=0))
