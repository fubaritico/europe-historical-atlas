"""Write the English name of each person, event type, importance reason and siege engine that has none (CMS-495).

    python3 -I write_registers.py <base.db> <labels.json> <report.json> [--apply]

A person's English name is Wikidata's English label, read by `fetch_labels.py`; the three short registers are
labels of the interface, translated here by the coder. Without --apply nothing is written. With --apply, one
transaction, additions only: an English row already there is never replaced. Run on a copy first, then on the base.
The report lists the people left to the historian: no Wikidata id, or no English label in Wikidata.
"""
import json
import sqlite3
import sys

db, labels_path, report_path = sys.argv[1], sys.argv[2], sys.argv[3]
apply = "--apply" in sys.argv[4:]
labels = json.load(open(labels_path))["labels"]
con = sqlite3.connect(db)
con.execute("pragma foreign_keys = on")

# The coder's translations of the three short registers, by their French label (2026-11-23).
REGISTERS = {
    "event_types": {
        "Bataille": "Battle", "Invention": "Invention", "Guerre": "War", "Découverte": "Discovery",
        "Polithique - Révolution": "Politics - Revolution", "Polithique - Coup d'état": "Politics - Coup d'état",
        "Polithique - Accession au trone": "Politics - Accession to the throne", "Siège": "Siege",
        "Invasion": "Invasion", "Conquest": "Conquest", "Mort": "Death", "Concile": "Council",
        "Intronisation": "Enthronement",
    },
    "importance_reasons": {
        "siège archiépiscopal": "archiepiscopal see", "siège épiscopal": "episcopal see", "université": "university",
        "lieu de pèlerinage": "place of pilgrimage", "ville sainte": "holy city", "forteresse": "fortress",
        "noeud commercial": "trade hub", "abbaye ou monastère": "abbey or monastery",
    },
    "siege_engines": {
        "Trébuchet à traction (mangonneau)": "Traction trebuchet (mangonel)",
        "Trébuchet à contrepoids": "Counterweight trebuchet", "Canon": "Cannon",
    },
}


def missing(table):
    """The records of a table with no English row, with their French name."""
    return con.execute(
        f"select f._parent_id, f.name from {table}_locales f where f._locale = 'fr' and not exists "
        f"(select 1 from {table}_locales e where e._parent_id = f._parent_id and e._locale = 'en') "
        "order by f._parent_id").fetchall()


writes = []
report = {"people": {"written": 0, "noWikidata": [], "noEnglishLabel": []}, "registers": {}, "untranslated": []}
for person, fr in missing("people"):
    (q,) = con.execute("select wikidata from people where id = ?", (person,)).fetchone()
    if not q:
        report["people"]["noWikidata"].append({"id": person, "fr": fr})
    elif not labels.get(q):
        report["people"]["noEnglishLabel"].append({"id": person, "fr": fr, "wikidata": q})
    else:
        writes.append(("people", person, labels[q]))
        report["people"]["written"] += 1
for table, words in REGISTERS.items():
    report["registers"][table] = 0
    for record, fr in missing(table):
        if fr in words:
            writes.append((table, record, words[fr]))
            report["registers"][table] += 1
        else:
            report["untranslated"].append({"table": table, "id": record, "fr": fr})

if apply:
    with con:
        for table, record, english in writes:
            con.execute(f"insert into {table}_locales (name, _locale, _parent_id) values (?, 'en', ?)",
                        (english, record))
json.dump(report, open(report_path, "w"), ensure_ascii=False, indent=1)
p = report["people"]
print("écrits" if apply else "à écrire", "| personnes:", p["written"], "| registres:", report["registers"],
      "| personnes sans identifiant:", len(p["noWikidata"]), "| sans nom anglais:", len(p["noEnglishLabel"]),
      "| libellés non traduits:", len(report["untranslated"]))
