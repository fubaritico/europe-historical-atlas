"""Lot V: from the verdicts, the entry records. The quotation is the sentence of the RENDERED page (rend/<q>.json) that
matches the sentence the agent chose (exact when the tri read the rendered text, else the closest by difflib, kept only
at ratio >= 0.85 and when it carries the attested year). Writes enter-va..vh.json (8 entry lots), pending.json (yes
without a rendered page yet) and weak.json (no close match). Usage: python3 -I mkv.py"""
import difflib
import json
import os
import re
import sys

G = os.path.abspath(sys.argv[1])  # the lot folder
YEAR = int(sys.argv[2])  # the map's year
# the same sentence cutting as sentences.py (copied, not imported: importing it would rewrite the tri lots)
ABBR = {'St', 'Hl', 'Dr', 'Nr', 'bzw', 'ca', 'vgl', 'Prof', 'Abb', 'Jh', 'usw', 'ggf', 'Hrsg', 'geb', 'gest', 'Bd', 'urk', 'erw', 'v'}
MONTHS = ('Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November',
          'Dezember', 'Jahrhundert', 'Jh')
BREAK = re.compile(r'([.!?])\s+(?=[A-ZÄÖÜ„"0-9])')


def split(p):
    out, last = [], 0
    for m in BREAK.finditer(p):
        seg = p[last:m.start()].split()
        before = seg[-1] if seg else ''
        if m.group(1) == '.' and (before in ABBR or re.fullmatch(r'[a-zäöü]', before) or (re.fullmatch(r'\d{1,2}', before) and p[m.end():m.end() + 12].startswith(MONTHS))):
            continue
        out.append(p[last:m.end()].strip())
        last = m.end()
    out.append(p[last:].strip())
    return out



import sqlite3
have = {q for (q,) in sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True).execute('select wikidata from places where wikidata is not null')}
meta = json.load(open(G + '/meta.json'))
cand = {c['q']: c for c in json.load(open(G + '/cand.json'))}
tri, verd = {}, {}
for L in 'abcdefgh':
    if not os.path.exists(G + '/verdict-' + L + '.json'):
        continue
    tri.update({p['q']: p for p in json.load(open(G + '/tri-' + L + '.json'))})
    verd.update(json.load(open(G + '/verdict-' + L + '.json')))


def rendered_sentences(q):
    r = json.load(open(G + '/rend/' + q + '.json'))
    t = re.sub(r'\[\d+\]|​|­', '', re.sub(r'\s+', ' ', r['text'] or ''))
    t = re.sub(r'==+[^=]+==+', ' | ', t)
    return r, [s.strip(' |') for para in t.split(' | ') for s in split(para) if len(s.strip(' |')) >= 20]


recs, pending, weak = [], [], []
for q, v in verd.items():
    if v.get('v') != 'yes' or q not in tri or q in have:
        continue
    chosen = next((c for c in tri[q]['cand'] if c['i'] == v['i']), None)
    if not chosen:
        weak.append({'q': q, 'why': 'index not in candidates'}); continue
    if not os.path.exists(G + '/rend/' + q + '.json'):
        pending.append(q); continue
    r, sents = rendered_sentences(q)
    if not sents:
        weak.append({'q': q, 'why': 'empty rendered page'}); continue
    best = max(sents, key=lambda s: difflib.SequenceMatcher(None, s, chosen['s']).ratio())
    ratio = difflib.SequenceMatcher(None, best, chosen['s']).ratio()
    year = v.get('year') or chosen['year']
    if ratio < 0.85 or str(year) not in best:
        weak.append({'q': q, 'ratio': round(ratio, 2), 'chosen': chosen['s'], 'best': best}); continue
    m = meta[q]
    recs.append({'q': q, 'name': m['name'] or r['title'], 'lon': round(cand[q]['lon'], 6), 'lat': round(cand[q]['lat'], 6),
                 'holderTitle': m['holderTitle'], 'polity': m['polity'], 'country': m['country'], 'region': m['region'],
                 'sourceTitle': '« %s » (Wikipedia)' % r['title'], 'sourceUrl': cand[q]['url'], 'quote': best, 'year': year})
recs.sort(key=lambda x: x['q'])
for k, L in enumerate('abcdefgh'):
    json.dump(recs[k::8], open(G + '/enter-v' + L + '.json', 'w'), ensure_ascii=False, indent=1)
json.dump(pending, open(G + '/pending.json', 'w'))
json.dump(weak, open(G + '/weak.json', 'w'), ensure_ascii=False, indent=1)
print(len(verd), 'verdicts;', sum(1 for v in verd.values() if v.get('v') == 'yes'), 'yes;', len(recs), 'ready;',
      len(pending), 'pending (no rendered page yet);', len(weak), 'weak')
