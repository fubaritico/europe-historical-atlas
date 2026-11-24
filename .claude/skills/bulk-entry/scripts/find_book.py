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
JOURNAL = pathlib.Path('/Volumes/Acer/atlas-historien/journal.log')
AGENT = {'User-Agent': 'historical-atlas-research/0.1 (non-commercial)'}


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


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


if len(sys.argv) == 3 and sys.argv[1] == 'search':
    words = sys.argv[2]
    say('archive.org : je cherche « %s »' % words)
    query = urllib.parse.urlencode([('q', '(%s) AND mediatype:texts' % words), ('fl[]', 'identifier'),
                                    ('fl[]', 'title'), ('fl[]', 'creator'), ('fl[]', 'year'),
                                    ('fl[]', 'access-restricted-item'), ('rows', '15'), ('output', 'json')])
    found = json.loads(fetch('https://archive.org/advancedsearch.php?' + query))['response']['docs']
    if not found:
        say('archive.org : rien pour « %s »' % words)
    for item in found:
        print('  %s | %s | %s | %s | %s' % (item.get('identifier'), str(item.get('title'))[:70],
                                            str(item.get('creator'))[:40], item.get('year'),
                                            'prêt seulement' if item.get('access-restricted-item') else 'libre'))
    say('archive.org : %d résultats pour « %s »' % (len(found), words))
elif len(sys.argv) == 4 and sys.argv[1] == 'get':
    identifier, folder = sys.argv[2], pathlib.Path(sys.argv[3])
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
