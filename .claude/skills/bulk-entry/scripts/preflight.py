"""Everything a research needs, from its first step to the export, checked before it starts (the dev, 2026-11-23:
"everything must be checked at the start — I would like to launch these at night"). Each check says OK or ÉCHEC with
its remedy, in the journal he follows; the exit code is 1 when one fails. Reads only; writes one probe file on the disk
(removed at once) and the journal.

What a script cannot check is done by the historian after it, by its own tools, and said in the journal the same way:
the MCP « cms » (one read), the Chrome extension, and his logins to the BnF, JSTOR and Gallica (one page each).

  python3 -I preflight.py
"""
import datetime
import json
import os
import pathlib
import re
import shutil
import sqlite3
import subprocess
import urllib.request

REPO = pathlib.Path('/Users/stephanecottereau/Desktop/WebstormProjects/europe-map')
ARCHIVE = pathlib.Path('/Volumes/Acer/atlas-historien')
JOURNAL = ARCHIVE / 'journal' / ('%s.log' % __import__('datetime').date.today().isoformat())
NODE = pathlib.Path('/Users/stephanecottereau/.nvm/versions/node/v24.22.1/bin')
UA = {'User-Agent': 'europe-historical-atlas research (historian preflight)'}
failures = []


def say(message):
    """Print one dated line and append it to the research journal when the disk is there (copied from research_log.py)."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    if JOURNAL.parent.is_dir():
        with JOURNAL.open('a', encoding='utf-8') as out:
            out.write(line + '\n')


def check(name, ok, remedy, detail=''):
    """Say one check's result; a failure is kept with its remedy."""
    if ok:
        say('contrôle OK      — %s%s' % (name, (' (%s)' % detail) if detail else ''))
    else:
        failures.append(name)
        say('contrôle ÉCHEC   — %s%s → %s' % (name, (' (%s)' % detail) if detail else '', remedy))


def http(url):
    """The HTTP status of a GET (0 when unreachable) and a short reason."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
            return r.status, ''
    except urllib.error.HTTPError as error:
        return error.code, str(error.reason)
    except Exception as error:  # unreachable: said as status 0 with its reason
        return 0, str(error)[:80]


say('CONTRÔLES AVANT RECHERCHE — tout ce que les étapes demanderont, de la mise en place à l\'export')

# The disk: mounted, writable, room, its tree.
mounted = ARCHIVE.is_dir()
check('le disque Acer est branché', mounted, 'DISQUE ABSENT : le brancher')
if mounted:
    probe = ARCHIVE / '.preflight-probe'
    try:
        probe.write_text('ok'); probe.unlink(); writable = True
    except OSError:
        writable = False
    check('le disque Acer accepte l\'écriture', writable, 'le disque est en lecture seule : le remonter')
    free = shutil.disk_usage(ARCHIVE).free / 1e9
    check('la place libre sur Acer', free > 5, 'libérer de la place', '%.0f Go' % free)
    for sub in ('ouvrages/index.md', 'bibliotheque.md', 'bibliotheque', 'registre/attempts.jsonl', 'outils/py'):
        check('l\'archive a %s' % sub, (ARCHIVE / sub).exists(), 'l\'archive est incomplète : %s manque' % sub)
    pdfs = len([p for p in (ARCHIVE / 'bibliotheque').glob('*') if p.suffix.lower() in ('.pdf', '.djvu')]) if (ARCHIVE / 'bibliotheque').is_dir() else 0
    check('la bibliothèque de PDF', pdfs > 0, 'la bibliothèque est vide', '%d fichiers' % pdfs)
    libs = subprocess.run([str(ARCHIVE / 'outils/py'), '-c', 'import pypdf, PIL'], capture_output=True, text=True)
    check('les bibliothèques Python du disque (pypdf, pillow)', libs.returncode == 0,
          'les réinstaller : pip install --target outils/python pypdf pillow', libs.stderr.strip()[-80:])

# The tools of the method.
check('qlmanage (rendre une page de PDF en image)', shutil.which('qlmanage') is not None, 'outil macOS manquant')
for script in ('archive.py', 'research_log.py', 'find_book.py', 'follow_links.py', 'count_sheets.py', 'region_gate.py', 'prepare.py'):
    check('le script %s' % script, (REPO / '.claude/skills/bulk-entry/scripts' / script).is_file(), 'le script manque')
agent = REPO / '.claude/agents/source-researcher.md'
text = agent.read_text(encoding='utf-8') if agent.is_file() else ''
check('l\'agent chercheur charge la méthode', 'skills:' in text and 'find-sources' in text,
      'source-researcher.md doit nommer find-sources dans skills:')

# The sources online.
for name, url in (('archive.org (recherche)', 'https://archive.org/advancedsearch.php?q=Danishmend&fl[]=identifier&rows=1&output=json'),
                  ('archive.org (notices)', 'https://archive.org/metadata/cahen.-1968-pre-ottoman-turkey'),
                  ('Wikipédia', 'https://en.wikipedia.org/w/index.php?title=Danishmendids&action=raw'),
                  ('Wikidata', 'https://www.wikidata.org/wiki/Special:EntityData/Q714771.json'),
                  ('Commons', 'https://commons.wikimedia.org/w/api.php?action=query&titles=File:Anatolia_1097.svg&prop=imageinfo&format=json'),
                  ('OpenEdition', 'https://books.openedition.org/'),
                  ('Persée', 'https://www.persee.fr/')):
    status, reason = http(url)
    check(name + ' répond', status == 200,
          'limité par Wikimedia (429) : attendre avant de lancer' if status == 429 else 'site injoignable : vérifier la connexion internet',
          'HTTP %s %s' % (status, reason))

# The base and what writes and exports it.
db = REPO / 'packages/cms/cms.db'
try:
    sheets = sqlite3.connect('file:%s?mode=ro' % db, uri=True).execute('select count(*) from place_periods').fetchone()[0]
    check('la base du CMS se lit', True, '', '%d fiches' % sheets)
except sqlite3.Error as error:
    check('la base du CMS se lit', False, 'cms.db illisible', str(error))
status, reason = http('http://127.0.0.1:3100/api/sources?limit=1')
check('le serveur du CMS répond (port 3100)', status in (200, 401, 403), 'son serveur est arrêté : lui demander de lancer pnpm dev:cms (jamais par moi)',
      'HTTP %s %s' % (status, reason))
pnpm = subprocess.run(['pnpm', '--version'], capture_output=True, text=True,
                      env=dict(os.environ, PATH='%s:%s' % (NODE, os.environ.get('PATH', ''))))
check('Node 24 et pnpm (export, contrôle des villes)', NODE.is_dir() and pnpm.returncode == 0,
      'Node 24 absent de ~/.nvm : nvm install 24', 'pnpm %s' % pnpm.stdout.strip())

# The night: the Mac must not sleep, the disk must not be put to sleep.
assertions = subprocess.run(['pmset', '-g', 'assertions'], capture_output=True).stdout.decode('utf-8', 'replace')
awake = re.search(r'PreventUserIdleSystemSleep\s+1|PreventSystemSleep\s+1', assertions) is not None
check('le Mac ne s\'endormira pas', awake, 'pour la nuit : lancer « caffeinate -dims » (je peux le lancer, avec son accord)')

say('CONTRÔLES : %s' % ('tout est prêt pour les étapes que vérifie un script' if not failures
                        else '%d échec(s) — %s' % (len(failures), ' ; '.join(failures))))
say('reste à vérifier par moi : le MCP « cms » (une lecture), l\'extension Chrome, ses connexions BnF, JSTOR, Gallica')
raise SystemExit(1 if failures else 0)
