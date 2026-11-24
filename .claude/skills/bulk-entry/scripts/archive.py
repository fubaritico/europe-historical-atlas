"""File a research in the archive on the external disk (`/find-sources`, « The archive »): what can serve again at
the root, what belongs to a year and a zone under that year. Every command checks the disk first and says what it
did in the journal. It never deletes and never overwrites a file it did not write itself.

  python3 -I archive.py check
  python3 -I archive.py open <year> <zone> "<what was asked>"
  python3 -I archive.py work <folder> <text file or -> "<author>" "<title>" "<publisher>" "<year>" "<kind>" "<where found>" "<what it covers>"
  python3 -I archive.py read <year> <zone> <folder> "<pages>" "<question>" "<result>"
  python3 -I archive.py given <year> <zone> <file> "<name>"
  python3 -I archive.py close <year> <zone>

check — the disk is mounted, or DISQUE ABSENT and exit 1.
open  — creates <year>/<zone>/ with donne/, recherches/, resultats/, travail/ and its fiche.md. travail/ is
        where the research downloads and works (pages, lots, copies); it is emptied at the end, on his word.
work  — creates ouvrages/<folder>/ (fiche.md, texte.txt copied — or `-` when the text is already there, fetched
        straight into it by find_book.py) and its line in ouvrages/index.md; an existing work is left as it is.
        <folder> is <author>-<year>-<short-title>, lowercase, no accents.
read  — one line in <year>/<zone>/recherches/lectures.md, and the research in the work's fiche.md.
given — copies what the dev gave to donne/, numbered after the last one (his original stays where it is).
The zone's note is written straight in <year>/<zone>/resultats/note-de-region.md: the archive is its only home.
close — writes recherches/essais.md from the archive's attempts (their region is the zone) and recherches/journal.log
        from the research's start in the archive's journal;
        says the files of the zone, those left empty, and what travail/ still holds (to empty on his word).
"""
import datetime
import json
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
# the disk the dev lends; ARCHIVE_HISTORIEN points elsewhere only to try the script on a copy
ARCHIVE = pathlib.Path(os.environ.get('ARCHIVE_HISTORIEN', '/Volumes/Acer/atlas-historien'))
JOURNAL = ARCHIVE / 'journal.log'
TODAY = datetime.date.today().strftime('%d/%m/%Y')


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def check():
    """Stop at once when the disk is not mounted."""
    if not ARCHIVE.is_dir():
        say('DISQUE ABSENT — %s introuvable : branche le disque Acer, la recherche reprend ensuite.' % ARCHIVE)
        sys.exit(1)


def clean(folder):
    """Remove the AppleDouble files macOS leaves on an exFAT disk (best effort: what fails is only noise)."""
    subprocess.run(['dot_clean', '-m', str(folder)], capture_output=True)


def append(path, header, line):
    """Add one line to a table file, writing its header first when the file is new."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(header, encoding='utf-8')
    with path.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


def zone_dir(year, zone):
    """The research's folder; it must have been opened."""
    path = ARCHIVE / year / zone
    if not path.is_dir():
        say('la recherche %s/%s n\'est pas ouverte dans l\'archive : lancer « archive.py open » d\'abord' % (year, zone))
        sys.exit(1)
    return path


args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
check()
command = args[0]

if command == 'check' and len(args) == 1:
    say('archive : le disque est branché (%s)' % ARCHIVE)

elif command == 'open' and len(args) == 4:
    year, zone, asked = args[1:]
    path = ARCHIVE / year / zone
    for sub in ('donne', 'recherches', 'resultats', 'travail'):
        (path / sub).mkdir(parents=True, exist_ok=True)
    fiche = path / 'fiche.md'
    block = '\n## La recherche du %s\n\n**Demandée** : %s\n\n**Où elle en est** : ouverte.\n' % (TODAY, asked)
    if fiche.exists():
        fiche.write_text(fiche.read_text(encoding='utf-8').rstrip() + '\n' + block, encoding='utf-8')
    else:
        fiche.write_text('# %s, %s — la recherche\n%s' % (year, zone, block), encoding='utf-8')
    say('archive : recherche %s/%s ouverte' % (year, zone))

elif command == 'work' and len(args) == 10:
    folder, text, author, title, publisher, year, kind, where, covers = args[1:]
    path = ARCHIVE / 'ouvrages' / folder
    if (path / 'fiche.md').exists():
        say('archive : l\'ouvrage %s est déjà rangé, laissé tel quel' % folder)
        sys.exit(0)
    path.mkdir(parents=True, exist_ok=True)
    if text != '-':
        shutil.copyfile(text, path / 'texte.txt')
    (path / 'fiche.md').write_text("""# %s — %s

| | |
| --- | --- |
| auteur | %s |
| titre | *%s* |
| éditeur, année | %s, %s |
| sorte | %s |
| trouvé | %s, le %s |
| dans ce dossier | %s |
| ce qu'il couvre | %s |

## Ce qui en a été lu

| recherche | date | pages | pour quoi |
| --- | --- | --- | --- |
""" % (author, title, author, title, publisher, year, kind, where, TODAY,
       '`texte.txt` — le texte entier' if (path / 'texte.txt').exists() else 'rien encore (pas de texte téléchargé)',
       covers),
        encoding='utf-8')
    append(ARCHIVE / 'ouvrages/index.md',
           '# Les ouvrages de l\'archive\n\n| dossier | auteur | titre | éditeur, année | ce qu\'il couvre | recherches où il a servi |\n| --- | --- | --- | --- | --- | --- |\n',
           '| `%s` | %s | *%s* | %s, %s | %s | voir sa fiche |' % (folder, author, title, publisher, year, covers))
    clean(path)
    say('archive : ouvrage %s rangé' % folder)

