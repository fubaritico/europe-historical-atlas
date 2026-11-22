import sys, json, sqlite3, time, urllib.request, urllib.parse, unicodedata
db, out = sys.argv[1], sys.argv[2]
state = json.load(open(out)); labels = state["labels"]
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
rows = con.execute("""select p.id, p.wikidata, l.name from places p
  join places_locales l on l._parent_id = p.id and l._locale = 'fr'""").fetchall()
missing = sorted({q for _, q, _ in rows if q not in labels})
print("identifiants sans réponse:", len(missing), flush=True)
for k in range(0, len(missing), 40):
    chunk = missing[k:k + 40]
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbgetentities", "format": "json", "props": "labels|aliases",
        "languages": "fr|en", "ids": "|".join(chunk)})
    data = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "label-check/1.0"})
            data = json.load(urllib.request.urlopen(req, timeout=40)); break
        except Exception as e:
            time.sleep(8 * (attempt + 1))
    if data is None: print("lot perdu:", k, flush=True); continue
    for q, e in data.get("entities", {}).items():
        labels[q] = {"fr": e.get("labels", {}).get("fr", {}).get("value"),
                     "en": e.get("labels", {}).get("en", {}).get("value"),
                     "alias_fr": [a["value"] for a in e.get("aliases", {}).get("fr", [])]}
    time.sleep(1.5)
def fold(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("-", " ").replace("’", "'").strip()
same = nofr = unanswered = 0; diff = []; nolabel = []
for i, q, n in rows:
    l = labels.get(q)
    if l is None: unanswered += 1; continue
    if not l["fr"]:
        nofr += 1; nolabel.append({"id": i, "qid": q, "base": n, "wikidata_en": l["en"]}); continue
    if fold(l["fr"]) == fold(n): same += 1
    else:
        diff.append({"id": i, "qid": q, "base": n, "wikidata_fr": l["fr"], "wikidata_en": l["en"],
                     "alias": fold(n) in {fold(a) for a in l["alias_fr"]}})
print("lieux:", len(rows), "| même nom:", same, "| nom différent:", len(diff), "(alias connu:", sum(d["alias"] for d in diff), ")",
      "| sans libellé français:", nofr, "| sans réponse:", unanswered, flush=True)
en_same = sum(1 for d in nolabel if d["wikidata_en"] and fold(d["wikidata_en"]) == fold(d["base"]))
print("sans libellé français mais même nom que l'anglais:", en_same, flush=True)
json.dump({"labels": labels, "diff": diff, "nolabel": nolabel}, open(out, "w"), ensure_ascii=False)
