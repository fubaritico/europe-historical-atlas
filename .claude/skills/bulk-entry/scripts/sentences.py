"""Lot V: for each candidate page, the sentences carrying a year 600-1105 (indexed), read from the rendered text when it
is downloaded, else from the local wikitext turned into plain text (for the tri only: the quotation is taken later from
the rendered page). Cut into 8 tri lots tri-a..h.json. Usage: python3 -I sentences.py"""
import hashlib
import json
import sys
import os
import re
import urllib.parse

G = os.path.abspath(sys.argv[1])  # the lot folder
YEAR = int(sys.argv[2])  # the map's year


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    import datetime
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')


say('tri : je relève les phrases datées des pages de %s, jusqu\'à %d' % (os.path.basename(G), YEAR + 5))
W = G.rsplit('/', 1)[0] + '/wiki/'
meta = json.load(open(G + '/meta.json'))
cand = {c['q']: c for c in json.load(open(G + '/cand.json'))}
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


def strip_templates(t):
    out, depth, i = [], 0, 0
    while i < len(t):
        if t.startswith('{{', i):
            depth += 1; i += 2; continue
        if t.startswith('}}', i) and depth:
            depth -= 1; i += 2; continue
        if not depth:
            out.append(t[i])
        i += 1
    return ''.join(out)


def plain(w):
    w = re.sub(r'<!--.*?-->', '', w, flags=re.S)
    w = re.sub(r'<ref[^>]*/>', '', w)
    w = re.sub(r'<ref[^>]*>.*?</ref>', '', w, flags=re.S)
    w = strip_templates(w)
    w = re.sub(r'\[\[(?:Datei|File|Bild|Image|Kategorie|Category):[^\]]*\]\]', '', w)
    w = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', w)
    w = re.sub(r'\[\[([^\]]*)\]\]', r'\1', w)
    w = re.sub(r'\[https?://\S+ ([^\]]*)\]', r'\1', w)
    w = re.sub(r"'{2,}", '', w)
    w = re.sub(r'<[^>]+>', '', w)
    w = re.sub(r'^[*#:;]+', '', w, flags=re.M)
    return w


pages = {}
for q in meta:
    fn = G + '/rend/' + q + '.json'
    if os.path.exists(fn):
        r = json.load(open(fn)); txt = r['text'] or ''; title = r['title']; src = 'rendered'
    else:
        url = cand[q]['url']
        raw = open(W + hashlib.md5(url.encode()).hexdigest() + '.txt').read().split('\n', 1)[1]
        txt = plain(raw); title = urllib.parse.unquote(url.rsplit('/wiki/', 1)[1]).replace('_', ' '); src = 'wikitext'
    t = re.sub(r'\[\d+\]|​|­', '', re.sub(r'\s+', ' ', txt))
    t = re.sub(r'==+[^=]+==+', ' | ', t)
    hits = []
    for para in t.split(' | '):
        for s in split(para):
            s = s.strip(' |')
            if len(s) > 420 or len(s) < 25:
                continue
            ys = [int(y) for y in re.findall(r'(?<![\d.])(\d{3,4})(?![\d])', s) if 600 <= int(y) <= YEAR + 5]
            if ys and not re.search(r'v\. ?Chr|vor Christus|Jahrfeier|jähriges|jährigen|Jubiläum', s):
                hits.append({'i': len(hits), 'year': min(ys), 's': s})
    if hits:
        pages[q] = {'q': q, 'name': meta[q]['name'] or title, 'page': title, 'src': src, 'cand': hits[:5]}
keys = sorted(pages, key=lambda q: (cand[q]['land'], q))
for k, L in enumerate('abcdefgh'):
    json.dump([pages[q] for q in keys[k::8]], open(G + '/tri-' + L + '.json', 'w'), ensure_ascii=False, indent=0)
say('tri : %d pages avec une phrase datée sur %d, environ %d par lot → tri-a..h.json' % (len(pages), len(meta), len(pages) // 8))
