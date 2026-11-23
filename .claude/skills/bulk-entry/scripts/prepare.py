"""The preparation of a research, run before anything is read — Wikipedia included (the dev, 2026-11-23: "before you
even start on Wikipedia, there is the preparation: what do you have, what will you use, in which order; then you start").

It says in the journal (files/resources/historien/journal.log, followed by the dev with tail -f) what the research of a
region at a year has at hand — his axes, the region's note, the PDFs on disk, the attempts already made — and the order
of the channels. It reads only; it writes nothing but the journal. It ends on what is still to do before the first read.

Usage: python3 -I prepare.py <year> <region>
"""
import collections
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
YEAR, REGION = int(sys.argv[1]), sys.argv[2]
JOURNAL = ROOT / 'files/resources/historien/journal.log'
NOTE = ROOT / 'files/plans/sources' / str(YEAR) / (REGION + '.md')
ATTEMPTS = ROOT / 'files/resources/historien/registre/attempts.jsonl'
ATLASES = ROOT / 'files/resources/other-historical-atlases-pdf'
ORDER = ("ses axes de recherche", "les noms et les hypothèses", "Wikipédia — amorce seulement, et les ouvrages que ses pages citent",
         "les PDF du disque", "archive.org", "Gallica", "la BnF (son Chrome, connexion vérifiée)",
         "JSTOR (son Chrome, connexion vérifiée)", "dans chaque livre : l'index, le passage, les notes et la bibliographie — un à deux degrés",
         "la note de région", "les cas bloqués sur une page lisible", "le contrôle region_gate.py", "la saisie")


def say(message):
    """Print one dated line and append it to the journal."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


todo = []
say('PRÉPARATION — %s, %d' % (REGION, YEAR))

if NOTE.exists():
    text = NOTE.read_text(encoding='utf-8')
    say('La note de région existe : %s' % NOTE.relative_to(ROOT))
    if '## Axes given' in text:
        say('Ses axes de recherche y sont notés.')
    else:
        todo.append("lui demander ses axes de recherche et les noter dans la note (« Axes given »)")
else:
    todo.append("créer la note de région %s, avec ses axes de recherche demandés d'abord" % NOTE.relative_to(ROOT))

pdfs = sorted(p for p in ATLASES.iterdir() if p.suffix.lower() in ('.pdf', '.djvu'))
say('%d ouvrages sur le disque (la liste est relue à chaque fois : un fichier ajouté y est), chacun à ouvrir ou à '
    'écarter avec sa raison :' % len(pdfs))
for pdf in pdfs:
    say('   - %s (%d Mo)' % (pdf.name, round(pdf.stat().st_size / 1e6)))

rows = []
if ATTEMPTS.exists():
    for line in ATTEMPTS.read_text(encoding='utf-8').splitlines():
        if line.strip():
            row = json.loads(line)
            if row.get('region') == REGION and row.get('year') == YEAR:
                rows.append(row)
if rows:
    say('%d essais déjà faits pour cette région :' % len(rows))
    for (kind, result), n in sorted(collections.Counter((r['kind'], r['result']) for r in rows).items()):
        say('   - %s, %s : %d' % (kind, result, n))
else:
    say('Aucun essai encore fait pour cette région.')

say("L'ordre de la recherche :")
for n, step in enumerate(ORDER):
    say('   %d. %s' % (n, step))

todo.append("vérifier avec lui que la BnF et JSTOR sont connectées dans son Chrome — sinon CONNEXION IMPOSSIBLE")
todo.append("relire les contraintes de la skill contre la demande et dire toute contradiction avant de commencer")
say('Avant la première lecture, il reste à :')
for item in todo:
    say('   - ' + item)
