"""Lot V: quotations cut at an abbreviation (« 947 n. », « a. d. », a leading « Chr. »): recompute the full sentence from
the rendered page with the corrected cutting (usage: python3 -I fixcut.py <lot folder> <year>), rewrite the entry files, and list the sheets to update. -> fixcut.json"""
import glob, json, os, re, sqlite3, sys
G = os.path.abspath(sys.argv[1])  # the lot folder
YEAR = int(sys.argv[2])  # the map's year
def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    import datetime
    line = '%s  [%s]  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), __import__('os').environ.get('ATLAS_WHO', 'historien'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')
say('citations coupées : je relis les fichiers de saisie de %s pour %d' % (os.path.basename(G), YEAR))
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mkv.py')).read()
exec(src[src.index('ABBR = '):src.index('\n\n\nimport sqlite3') if '\n\n\nimport sqlite3' in src else src.index('import sqlite3')])
db = sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True)
BAD = re.compile(r'(\b[a-zäöü]\.$)|(^Chr\. )')
fixes = []
for f in sorted(glob.glob(G + '/wave*/enter-v*.json')):
    recs = json.load(open(f)); changed = False
    for r in recs:
        if not BAD.search(r['quote']): continue
        t = re.sub(r'\[\d+\]|​|­', '', re.sub(r'\s+', ' ', json.load(open(G + '/rend/' + r['q'] + '.json'))['text']))
        t = re.sub(r'==+[^=]+==+', ' | ', t)
        sents = [s.strip(' |') for para in t.split(' | ') for s in split(para)]
        core = re.sub(r'^Chr\. ', '', r['quote'])
        hit = [s for s in sents if core in s]
        if not hit or str(r['year']) not in hit[0]:
            print('NOT FIXED', r['q'], r['quote'][:80]); continue
        new = hit[0]
        row = db.execute('select pp.id, t.source_id from places p join place_periods pp on pp.place_id=p.id and pp.date_start_year=' + str(YEAR) + ' '
                         'join place_periods_testimonies t on t._parent_id=pp.id where p.wikidata=?', (r['q'],)).fetchone()
        fixes.append({'q': r['q'], 'name': r['name'], 'period': row[0] if row else None, 'source': row[1] if row else None, 'old': r['quote'], 'new': new})
        r['quote'] = new; changed = True
    if changed: json.dump(recs, open(f, 'w'), ensure_ascii=False, indent=1)
json.dump(fixes, open(G + '/fixcut.json', 'w'), ensure_ascii=False, indent=1)
say('citations coupées : %d recousues, dont %d pas encore dans la base → %s/fixcut.json' % (len(fixes), sum(1 for x in fixes if x['period'] is None), os.path.basename(G)))
for x in fixes: print(' ', x['name'], '|', x['new'][:150])
