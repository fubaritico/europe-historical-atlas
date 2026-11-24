"""The deliverable of a research: from the lots' reports (checked), the data to enter in the CMS, sheet by sheet — the
action (confirmer, corriger, vider, supprimer, créer), the holder and its title in the base, the lines of the works
(holder, existence) with their quotation and page. Only works make a line (primary, scholarly, historian-atlas); an
encyclopaedia never does. The historian's arbitrations (a reading the reports could not settle, decided from works he
read) are applied from <zone>/resultats/arbitrages.json when it exists. Reads the base read-only.

  python3 -I build_saisie.py <year> <zone>
Writes <year>/<zone>/resultats/saisie.json and saisie.md (French, for the dev), says it in the journal.
"""
import datetime
import glob
import json
import pathlib
import sqlite3
import sys

YEAR, ZONE = int(sys.argv[1]), sys.argv[2]
ARCH = pathlib.Path('/Volumes/Acer/atlas-historien/%d/%s' % (YEAR, ZONE))
T = ARCH / 'travail'
WORKS = ('primary', 'scholarly', 'historian-atlas')
db = sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True)


def say(message):
    """Print one dated line and append it to the research journal (copied from research_log.py)."""
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')


def path_of(witness):
    """The absolute file a quotation was copied from."""
    f = witness.get('file') or ''
    return f if f.startswith('/') else str(T / f)


def line(subject, w):
    """One testimony line of a work, or None for an encyclopaedia or a witness without quotation."""
    if not w or w.get('kind') not in WORKS or not w.get('quote'):
        return None
    return {'subject': subject, 'work': w.get('work'), 'kind': w.get('kind'), 'where': w.get('where'),
            'quote': w['quote'], 'file': path_of(w), 'holder': w.get('_holder'), 'holderQid': w.get('_qid')}


def titles_for(qid):
    """The titles of the base whose person or territory is this QID and which run through the year."""
    rows = db.execute(
        'select t.id, t.label, tr.wikidata, pe.wikidata from titles t join territories tr on tr.id=t.territory_id '
        'join people pe on pe.id=t.person_id where (tr.wikidata=? or pe.wikidata=?) and t.date_start_year<=? '
        'and (t.date_end_year is null or t.date_end_year>=?)', (qid, qid, YEAR, YEAR)).fetchall()
    return [{'titleId': r[0], 'label': r[1]} for r in rows]


sheets = {}
for f in glob.glob(str(T / 'lots/*.json')):
    for p in json.load(open(f))['places']:
        sheets[p['qid']] = p
base = {}
for sheet, title, hname, hqid, terr, pers, label in db.execute(
        'select pp.id, pp.holder_title_id, pp.holder_name, pp.holder_qid, tr.wikidata, pe.wikidata, t.label '
        'from place_periods pp left join titles t on t.id=pp.holder_title_id left join territories tr on tr.id=t.territory_id '
        'left join people pe on pe.id=t.person_id where pp.date_start_year=?', (YEAR,)):
    base[sheet] = {'titleId': title, 'label': label, 'holderName': hname, 'holderQid': hqid, 'qids': {terr, pers} - {None}}
arb = json.load(open(ARCH / 'resultats/arbitrages.json')) if (ARCH / 'resultats/arbitrages.json').exists() else {}

def tagged(report):
    """The report's witnesses, each tagged with the holder it supports — so a line keeps its own reading once merged."""
    out = []
    for w in report.get('witnesses') or []:
        w = dict(w)
        w.setdefault('_holder', report.get('holder'))
        w.setdefault('_qid', report.get('holderQid'))
        out.append(w)
    return out


def merge(first, later):
    """A later report (a later round's, a reader's) is the latest research on the place: its holder wins when it names
    one, the earlier holder is kept as a contrary reading (its lines keep their own holder); its works are added; it
    gives the existence the first lacked — it never erases a reading."""
    t = dict(first)
    t['witnesses'] = tagged(first) + tagged(later)
    if later.get('holder'):
        if first.get('holder') and first.get('holder') != later.get('holder'):
            t['divergence'] = 'earlier reading: %s' % first['holder']
        for key in ('holder', 'holderQid', 'under', 'underQid', 'holderBasis', 'fragile'):
            t[key] = later.get(key)
    if t.get('existed1100') not in ('existed', 'not-yet') and later.get('existed1100') in ('existed', 'not-yet'):
        t['existed1100'], t['existence'] = later['existed1100'], later.get('existence')
    t['divergence'] = ' / '.join(d for d in (t.get('divergence'), later.get('divergence')) if d) or None
    return t


