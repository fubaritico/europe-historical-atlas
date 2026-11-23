"""The gate of a region: no place of a region is entered with a holder before its books were read.

Reads the attempts register (/Volumes/Acer/atlas-historien/registre/attempts.jsonl) and the region's note
(/Volumes/Acer/atlas-historien/<year>/<zone>/resultats/note-de-region.md), and refuses (exit 1) while one of these is missing:
  1. the region's note, with its sections « Index references » and « Attempts »;
  2. one attempt per atlas on disk (files/resources/other-historical-atlases-pdf/*.pdf) for this region —
     `found`, `nothing` or `not relevant`, each one opened or ruled out by its title, never skipped;
  3. at least one attempt in each compulsory channel (the dev, 2026-11-23): `wikipedia-bibliography` (the works the
     region's pages cite, listed), `jstor`, `gallica`, `bnf`, `archive-org` — a library is never « not relevant »;
  4. at least one work read whose result is `found` and whose kind is `book-passage` or `atlas-on-disk`.
It prints the count of attempts by kind and by result: the dev judges whether it is enough.

An attempt is one JSON line:
  {"date": "2026-11-23", "year": 1100, "region": "anatolia", "place": "Ankara or null", "hypothesis": "Danishmendids",
   "kind": "wikipedia-bibliography | jstor | gallica | bnf | archive-org | library | atlas-on-disk | book-index | book-passage",
   "where": "the file, the library or the work (title, index entry, pages)", "words": "what was searched",
   "result": "found | nothing | refused | not available | not relevant",
   "reason": "compulsory with « not relevant »: the region or the period the work's title, contents or index rule out"}

Usage: python3 -I region_gate.py <year> <zone>   — the zone as the archive names it (anatolie)
"""
import collections
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
YEAR, REGION = int(sys.argv[1]), sys.argv[2]
NOTE = pathlib.Path('/Volumes/Acer/atlas-historien') / str(YEAR) / REGION / 'resultats/note-de-region.md'  # the zone's note, on the archive
ATTEMPTS = pathlib.Path('/Volumes/Acer/atlas-historien/registre/attempts.jsonl')
ATLASES = ROOT / 'files/resources/other-historical-atlases-pdf'
# The channels the dev made compulsory on 2026-11-23: none is skipped, a search there may only come back empty.
CHANNELS = ('wikipedia-bibliography', 'jstor', 'gallica', 'bnf', 'archive-org')
# Only a single work can be ruled out as not relevant — never a library — and its reason is written.
WORKS = {'atlas-on-disk', 'book-index', 'book-passage'}
KINDS = set(CHANNELS) | WORKS | {'library'}
RESULTS = {'found', 'nothing', 'refused', 'not available', 'not relevant'}

missing = []
rows = []
if ATTEMPTS.exists():
    for n, line in enumerate(ATTEMPTS.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get('kind') not in KINDS or row.get('result') not in RESULTS:
            missing.append('attempts.jsonl line %d: unknown kind or result' % n)
            continue
        if row['result'] == 'not relevant' and (row['kind'] not in WORKS or not str(row.get('reason') or '').strip()):
            missing.append('attempts.jsonl line %d: « not relevant » is for a single work, with its reason' % n)
            continue
        if row.get('region') == REGION and row.get('year') == YEAR:
            rows.append(row)

if not NOTE.exists():
    missing.append('the note %s does not exist' % NOTE)
else:
    text = NOTE.read_text(encoding='utf-8')
    for section in ('Index references', 'Attempts'):
        if ('## ' + section) not in text:
            missing.append('the note has no section « %s »' % section)

tried = {r['where'] for r in rows if r['kind'] == 'atlas-on-disk'}
for pdf in sorted(p.name for p in ATLASES.iterdir() if p.suffix.lower() in ('.pdf', '.djvu')):
    if not any(pdf in where for where in tried):
        missing.append('atlas on disk not tried: %s' % pdf)

for channel in CHANNELS:
    if not any(r['kind'] == channel for r in rows):
        missing.append('compulsory channel not searched: %s' % channel)
    # Behind the dev's accounts: a connection that failed is a stop (CONNEXION IMPOSSIBLE), never an attempt.
    elif channel in ('bnf', 'jstor') and not any(
            r['kind'] == channel and r['result'] in ('found', 'nothing') for r in rows):
        missing.append('CONNEXION IMPOSSIBLE — %s was never really searched (no « found » or « nothing »)' % channel)
if not any(r['kind'] in ('book-passage', 'atlas-on-disk') and r['result'] == 'found' for r in rows):
    missing.append('no work read: no attempt « book-passage » or « atlas-on-disk » with the result « found »')

count = collections.Counter((r['kind'], r['result']) for r in rows)
print('%s %d — %d attempts' % (REGION, YEAR, len(rows)))
for (kind, result), n in sorted(count.items()):
    print('  %-24s %-14s %d' % (kind, result, n))
if missing:
    print('REFUSED — no holder is entered for this region:')
    for m in missing:
        print('  - ' + m)
    sys.exit(1)
print('OPEN — the holders of the note may be entered.')
