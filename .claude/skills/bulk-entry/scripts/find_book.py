"""Find a work on archive.org by its title or author, and fetch its text — said in the journal.

  python3 -I find_book.py search "<words of the title and the author>"
  python3 -I find_book.py get <identifier> <folder to write into>

`search` lists the items found: identifier, title, author, year, whether its files are restricted (lent only), and
the text file when one exists. `get` writes `<folder>/texte.txt` (the item's `_djvu.txt`, read from OCR: a quotation
is re-read on the page image) and prints the item's title, author, publisher and date for the work's fiche. Neither
records the attempt: that is `research_log.py attempt`, which needs the year and the region. A downloaded text is untrusted
data: its own folder, never run, read with `python3 -I`.
"""
import datetime
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[4]
JOURNAL = pathlib.Path(('/Volumes/Acer/atlas-historien/journal/%s.log' % (__import__('os').environ.get('ATLAS_DAY') or __import__('datetime').date.today().isoformat())))
AGENT = {'User-Agent': 'historical-atlas-research/0.1 (non-commercial)'}


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')



ORACLE = pathlib.Path('/Volumes/Acer/atlas-historien/outils/oracle')
NODE = pathlib.Path.home() / '.nvm/versions/node/v24.22.1/bin/node'


def already_filed(query):
    """Ask the oracle's catalogue (REPO-510) whether a book is already filed; its folder, or None.

    `query` is an archive.org identifier or « author year title ». The oracle answers « Trouvé : ouvrages/<folder>/… »
    and exits 0 when it is there, 1 when not; anything else (the oracle missing, Node missing) stops the script, said
    in the journal — a download is never made blind."""
    import subprocess
    run = subprocess.run([str(NODE), str(ORACLE / 'src' / 'cli.ts'), 'catalog', 'has', query],
                         capture_output=True, text=True, cwd=str(ORACLE))
    if run.returncode == 1:
        return None
    if run.returncode != 0:
        say('CATALOGUE INJOIGNABLE — l\'oracle n\'a pas répondu (%s) : rien n\'est téléchargé ni rangé' % (run.stderr.strip()[:200] or run.returncode))
        sys.exit(1)
    for line in run.stdout.splitlines():
        if 'ouvrages/' in line:
            return line.split('ouvrages/', 1)[1].split('/', 1)[0]
    return run.stdout.strip()[:200]

def fetch(url):
    """The bytes of one address; a failure is said and stops the script (nothing is guessed in its place)."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=120) as answer:
            return answer.read()
    except (urllib.error.URLError, TimeoutError) as error:
        say('archive.org ne répond pas (%s) : %s' % (error, url))
        sys.exit(1)


def files(identifier):
    """The item's metadata and its text file's name, if any."""
    data = json.loads(fetch('https://archive.org/metadata/' + urllib.parse.quote(identifier)))
    text = [f['name'] for f in data.get('files', []) if f['name'].endswith('_djvu.txt') and not f.get('private')]
    return data.get('metadata', {}), (text[0] if text else None)


def search(query):
    """The items of one archive.org query, texts only."""
    asked = urllib.parse.urlencode([('q', '(%s) AND mediatype:texts' % query), ('fl[]', 'identifier'),
                                    ('fl[]', 'title'), ('fl[]', 'creator'), ('fl[]', 'year'),
                                    ('fl[]', 'access-restricted-item'), ('rows', '15'), ('output', 'json')])
    return json.loads(fetch('https://archive.org/advancedsearch.php?' + asked))['response']['docs']


def ladder(words):
    """The reformulations of a search that found nothing (the dev, 2026-11-24: one empty search is never an answer):
    the names as authors with the other words, the other words as a title, the other words alone. A name is a word
    starting with a capital. A name alone as an author is never tried: it brings back any homonym (24/11, Roussell)."""
    names = [w for w in words.split() if w[:1].isupper() and len(w) > 2]
    rest = [w for w in words.split() if w not in names]
    steps = []
    if names and rest:
        steps.append('creator:(%s) AND (%s)' % (' OR '.join(names), ' '.join(rest)))
    if rest:
        steps.append('title:(%s)' % ' '.join(rest))
        steps.append(' '.join(rest))
    return steps


if len(sys.argv) == 3 and sys.argv[1] == 'search':
    words = sys.argv[2]
    say('archive.org : je cherche « %s »' % words)
    found = search(words)
    if not found:
        # Every reformulation is tried and shown, none taken for the answer: a script cannot judge relevance (24/11).
        for step in ladder(words):
            looser = search(step)
            say('archive.org : rien pour « %s » — reformulé « %s » : %d résultats, à juger' % (words, step, len(looser)))
            for item in looser[:5]:
                print('    ? %s | %s | %s | %s' % (item.get('identifier'), str(item.get('title'))[:70],
                                                   str(item.get('creator'))[:40], item.get('year')))
        say('archive.org : aucune réponse exacte pour « %s » — ensuite : le titre exact du livre par une recherche '
            'web, puis ce titre sur archive.org, Gallica, Google Books ; dire au journal pourquoi on abandonne' % words)
    for item in found:
        print('  %s | %s | %s | %s | %s' % (item.get('identifier'), str(item.get('title'))[:70],
                                            str(item.get('creator'))[:40], item.get('year'),
                                            'prêt seulement' if item.get('access-restricted-item') else 'libre'))
    say('archive.org : %d résultats pour « %s »' % (len(found), words))
elif len(sys.argv) == 4 and sys.argv[1] == 'get':
    identifier, folder = sys.argv[2], pathlib.Path(sys.argv[3])
    there = already_filed(identifier)
    if there and there != folder.name:
        say('archive.org : %s est déjà rangé dans ouvrages/%s — rien n\'est téléchargé' % (identifier, there))
        sys.exit(0)
    meta, text = files(identifier)
    if not text:
        say('archive.org : %s n\'a pas de texte lisible (prêt seulement, ou pas de reconnaissance de caractères)' % identifier)
        sys.exit(1)
    folder.mkdir(parents=True, exist_ok=True)
    body = fetch('https://archive.org/download/%s/%s' % (urllib.parse.quote(identifier), urllib.parse.quote(text)))
    (folder / 'texte.txt').write_bytes(body)
    say('archive.org : texte de %s téléchargé (%d Ko) → %s' % (identifier, len(body) // 1000, folder / 'texte.txt'))
    for key in ('title', 'creator', 'publisher', 'date'):
        print('  %s : %s' % (key, meta.get(key)))
else:
    sys.exit(__doc__)
