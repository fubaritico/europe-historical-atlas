"""The works the Wikipedia pages of a lot cite, the most cited first -> <lot>/cited.json, said in the journal and
recorded as the attempt « wikipedia-bibliography » of the region. Wikipedia is the priming of the research: this list is
what the next channels look for (the PDFs on disk, archive.org, Gallica, the BnF, JSTOR), nothing in it is a witness.
A work is keyed by its author's name and its year when the note gives them (« Cahen 1968 »), else by its first words.
Usage: python3 -I cited_works.py <lot folder> <year> <region>"""
import collections
import datetime
import glob
import json
import os
import re
import subprocess
import sys

G, YEAR, REGION = os.path.abspath(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
count, full, pages = collections.Counter(), {}, 0
for f in sorted(glob.glob(G + '/rend/*.json')):
    r = json.load(open(f))
    if 'cited' not in r:
        continue
    pages += 1
    seen = set()
    for t in r['cited']:
        m = re.match(r"([A-ZÀ-Ý][\w'’.-]+(?: (?:&|and|et|und) [A-ZÀ-Ý][\w'’.-]+)?),? .*?\b(1[5-9]\d\d|20[0-2]\d)\b", t)
        key = '%s %s' % (m.group(1), m.group(2)) if m else ' '.join(t.split()[:6])
        if key not in seen:
            seen.add(key); count[key] += 1
        if len(t) > len(full.get(key, '')):
            full[key] = t
works = [{'work': k, 'pages': n, 'asWritten': full[k]} for k, n in count.most_common()]
json.dump(works, open(G + '/cited.json', 'w'), ensure_ascii=False, indent=1)
row = {'year': YEAR, 'region': REGION, 'kind': 'wikipedia-bibliography', 'degree': 0, 'where': '%d pages Wikipédia du lot %s' % (pages, os.path.basename(G)),
       'words': 'notes et bibliographies des pages', 'result': 'found' if works else 'nothing',
       'note': '%d ouvrages relevés ; les plus cités : %s' % (len(works), ' ; '.join('%s (%d)' % (w['work'], w['pages']) for w in works[:8]))}
subprocess.run(['python3', '-I', HERE + '/log.py', 'attempt', json.dumps(row, ensure_ascii=False)], check=True)
