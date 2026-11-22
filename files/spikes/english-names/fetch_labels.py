"""The English label Wikidata gives each place and each territory of a COPY of the CMS's base (CMS-495).

    python3 -I fetch_labels.py <copy.db> <out.json>

Read-only on the base. Resumable: an id already answered in <out.json> is not asked again, so a run stopped by
Wikidata's rate limit is simply run again. 40 ids a request, 1.5 s between two requests.
"""
import json
import os
import sqlite3
import sys
import time
import urllib.parse
import urllib.request

db, out = sys.argv[1], sys.argv[2]
labels = json.load(open(out))["labels"] if os.path.exists(out) else {}
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
ids = {q for (q,) in con.execute("select wikidata from places where wikidata is not null and wikidata <> ''")}
ids |= {q for (q,) in con.execute("select wikidata from territories where wikidata is not null and wikidata <> ''")}
missing = sorted(ids - labels.keys())
print("identifiants:", len(ids), "| à demander:", len(missing), flush=True)
lost = 0
for k in range(0, len(missing), 40):
    chunk = missing[k:k + 40]
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbgetentities", "format": "json", "props": "labels",
        "languages": "en", "ids": "|".join(chunk)})
    data = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "label-check/1.0"})
            data = json.load(urllib.request.urlopen(req, timeout=40))
            break
        except Exception:
            time.sleep(8 * (attempt + 1))
    if data is None or "entities" not in data:
        lost += 1
        continue
    for q, entity in data["entities"].items():
        labels[q] = entity.get("labels", {}).get("en", {}).get("value")
    if k % 2000 == 0:
        json.dump({"labels": labels}, open(out, "w"), ensure_ascii=False)
        print("demandés:", k + len(chunk), flush=True)
    time.sleep(1.5)
json.dump({"labels": labels}, open(out, "w"), ensure_ascii=False)
named = sum(1 for q in ids if labels.get(q))
print("répondus:", sum(1 for q in ids if q in labels), "| nommés en anglais:", named,
      "| sans nom anglais:", sum(1 for q in ids if q in labels and not labels[q]), "| lots perdus:", lost, flush=True)
