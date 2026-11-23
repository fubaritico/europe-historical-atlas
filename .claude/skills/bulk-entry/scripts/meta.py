"""Lot V: names (fr, de), country, region (the CMS rule) by QLever -> meta.json {q: {...}}.

The holder is never the polity drawn under the point (the dev, 2026-11-23: the map is not a base to verify against).
It comes only from <lot>/holders.json, written from the region's note once its books are read:
  {q: {"holderTitle": <id in titles>, "sourceUrl" or "sourceTitle": ..., "where": ..., "quote": ...}}
When that file exists the region is named (third argument) and region_gate.py must open it; a place absent from the
file is entered without a holder. Usage: python3 -I meta.py <lot folder> <year> [<region>]"""
import json, os, sys, subprocess, time, urllib.parse, urllib.request, collections, sqlite3
ROOT = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map'
NODE = '/Users/stephanecottereau/.nvm/versions/node/v24.22.1/bin'
G = os.path.abspath(sys.argv[1])  # the lot folder
YEAR = sys.argv[2]  # the map's year
def say(message):
    """Print one dated line and append it to the research journal the dev follows (copied from log.py)."""
    import datetime
    line = '%s  %s' % (datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), message)
    print(line, flush=True)
    with open('/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/historien/journal.log', 'a', encoding='utf-8') as out:
        out.write(line + '\n')
HERE = os.path.dirname(os.path.abspath(__file__))
cand = json.load(open(G + '/cand.json'))
holders = {}
if os.path.exists(G + '/holders.json'):
    if len(sys.argv) < 4: raise SystemExit('holders.json is there: name the region (third argument) so that its gate is run')
    gate = subprocess.run(['python3', '-I', HERE + '/region_gate.py', YEAR, sys.argv[3]], capture_output=True, text=True)
    print(gate.stdout, flush=True)
    if gate.returncode:
        say("Saisie refusée pour %s %s : le contrôle de la région n'est pas ouvert, aucun détenteur n'est préparé." % (sys.argv[3], YEAR))
        raise SystemExit('region_gate refused: no holder is prepared')
    holders = json.load(open(G + '/holders.json'))
say('Préparation de %d lieux (%s) : noms, pays et régions lus sur Wikidata ; %d ont un détenteur lu dans un livre.' % (len(cand), os.path.basename(G), len(holders)))
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
meta = {}
for c in cand:
    q = c['q']; h = holders.get(q)
    meta[q] = {'name': lab[q].get('fr') or lab[q].get('de'), 'country': (ctry[q] or [[None, None]])[0], 'region': (reg[q] or [[None, None]])[0],
               'holderTitle': h['holderTitle'] if h else None, 'holder': h or None}
json.dump(meta, open(G + '/meta.json', 'w'), ensure_ascii=False)
without = sum(1 for m in meta.values() if not m['holder'])
say('%d lieux préparés ; %d sans détenteur (« détenteur à lire ») ; %d sans nom ; %d sans région.' % (
    len(meta), without, sum(1 for m in meta.values() if not m['name']), sum(1 for m in meta.values() if not m['region'][0])))
