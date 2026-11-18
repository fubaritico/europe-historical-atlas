"""Lot V: names (fr, de), country, region (the CMS rule) by QLever, and the polity drawn under each point with its 1100
holder title (titlemap rule). -> meta.json {q: {...}}"""
import json, os, sys, subprocess, time, urllib.parse, urllib.request, collections, sqlite3
ROOT = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map'
NODE = '/Users/stephanecottereau/.nvm/versions/node/v24.22.1/bin'
G = os.path.abspath(sys.argv[1])  # the lot folder
YEAR = sys.argv[2]  # the map's year
HERE = os.path.dirname(os.path.abspath(__file__))
cand = json.load(open(G + '/cand.json'))
P = """PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/> PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/> PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> """
def ask(q):
    req = urllib.request.Request('https://qlever.dev/api/wikidata', data=urllib.parse.urlencode({'query': q}).encode(),
        headers={'User-Agent': 'historical-atlas-research/0.1 (non-commercial)', 'Accept': 'application/sparql-results+json'})
    for a in range(5):
        try: return json.load(urllib.request.urlopen(req, timeout=180))['results']['bindings']
        except Exception as e: print('retry', e, flush=True); time.sleep(15 * (a + 1))
    raise SystemExit('QLever failed')
lab, ctry, reg = collections.defaultdict(dict), collections.defaultdict(list), collections.defaultdict(list)
qs = [c['q'] for c in cand]
for k in range(0, len(qs), 300):
    vals = ' '.join('wd:' + q for q in qs[k:k + 300])
    for b in ask(P + 'SELECT ?item ?l ?lang WHERE { VALUES ?item { %s } ?item rdfs:label ?l . BIND(LANG(?l) AS ?lang) FILTER(?lang IN ("fr","de")) }' % vals):
        lab[b['item']['value'].rsplit('/', 1)[1]][b['lang']['value']] = b['l']['value']
    for b in ask(P + """SELECT ?item ?x ?l WHERE { VALUES ?item { %s } ?item p:P17 ?s . ?s ps:P17 ?x ; wikibase:rank ?r .
      FILTER(?r != wikibase:DeprecatedRank) FILTER NOT EXISTS { ?s pq:P582 ?e } FILTER NOT EXISTS { ?x wdt:P576 ?d }
      OPTIONAL { ?x rdfs:label ?l FILTER(LANG(?l) = "fr") } }""" % vals):
        ctry[b['item']['value'].rsplit('/', 1)[1]].append([b['x']['value'].rsplit('/', 1)[1], b.get('l', {}).get('value')])
    for b in ask(P + """SELECT ?item ?x ?l WHERE { VALUES ?item { %s } ?item wdt:P131* ?x . ?x wdt:P31/wdt:P279* wd:Q10864048 .
      FILTER NOT EXISTS { ?x wdt:P576 ?d } OPTIONAL { ?x rdfs:label ?l FILTER(LANG(?l) = "fr") } }""" % vals):
        reg[b['item']['value'].rsplit('/', 1)[1]].append([b['x']['value'].rsplit('/', 1)[1], b.get('l', {}).get('value')])
    print('qlever', k, flush=True); time.sleep(1)
json.dump([{'id': c['q'], 'lon': c['lon'], 'lat': c['lat']} for c in cand], open(G + '/pts.json', 'w'))
env = dict(os.environ, PATH=NODE + ':' + os.environ['PATH'])
out = subprocess.run(['pnpm', '-C', ROOT + '/packages/cartographer', 'exec', 'tsx', HERE + '/under.mts', YEAR, G + '/pts.json'],
    capture_output=True, text=True, env=env, timeout=1200)
if out.returncode: print(out.stderr[-1500:]); raise SystemExit('under failed')
under = json.loads(out.stdout[out.stdout.index('{'):])
subprocess.run(['python3', '-I', HERE + '/titlemap.py', G + '/titlemap.json', YEAR], check=True)
tm = json.load(open(G + '/titlemap.json'))
db = sqlite3.connect('file:' + ROOT + '/packages/cms/cms.db?mode=ro', uri=True)
use = collections.Counter(dict(db.execute('select holder_title_id,count(*) from place_periods where date_start_year=' + YEAR + ' group by 1')))
meta, why = {}, collections.Counter()
for c in cand:
    q = c['q']; u = under.get(q)
    if not u: why['no polity drawn'] += 1; continue
    ts = tm.get(str(('w', u.get('wikidata'))), []) + (tm.get(str(('t', u.get('territory'))), []) if u.get('territory') else [])
    if not ts: why['no title for ' + u['name']] += 1; continue
    title = max(ts, key=lambda t: (use.get(t['title'], 0), t['jan'], -t['sy']))['title']
    meta[q] = {'name': lab[q].get('fr') or lab[q].get('de'), 'country': (ctry[q] or [[None, None]])[0], 'region': (reg[q] or [[None, None]])[0],
               'polity': u['name'], 'holderTitle': title}
json.dump(meta, open(G + '/meta.json', 'w'), ensure_ascii=False)
print(len(meta), 'with a title;', dict(why)); print(collections.Counter(m['holderTitle'] for m in meta.values()).most_common(12))
print('no name:', sum(1 for m in meta.values() if not m['name']), '; no region:', sum(1 for m in meta.values() if not m['region'][0]))
