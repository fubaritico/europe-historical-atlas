import sys, json, sqlite3, time, urllib.request, urllib.parse, unicodedata
db, out = sys.argv[1], sys.argv[2]
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
rows = con.execute("""select p.id, p.wikidata, l.name from places p
  join places_locales l on l._parent_id = p.id and l._locale = 'fr'""").fetchall()
with_id = [(i, q, n) for i, q, n in rows if q]
print("lieux:", len(rows), "avec identifiant:", len(with_id), "sans:", len(rows) - len(with_id))
labels = {}
qids = sorted({q for _, q, _ in with_id})
for k in range(0, len(qids), 50):
    chunk = qids[k:k + 50]
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbgetentities", "format": "json", "props": "labels|aliases",
        "languages": "fr|en", "ids": "|".join(chunk)})
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "label-check/1.0"})
            data = json.load(urllib.request.urlopen(req, timeout=40))
            break
        except Exception as e:
            time.sleep(3 * (attempt + 1)); data = None
    if data is None:
        print("lot perdu:", k); continue
    for q, e in data.get("entities", {}).items():
        labels[q] = {"fr": e.get("labels", {}).get("fr", {}).get("value"),
                     "en": e.get("labels", {}).get("en", {}).get("value"),
                     "alias_fr": [a["value"] for a in e.get("aliases", {}).get("fr", [])]}
    time.sleep(0.15)
def fold(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("-", " ").strip()
same = differs = nolabel = alias = 0
diff = []
for i, q, n in with_id:
    l = labels.get(q)
    if not l or not l["fr"]: nolabel += 1; continue
    if fold(l["fr"]) == fold(n): same += 1
    else:
        differs += 1
        is_alias = fold(n) in {fold(a) for a in l["alias_fr"]}
        alias += is_alias
        diff.append({"id": i, "qid": q, "base": n, "wikidata_fr": l["fr"], "wikidata_en": l["en"], "alias": is_alias})
print("même nom:", same, "nom différent:", differs, "(dont alias connu de Wikidata:", alias, ") sans libellé français:", nolabel)
json.dump({"labels": labels, "diff": diff}, open(out, "w"), ensure_ascii=False)
for d in diff[:40]: print(f'  {d["id"]}: {d["base"]}  →  {d["wikidata_fr"]}' + ("  [alias]" if d["alias"] else ""))
