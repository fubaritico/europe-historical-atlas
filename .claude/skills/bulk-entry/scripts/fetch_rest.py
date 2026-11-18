"""Lot V: the rendered page through the Wikimedia REST API (page/html), turned into text (paragraphs and list items,
headings as '== x ==', footnote marks dropped) -> rend/<q>.json, same format as fetch.py. Resumes.
Usage: python3 -I fetch_rest.py <lot folder> <list.json> [--test outdir]"""
import html, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
G = os.path.abspath(sys.argv[1])  # the lot folder
UA = {'User-Agent': 'historical-atlas-research/0.1 (non-commercial)'}
OUT = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == '--test' else G + '/rend'
os.makedirs(OUT, exist_ok=True)
only = set(json.load(open(sys.argv[2])))
cand = [c for c in json.load(open(G + '/cand.json')) if c['q'] in only]

def to_text(h):
    h = re.sub(r'<(style|script|figure|math)\b.*?</\1>', ' ', h, flags=re.S)
    h = re.sub(r'<sup\b[^>]*>.*?</sup>', '', h, flags=re.S)
    while re.search(r'<table\b', h):
        n = re.sub(r'<table\b(?:(?!<table\b).)*?</table>', ' ', h, flags=re.S)
        if n == h: break
        h = n
    out = []
    for m in re.finditer(r'<(p|li|h2|h3|h4)\b[^>]*>(.*?)</\1>', h, flags=re.S):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(2)))).strip()
        if t: out.append(('== %s ==' % t) if m.group(1).startswith('h') else t)
    return '\n'.join(out)


def one(x):
    fn = OUT + '/' + x['q'] + '.json'
    if os.path.exists(fn): return 'skip'
    title = urllib.parse.unquote(x['url'].rsplit('/wiki/', 1)[1])
    url = 'https://de.wikipedia.org/api/rest_v1/page/html/' + urllib.parse.quote(title, safe='')
    for a in range(6):
        try:
            h = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8')
            json.dump({'q': x['q'], 'title': title.replace('_', ' '), 'url': x['url'], 'text': to_text(h), 'via': 'rest'},
                      open(fn, 'w'), ensure_ascii=False)
            return 'ok'
        except urllib.error.HTTPError as e:
            time.sleep(15 * (a + 1) if e.code == 429 else 4 * (a + 1))
        except Exception:
            time.sleep(4 * (a + 1))
    return 'FAIL ' + x['q']

with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(one, cand))
print('done', sum(r == 'ok' for r in res), 'new;', [r for r in res if r.startswith('FAIL')][:20], flush=True)
