"""The candidates of a pool not in the base and farther than 1.5 km from any 1100 sheet. -> cand.json"""
import json, math, os, re, sqlite3
import sys
G = os.path.abspath(sys.argv[1])  # the lot folder
POOL = sys.argv[2]  # a JSON list of {q, lon, lat, url, ...}
YEAR = int(sys.argv[3])
def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from research_log.py)."""
    import datetime
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with open('/Volumes/Acer/atlas-historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')
say('candidats : je lis le vivier %s pour %d et j\'écarte ce que la base a déjà' % (os.path.basename(POOL), YEAR))
db = sqlite3.connect('file:/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db?mode=ro', uri=True)
have = {q for (q,) in db.execute('select wikidata from places where wikidata is not null')}
pts = []
for loc, in db.execute('select p.location from places p join place_periods pp on pp.place_id=p.id where pp.date_start_year=' + str(YEAR) + ''):
    m = re.findall(r'-?\d+\.?\d*', loc)
    if len(m) >= 2: pts.append((float(m[0]), float(m[1])))
def km(a, b, c, d): return 6371 * math.hypot(math.radians(c - a) * math.cos(math.radians((b + d) / 2)), math.radians(d - b))
out, near = [], 0
for x in json.load(open(POOL)):
    if x['q'] in have: continue
    close = [p for p in pts if abs(p[0] - x['lon']) < 0.05 and abs(p[1] - x['lat']) < 0.05]
    if any(km(x['lon'], x['lat'], lo, la) < 1.5 for lo, la in close): near += 1; continue
    out.append(x)
json.dump(out, open(G + '/cand.json', 'w'), ensure_ascii=False)
say('candidats : %d gardés, %d écartés à moins de 1,5 km d\'une fiche de %d → %s/cand.json' % (len(out), near, YEAR, os.path.basename(G)))
