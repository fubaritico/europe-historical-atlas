"""One-time backfill (18/11): from every page already downloaded under files/resources/historien/, keep the dated
sentences about the places that are in the base, into historien/extraits/<q>.json, and rebuild
historien/registre/reads.jsonl from extraits/ (never from the pages on disk, which the clean-up deletes). The rendered text is preferred; local wikitext is turned into plain text and flagged
'wikitext' (good for finding, not for quoting). Usage: python3 -I extract_backfill.py [--limit N] [--dry]"""
import hashlib
import json
import os
import re
import sqlite3
import sys

ROOT = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map'
H = ROOT + '/files/resources/historien'
LIMIT = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
DRY = '--dry' in sys.argv
db = sqlite3.connect('file:' + ROOT + '/packages/cms/cms.db?mode=ro', uri=True)
in_base = {q for (q,) in db.execute('select wikidata from places where wikidata is not null')}

ABBR = {'St', 'Hl', 'Dr', 'Nr', 'bzw', 'ca', 'vgl', 'Prof', 'Abb', 'Jh', 'usw', 'ggf', 'Hrsg', 'geb', 'gest', 'Bd', 'urk', 'erw',
        'Mr', 'Mrs', 'St.', 'S', 'p', 'pp', 'cf', 'vol', 'No', 'Mt', 'Ste'}
MONTHS = ('Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November',
          'Dezember', 'Jahrhundert', 'Jh', 'janvier', 'siècle')
BREAK = re.compile(r'([.!?])\s+(?=[A-ZÄÖÜÉÈÀÂÎÔÛÇÁÍÓÚÑ„"«0-9])')
YEAR = re.compile(r'(?<![\d.,])(\d{3,4})(?![\d,])')


def split(p):
    out, last = [], 0
    for m in BREAK.finditer(p):
        seg = p[last:m.start()].split()
        before = seg[-1] if seg else ''
        if m.group(1) == '.' and (before in ABBR or re.fullmatch(r'[a-zäöüéè]', before)
                                  or (re.fullmatch(r'\d{1,2}', before) and p[m.end():m.end() + 12].startswith(MONTHS))):
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
    w = re.sub(r'\[\[(?:Datei|File|Bild|Image|Fichier|Archivo|Kategorie|Category|Catégorie):[^\]]*\]\]', '', w)
    w = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', w)
    w = re.sub(r'\[\[([^\]]*)\]\]', r'\1', w)
    w = re.sub(r'\[https?://\S+ ([^\]]*)\]', r'\1', w)
    w = re.sub(r"'{2,}", '', w)
    w = re.sub(r'<[^>]+>', '', w)
    w = re.sub(r'&nbsp;', ' ', w)
    return re.sub(r'^[*#:;|!{}].*$', '', w, flags=re.M)


def dated(text):
    t = re.sub(r'\[\d+\]|​|­', '', re.sub(r'\s+', ' ', text))
    t = re.sub(r'==+[^=]+==+', ' | ', t)
    out = []
    for para in t.split(' | '):
        for s in split(para):
            s = s.strip(' |')
            if not 25 <= len(s) <= 500:
                continue
            ys = sorted({int(y) for y in YEAR.findall(s) if 400 <= int(y) <= 1900})
            if ys and len(ys) <= 6:
                out.append({'years': ys, 's': s})
    return out


# url -> q, from every JSON list or dict of records carrying both
index = {}


def walk(o, depth=0):
    if depth > 4:
        return
    if isinstance(o, dict):
        q, url = o.get('q') or o.get('wd', {}).get('q') if isinstance(o.get('wd'), dict) else o.get('q'), o.get('url')
        if isinstance(q, str) and q.startswith('Q') and isinstance(url, str) and 'wikipedia.org/wiki/' in url:
            index.setdefault(url, q)
        for v in o.values():
            if isinstance(v, (dict, list)):
                walk(v, depth + 1)
    elif isinstance(o, list):
        for v in o:
            walk(v, depth + 1)


for root, dirs, files in os.walk(H):
    dirs[:] = [d for d in dirs if d not in ('wiki', 'rend', 'venv', 'texts', 'sources', 'extraits', 'registre')]
    for f in files:
        p = os.path.join(root, f)
        if f.endswith('.json') and os.path.getsize(p) < 150e6:
            try:
                walk(json.load(open(p)))
            except Exception:
                pass
print('url index:', len(index), flush=True)

pages = {}  # q -> (src, url, text)
for root, dirs, files in os.walk(H):
    dirs[:] = [d for d in dirs if d not in ('venv', 'extraits', 'registre')]
    base = os.path.basename(root)
    for f in files:
        p = os.path.join(root, f)
        if base == 'rend' and f.endswith('.json'):
            r = json.load(open(p)); q = r.get('q') or f[:-5]
            if q in in_base:
                pages[q] = ('rendered', r.get('url'), r.get('text') or '')
        elif base == 'wiki' and f.endswith('.txt'):
            with open(p, errors='replace') as fh:
                url = fh.readline().strip(); q = index.get(url)
                if q in in_base and (q not in pages or pages[q][0] == 'wikitext'):
                    pages[q] = ('wikitext', url, fh.read())
print('pages for places in the base:', len(pages), flush=True)

n = size = 0
reads = []
for q, (src, url, text) in sorted(pages.items()):
    if LIMIT and n >= LIMIT:
        break
    sents = dated(text if src == 'rendered' else plain(text))
    if not sents:
        continue
    rec = {'q': q, 'url': url, 'src': src, 'read': '2026-11 (backfill 18/11)', 'sentences': sents}
    blob = json.dumps(rec, ensure_ascii=False)
    size += len(blob.encode()); n += 1
    reads.append({'url': url, 'q': q, 'year_asked': 1100, 'read': '2026-11 (backfill 18/11)', 'src': src})
    if not DRY:
        open(H + '/extraits/' + q + '.json', 'w').write(blob)
if not DRY:
    # the register is rebuilt from extraits/, which keeps every page ever read (pages on disk are deleted at clean-up)
    import glob
    with open(H + '/registre/reads.jsonl', 'w') as fh:
        for f in sorted(glob.glob(H + '/extraits/*.json')):
            e = json.load(open(f))
            fh.write(json.dumps({'url': e.get('url'), 'q': e.get('q'), 'read': e.get('read'), 'src': e.get('src')}, ensure_ascii=False) + '\n')
print(n, 'places with dated sentences;', round(size / 1e6, 1), 'MB', '(dry run)' if DRY else '')
