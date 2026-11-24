"""Lot V: the rendered page through the Wikimedia REST API (page/html), turned into text (paragraphs and list items,
headings as '== x ==', footnote marks dropped) -> rend/<q>.json, same format as fetch.py. Resumes.
Usage: python3 -I fetch_rest.py <lot folder> <list.json> [--test outdir]"""
import html, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
G = os.path.abspath(sys.argv[1])  # the lot folder
UA = {'User-Agent': 'historical-atlas-research/0.1 (non-commercial)'}
OUT = sys.argv[4] if len(sys.argv) > 4 and sys.argv[3] == '--test' else G + '/rend'
os.makedirs(OUT, exist_ok=True)
def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    import datetime
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')
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


def cited(h):
    """The works a page cites — its notes and its bibliography — as the page writes them: the priming of the research.
    Only what names a work is kept: a note or a citation with a year or a page in it; styles and sound notes are dropped."""
    h = re.sub(r'<(style|script|math)\b.*?</\1>', ' ', h, flags=re.S)
    out = []
    for m in re.finditer(r'<cite\b[^>]*class="[^"]*citation[^"]*"[^>]*>(.*?)</cite>|<li\b[^>]*id="cite_note[^"]*"[^>]*>(.*?)</li>', h, flags=re.S):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', m.group(1) or m.group(2) or ''))).strip()
        t = re.sub(r'^(?:[↑^]\s*)?(?:(?:\d+|[a-z])\s+)*', '', t).strip()
        if len(t) >= 15 and re.search(r'\b1[5-9]\d\d\b|\b20[0-2]\d\b|\bpp?\.\s*\d', t) and t not in out:
            out.append(t)
    return out


def one(x):
    fn = OUT + '/' + x['q'] + '.json'
    if os.path.exists(fn): return 'skip'
    title = urllib.parse.unquote(x['url'].rsplit('/wiki/', 1)[1])
    url = x['url'].split('/wiki/', 1)[0] + '/api/rest_v1/page/html/' + urllib.parse.quote(title, safe='')  # the page's own wiki (de, ru…)
    for a in range(6):
        try:
            h = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8')
            json.dump({'q': x['q'], 'title': title.replace('_', ' '), 'url': x['url'], 'text': to_text(h), 'cited': cited(h), 'via': 'rest'},
                      open(fn, 'w'), ensure_ascii=False)
            return 'ok'
        except urllib.error.HTTPError as e:
            time.sleep(15 * (a + 1) if e.code == 429 else 4 * (a + 1))
        except Exception:
            time.sleep(4 * (a + 1))
    return 'FAIL ' + x['q']

say('Wikipédia, amorce seulement : je télécharge %d pages (%s) et je relève les ouvrages que chacune cite.' % (len(cand), os.path.basename(G)))
with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(one, cand))
say('Pages lues : %d nouvelles, %d déjà là, %d en échec.' % (sum(r == 'ok' for r in res), sum(r == 'skip' for r in res), sum(r.startswith('FAIL') for r in res)))
print([r for r in res if r.startswith('FAIL')][:20], flush=True)