elif command == 'read' and len(args) == 7:
    year, zone, folder, pages, question, result = args[1:]
    path = zone_dir(year, zone)
    work = ARCHIVE / 'ouvrages' / folder / 'fiche.md'
    if not work.exists():
        say('archive : l\'ouvrage %s n\'est pas rangé : lancer « archive.py work » d\'abord' % folder)
        sys.exit(1)
    append(path / 'recherches/lectures.md',
           '# %s, %s — ce qui a été lu\n\n| date | ouvrage (son dossier dans `ouvrages/`) | pages lues | question | résultat |\n| --- | --- | --- | --- | --- |\n' % (year, zone),
           '| %s | `%s` | %s | %s | %s |' % (TODAY, folder, pages, question, result))
    with work.open('a', encoding='utf-8') as out:
        out.write('| `%s/%s` | %s | %s | %s |\n' % (year, zone, TODAY, pages, question))
    say('archive : lecture de %s rangée dans %s/%s' % (folder, year, zone))

elif command == 'given' and len(args) == 5:
    year, zone, source, name = args[1:]
    path = zone_dir(year, zone) / 'donne'
    number = 1 + max([int(p.name[:2]) for p in path.iterdir() if p.name[:2].isdigit()] or [0])
    target = path / ('%02d-%s%s' % (number, name, pathlib.Path(source).suffix))
    shutil.copyfile(source, target)
    clean(path)
    say('archive : ce qu\'il a donné est rangé → %s' % target.relative_to(ARCHIVE))

elif command == 'close' and len(args) == 3:
    year, zone = args[1:]
    region = zone  # the attempts carry the zone as their region since 2026-11-23
    journal, attempts = JOURNAL, ARCHIVE / 'registre/attempts.jsonl'
    path = zone_dir(year, zone)
    for needed in (journal, attempts):
        if not needed.exists():
            say('archive : %s introuvable — la recherche %s/%s n\'est pas fermée' % (needed, year, zone))
            sys.exit(1)
    rows = ['# %s, %s — où l\'on a cherché' % (year, zone), '',
            '| date | canal | où | mots cherchés | résultat | remarque |', '| --- | --- | --- | --- | --- | --- |']
    for line in pathlib.Path(attempts).read_text(encoding='utf-8').splitlines():
        if line.strip():
            row = json.loads(line)
            if row.get('region') == region and str(row.get('year')) == year:
                rows.append('| %s | %s | %s | %s | %s | %s |' % tuple(
                    str(row.get(k) or '').replace('|', '/') for k in ('date', 'kind', 'where', 'words', 'result', 'note')))
    (path / 'recherches/essais.md').write_text('\n'.join(rows) + '\n', encoding='utf-8')
    lines = pathlib.Path(journal).read_text(encoding='utf-8').splitlines()
    starts = [i for i, l in enumerate(lines) if 'RECHERCHE DEMANDÉE' in l
              and (region.lower() in l.lower() or zone.lower() in l.lower())]
    kept = lines[starts[-1]:] if starts else []
    if kept:
        (path / 'recherches/journal.log').write_text('\n'.join(kept) + '\n', encoding='utf-8')
    else:  # never the whole journal in its place: other researches would be filed under this one
        say('archive : aucune ligne « RECHERCHE DEMANDÉE » pour %s/%s dans le journal — journal.log NON écrit' % (year, zone))
    clean(path)
    empty = [p for p in path.rglob('*') if p.is_file() and not p.name.startswith('._') and p.stat().st_size == 0]
    count = sum(1 for p in path.rglob('*') if p.is_file() and not p.name.startswith('._'))
    work = [p for p in (path / 'travail').rglob('*') if p.is_file()] if (path / 'travail').is_dir() else []
    if work:
        say('archive : travail/ garde %d fichiers, %.0f Mo — à vider sur son accord (pages Wikipédia, lots, copies)'
            % (len(work), sum(p.stat().st_size for p in work) / 1e6))
    say('archive : %s/%s fermée — %d essais, %d lignes de journal, %d fichiers%s'
        % (year, zone, len(rows) - 4, len(kept), count, ', %d VIDES' % len(empty) if empty else ', aucun vide'))

else:
    sys.exit(__doc__)
