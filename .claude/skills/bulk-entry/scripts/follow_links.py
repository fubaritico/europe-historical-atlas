"""Follow the links of a Wikipedia page as a reader does (the dev, 2026-11-23: "hyperlinks are the index of an
encyclopaedia"). For one page it saves its raw text, then:
  - every map and image it shows: the Commons file page read (author, source, licence, description) and the image saved
    as a PNG (an SVG comes back rendered by Commons), to be looked at — a map is a witness only through the source it names;
  - every link of the page (the index), with how often it is cited, and the « See also » section apart;
  - the works it cites ({{cite book}}, {{sfn}}).
Writes <out>/<lang>-<title>/ : page.txt, maps.md (+ the images), links.md. Says each step in the research journal.

  python3 -I follow_links.py <out folder> <lang> "<Page title>"

The agent then reads maps.md and looks at each image, and chooses in links.md the actors, places, battles and
« See also » to follow — one to two degrees, each page given to this script in turn.
"""
import datetime
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

UA = {'User-Agent': 'europe-historical-atlas research (historian; contact via github.com/fubaritico)'}
JOURNAL = pathlib.Path(('/Volumes/Acer/atlas-historien/journal/%s.log' % __import__('datetime').date.today().isoformat()))


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def get(url, binary=False):
    """Fetch a URL politely, retrying once on 429; returns text (or bytes), or None when refused."""
    for wait in (0, 5, 15):
        time.sleep(wait or 1.5)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                body = r.read()
                return body if binary else body.decode('utf-8', 'replace')
        except Exception as error:  # a refusal is said and the next attempt waits longer
            last = error
    say('follow_links : refusé (%s) : %s' % (last, url))
    return None


def strip(markup):
    """A wikitext fragment reduced to its readable words."""
    markup = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', markup)
    return re.sub(r"<[^>]+>|'{2,}|\{\{[^}]*\}\}", '', markup).strip()


if len(sys.argv) != 4:
    sys.exit(__doc__)
OUT, LANG, TITLE = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
folder = OUT / ('%s-%s' % (LANG, re.sub(r'[^\w.-]+', '_', TITLE)))
folder.mkdir(parents=True, exist_ok=True)
say('follow_links : je lis « %s » (%s) et je suis ses liens et ses cartes' % (TITLE, LANG))
raw = get('https://%s.wikipedia.org/w/index.php?title=%s&action=raw' % (LANG, urllib.parse.quote(TITLE.replace(' ', '_'))))
if raw is None:
    sys.exit(1)
(folder / 'page.txt').write_text(raw, encoding='utf-8')

# The maps and images: every [[File:…]], every image= / map= parameter of a template.
files = re.findall(r'\[\[\s*(?:File|Image|Fichier|Datei|Dosya|Archivo)\s*:\s*([^|\]]+)', raw, re.I)
files += re.findall(r'\|\s*(?:image|image_map|map|map_image|carte|karte)\d*\s*=\s*([^|\n}]+\.(?:svg|png|jpe?g|gif))', raw, re.I)
files = list(dict.fromkeys(f.strip() for f in files if f.strip()))
lines = ['# Les cartes et images de « %s » (%s)' % (TITLE, LANG), '',
         'Each one looked at, its names read; a witness only through the source it names.', '']
for name in files:
    api = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata'
           '&iiurlwidth=1920&titles=' + urllib.parse.quote('File:' + name))  # a standard size: others are refused (429)
    text = get(api)
    if text is None:
        lines.append('- %s — Commons refused' % name)
        continue
    pages = json.loads(text, strict=False)['query']['pages']
    info = next(iter(pages.values())).get('imageinfo', [{}])[0]
    meta = info.get('extmetadata', {})
    field = lambda key: re.sub(r'<[^>]+>', '', meta.get(key, {}).get('value', '')).strip()[:500]
    saved = ''
    # The thumbnail first; when the original is smaller than the width asked, Commons answers an "unscaled" address
    # it rate-limits — then the original itself.
    for image in dict.fromkeys(u for u in (info.get('thumburl'), info.get('url')) if u):
        body = get(image, binary=True)
        if body:
            ext = urllib.parse.urlparse(image).path.rsplit('.', 1)[-1].lower()
            saved = re.sub(r'[^\w.-]+', '_', name.rsplit('.', 1)[0]) + '.' + ('png' if ext == 'svg' else ext)
            (folder / saved).write_bytes(body)
            break
    lines += ['## %s' % name, '', '- image: `%s`' % (saved or 'not saved'), '- author: %s' % field('Artist'),
              '- licence: %s' % field('LicenseShortName'), '- date: %s' % field('DateTimeOriginal'),
              '- description: %s' % field('ImageDescription'), '- source / credit: %s' % field('Credit'), '']
(folder / 'maps.md').write_text('\n'.join(lines), encoding='utf-8')

# The index: every link of the article namespace, with its count; « See also » apart; the works cited.
links = [l.split('|')[0].split('#')[0].strip() for l in re.findall(r'\[\[([^\]]+)\]\]', raw)]
links = [l for l in links if l and ':' not in l]
count = {}
for l in links:
    count[l] = count.get(l, 0) + 1
see = re.search(r'==\s*(?:See also|Voir aussi|Siehe auch|Ayrıca bakınız)\s*==(.*?)(?:\n==[^=]|\Z)', raw, re.S | re.I)
seealso = [l.split('|')[0].strip() for l in re.findall(r'\[\[([^\]]+)\]\]', see.group(1))] if see else []
cites = []
for c in re.findall(r'\{\{\s*[Cc]ite (?:book|journal|encyclopedia)(.*?)\}\}', raw, re.S):
    f = dict((k.strip().lower(), v.strip()) for k, v in re.findall(r'\|\s*([\w-]+)\s*=\s*([^|]*)', c))
    cites.append('%s (%s), %s — %s' % (f.get('last') or f.get('last1') or f.get('author') or '?',
                                       f.get('year') or f.get('date') or '?', strip(f.get('title', '?')), f.get('publisher', '')))
out = ['# L\'index de « %s » (%s) — %d liens' % (TITLE, LANG, len(count)), '', '## See also', '']
out += ['- %s' % l for l in seealso] or ['(none)']
out += ['', '## Every link, most cited first', '']
out += ['- %s (%d)' % (l, n) for l, n in sorted(count.items(), key=lambda kv: (-kv[1], kv[0]))]
out += ['', '## Works cited', ''] + ['- %s' % c for c in dict.fromkeys(cites)]
(folder / 'links.md').write_text('\n'.join(out), encoding='utf-8')
say('follow_links : « %s » — %d cartes et images, %d liens, %d « voir aussi », %d ouvrages cités → %s'
    % (TITLE, len(files), len(count), len(seealso), len(cites), folder))
