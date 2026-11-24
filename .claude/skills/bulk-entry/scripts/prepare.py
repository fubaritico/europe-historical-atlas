"""The preparation of a research, run before anything is read — Wikipedia included (the dev, 2026-11-23: "before you
even start on Wikipedia, there is the preparation: what do you have, what will you use, in which order; then you start").

It says in the journal (/Volumes/Acer/atlas-historien/journal/, one file a day, followed by the dev with pnpm research-log) what the research of a
region at a year has at hand — the archive on the external disk, his axes, the region's note, the PDFs on disk, the
attempts already made — and the order of the channels. It stops when the archive's disk is absent. It reads only; it
writes nothing but the journal. It ends on what is still to do before the first read.

Usage: python3 -I prepare.py <year> <zone>   — the zone as the archive names it (anatolie)
"""
import collections
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
YEAR, REGION = int(sys.argv[1]), sys.argv[2]
ZONE = REGION  # one key since 2026-11-23: the zone as the archive names it (anatolie)
ARCHIVE = pathlib.Path('/Volumes/Acer/atlas-historien')
JOURNAL = pathlib.Path(('/Volumes/Acer/atlas-historien/journal/%s.log' % __import__('datetime').date.today().isoformat()))
NOTE = pathlib.Path('/Volumes/Acer/atlas-historien') / str(YEAR) / REGION / 'resultats/note-de-region.md'  # the zone's note, on the archive
ATTEMPTS = pathlib.Path('/Volumes/Acer/atlas-historien/registre/attempts.jsonl')
ATLASES = pathlib.Path('/Volumes/Acer/atlas-historien/bibliotheque')
ORDER = ("ses axes de recherche", "le contexte des dix années d'avant", "les noms et les hypothèses", "Wikipédia — amorce seulement, et les ouvrages que ses pages citent",
         "les PDF du disque", "archive.org", "Gallica", "la BnF (son Chrome, connexion vérifiée)",
         "JSTOR (son Chrome, connexion vérifiée)", "dans chaque livre : l'index, le passage, les notes et la bibliographie — un à deux degrés",
         "la note de région", "les cas bloqués sur une page lisible", "le contrôle region_gate.py", "la saisie")


def say(message):
    """Print one dated line and append it to the journal."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


todo = []
say('PRÉPARATION — %s, %d' % (REGION, YEAR))

# the archive on the external disk (`/find-sources`, « The archive »): what is already read is not fetched again
if not ARCHIVE.is_dir():
    say('DISQUE ABSENT — %s introuvable : la recherche ne commence pas sans lui.' % ARCHIVE)
    sys.exit(1)
index = ARCHIVE / 'ouvrages/index.md'
works = [l for l in index.read_text(encoding='utf-8').splitlines() if l.startswith('| `')] if index.exists() else []
say("L'archive est branchée : %d ouvrages déjà rangés (ouvrages/index.md), à relire avant d'en chercher d'autres." % len(works))
# REPO-501: the historian tells the dev when the archive is large enough for the RAG to be worth building
RAG_AT = 30
if len(works) >= RAG_AT and not (ARCHIVE / 'rag').is_dir():
    say('LE MOMENT DU RAG : %d ouvrages rangés (seuil %d) — le dire au dev, ticket REPO-501.' % (len(works), RAG_AT))
if ZONE:
    fiche = ARCHIVE / str(YEAR) / ZONE / 'fiche.md'
    if fiche.exists():
        say("La recherche %d/%s existe déjà dans l'archive : je relis son résumé, fiche.md, avant de continuer (%s)." % (YEAR, ZONE, fiche))
    else:
        todo.append("ouvrir la recherche dans l'archive : archive.py open %d %s \"<ce qu'il a demandé>\"" % (YEAR, ZONE))

if NOTE.exists():
    text = NOTE.read_text(encoding='utf-8')
    say('La note de région existe : %s' % NOTE)
    if '## Axes given' in text:
        say('Ses axes de recherche y sont notés.')
    else:
        todo.append("lui demander ses axes de recherche et les noter dans la note (« Axes given »)")
    # the section counts once it holds dated lines (« - **1097** … »), not as an empty heading
    # (« ## Context — … » is mine; « ## Context points given » holds his leads and does not count)
    if '\n## Context — ' in text and text.split('\n## Context — ', 1)[1].split('\n## ', 1)[0].count('\n- **') >= 5:
        say('Le contexte des dix années d\'avant (%d–%d) y est écrit.' % (YEAR - 10, YEAR))
    else:
        todo.append("écrire le contexte des dix années d'avant (%d–%d) dans la note (« Context — the ten years "
                    "before ») avant toute recherche" % (YEAR - 10, YEAR))
else:
    todo.append("écrire dans la note le contexte des dix années d'avant (%d–%d), « Context — the ten years before »"
                % (YEAR - 10, YEAR))
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