per, lot_of = {}, {}
for rep in sorted(glob.glob(str(T / 'reports/*.json')), key=lambda p: pathlib.Path(p).stat().st_mtime):
    r = json.load(open(rep))
    for t in r.get('towns', []):
        q = t.get('qid')
        if q:
            per[q] = merge(per[q], t) if q in per else t
            lot_of.setdefault(q, r.get('lot') or r.get('book', {}).get('folder'))

out = []
for q, t in per.items():
    r = {'lot': lot_of[q]}
    a = dict(arb.get(q, {}))
    lot = sheets.get(q)
    sheet = lot['sheet'] if lot else None
    b = base.get(sheet, {}) if sheet else {}
    holder, hq = a.get('holder', t.get('holder')), a.get('holderQid', t.get('holderQid'))
    existed = a.get('existed', t.get('existed1100'))
    lines = [l for l in (line('holder', w) for w in t.get('witnesses', [])) if l] if holder else []
    if holder and not lines and 'holder' not in a:
        # A holder no work states is no holder (the method's rule): the sheet is emptied, the reading kept as a note.
        a.setdefault('why', 'holder read without a line of a work: %s' % holder)
        holder, hq = None, None
    ex = line('existence', (t.get('existence') or {}).get('witness'))
    if ex:
        lines.append(ex)
    rec = {'qid': q, 'name': t.get('name'), 'lot': r.get('lot'), 'sheet': sheet, 'existed': existed,
           'holder': holder, 'holderQid': hq, 'under': t.get('under'), 'holderBasis': t.get('holderBasis'),
           'fragile': a.get('fragile', t.get('fragile')), 'divergence': a.get('divergence', t.get('divergence')),
           'baseHolder': b.get('label'), 'lines': lines, 'why': a.get('why')}
    if a.get('action'):
        rec['action'] = a['action']
    elif sheet is None:
        rec['action'] = 'créer' if existed == 'existed' else 'ignorer'
    elif existed == 'not-yet':
        rec['action'] = 'supprimer'
    elif not holder:
        rec['action'] = 'vider' if (b.get('titleId') or b.get('holderName') or b.get('holderQid')) else 'rien'
    elif not hq:
        rec['action'] = 'rattacher'  # a holder named by the works, without a QID: its title found or made by name
    elif hq in b.get('qids', set()):
        rec['action'] = 'confirmer'
    else:
        rec['action'] = 'corriger'
    if hq and rec['action'] in ('corriger', 'créer'):
        found = titles_for(hq)
        rec['titles'] = found or 'à créer'
    if holder and not [l for l in lines if l['subject'] == 'holder']:
        rec['problem'] = 'détenteur sans ligne de livre'
    out.append(rec)

(ARCH / 'resultats/saisie.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
count = {}
for rec in out:
    count[rec['action']] = count.get(rec['action'], 0) + 1
md = ['# Saisie de %s, %d — ce que les livres disent, fiche par fiche' % (ZONE, YEAR), '',
      'Fait le %s à partir des rapports vérifiés. Actions : %s.' % (datetime.date.today().isoformat(),
      ', '.join('%s %d' % kv for kv in sorted(count.items()))), '']
for action in ('corriger', 'rattacher', 'vider', 'fusionner', 'supprimer', 'créer', 'confirmer'):
    rows = [x for x in out if x['action'] == action]
    if not rows:
        continue
    md += ['## %s (%d)' % (action.capitalize(), len(rows)), '']
    for x in rows:
        works = sorted({l['work'].split(',')[0] for l in x['lines'] if l['subject'] == 'holder' and l.get('work')})
        md.append('- **%s** — %s%s%s%s' % (
            x['name'], x['holder'] or 'aucun détenteur prouvé',
            ' (avant : %s)' % x['baseHolder'] if x['baseHolder'] and action in ('corriger', 'vider') else '',
            ' — %s' % ', '.join(works) if works else '', ' — fragile' if x.get('fragile') else ''))
    md.append('')
problems = [x for x in out if x.get('problem')]
if problems:
    md += ['## À reprendre avant la saisie (%d)' % len(problems), ''] + ['- %s : %s' % (x['name'], x['problem']) for x in problems]
(ARCH / 'resultats/saisie.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
say('saisie %s %d : %d fiches — %s ; %d à reprendre' % (ZONE, YEAR, len(out), ', '.join('%s %d' % kv for kv in sorted(count.items())), len(problems)))
