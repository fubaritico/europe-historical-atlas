"""Count the sheets the base already holds for a zone at a year, by what carries their holder and their existence
— the first step of a region already researched (`/find-sources`, « A region already researched »). Reads the
base only (cms.db, read-only). The zone is a box of longitudes and latitudes.

  python3 -I count_sheets.py <year> <west> <south> <east> <north> [--list]

The holder of a sheet is carried by: nothing (`sans détenteur`); a holder with no line (`détenteur sans ligne` —
copied from the polity drawn under the city); lines of an encyclopaedia only (`Wikipédia seule`); a line of a work
(`un ouvrage cité` — to re-read in its text: the old ones came through agents' reports). `--list` names the places.
"""
import collections
import datetime
import json
import pathlib
import sqlite3
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
JOURNAL = pathlib.Path(('/Volumes/Acer/atlas-historien/journal/%s.log' % __import__('datetime').date.today().isoformat()))
WORKS = ('primary', 'scholarly', 'historian-atlas')


def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(line + '\n')


args = [a for a in sys.argv[1:] if a != '--list']
if len(args) != 5:
    sys.exit(__doc__)
YEAR = int(args[0])
WEST, SOUTH, EAST, NORTH = (float(a) for a in args[1:])
db = sqlite3.connect('file:%s?mode=ro' % (ROOT / 'packages/cms/cms.db'), uri=True)
names = {}
try:
    for parent, name in db.execute("select id, name from places"):
        names[parent] = name
except sqlite3.Error as error:  # the names are a comfort of --list; the counts do not need them
    print('noms des lieux illisibles (%s) : la liste donnera les identifiants' % error)

sheets = []
for sheet, place, location, title in db.execute(
        'select pp.id, p.id, p.location, pp.holder_title_id from place_periods pp join places p on p.id = pp.place_id '
        'where pp.date_start_year = ?', (YEAR,)):
    try:
        lon, lat = json.loads(location)['coordinates'][:2]
    except (TypeError, ValueError, KeyError):
        continue
    if WEST <= lon <= EAST and SOUTH <= lat <= NORTH:
        sheets.append((sheet, place, title))

lines = collections.defaultdict(list)
for parent, subject, kind in db.execute(
        'select t._parent_id, t.subject, s.kind from place_periods_testimonies t left join sources s on s.id = t.source_id'):
    lines[parent].append((subject, kind))

holder, existence = collections.defaultdict(list), collections.defaultdict(list)
for sheet, place, title in sheets:
    held = [kind for subject, kind in lines[sheet] if subject == 'holder']
    other = [kind for subject, kind in lines[sheet] if subject != 'holder']
    label = names.get(place, 'lieu %d' % place)
    if any(k in WORKS for k in held):
        holder['un ouvrage cité (à relire dans son texte)'].append(label)
    elif held:
        holder['Wikipédia seule'].append(label)
    elif title is not None:
        holder['détenteur sans ligne (le pays dessiné sous la ville)'].append(label)
    else:
        holder['sans détenteur'].append(label)
    if any(k in WORKS for k in other):
        existence['un ouvrage cité'].append(label)
    elif other:
        existence['Wikipédia seule'].append(label)
    else:
        existence['aucune ligne'].append(label)

say('FICHES DÉJÀ DANS LA BASE — %d, de %s à %s de longitude, de %s à %s de latitude : %d fiches'
    % (YEAR, WEST, EAST, SOUTH, NORTH, len(sheets)))
for heading, groups in (('Le détenteur est porté par', holder), ("L'existence est portée par", existence)):
    say(heading + ' :')
    for key, places in sorted(groups.items(), key=lambda item: -len(item[1])):
        say('   - %s : %d' % (key, len(places)))
        if '--list' in sys.argv:
            print('       ' + ', '.join(sorted(places)))
