"""Write Wikidata's English label as the English name of each place and territory that has none (CMS-495).

    python3 -I write_names.py <base.db> <labels.json> <report.json> [--apply]

Without --apply nothing is written: the counts are printed and the report lists what would be written. With --apply,
everything is written in one transaction — all or nothing. A name already entered is never replaced. A place gets
its English row in `places_locales`; a territory gets an « en » line in its table « Le nom dans les autres langues »
(`territories_other_names`), after its existing lines. Run on a copy first (`sqlite3 ".backup"`), then on the base.

The report holds what is left to the historian: the records with no Wikidata id, and the ids Wikidata names in no
English form.
"""
import json
import secrets
import sqlite3
import sys

db, labels_path, report_path = sys.argv[1], sys.argv[2], sys.argv[3]
apply = "--apply" in sys.argv[4:]
labels = json.load(open(labels_path))["labels"]
con = sqlite3.connect(db)
con.execute("pragma foreign_keys = on")


def french(table, parent):
    row = con.execute(f"select name from {table} where _parent_id = ? and _locale = 'fr'", (parent,)).fetchone()
    return row[0] if row else None


places = con.execute(
    "select p.id, p.wikidata from places p where not exists "
    "(select 1 from places_locales l where l._parent_id = p.id and l._locale = 'en') order by p.id").fetchall()
territories = con.execute(
    "select t.id, t.wikidata from territories t where not exists "
    "(select 1 from territories_other_names o where o._parent_id = t.id and o.language = 'en') order by t.id").fetchall()

report = {"places": {"written": [], "noWikidata": [], "noEnglishLabel": [], "notAsked": []},
          "territories": {"written": [], "noWikidata": [], "noEnglishLabel": [], "notAsked": []}}


def sort(kind, rows, table):
    ready = []
    for record, q in rows:
        entry = {"id": record, "wikidata": q, "fr": french(table, record)}
        if not q:
            report[kind]["noWikidata"].append(entry)
        elif q not in labels:
            report[kind]["notAsked"].append(entry)
        elif not labels[q]:
            report[kind]["noEnglishLabel"].append(entry)
        else:
            entry["en"] = labels[q]
            report[kind]["written"].append(entry)
            ready.append(entry)
    return ready


place_rows = sort("places", places, "places_locales")
territory_rows = sort("territories", territories, "territories_locales")

if apply:
    with con:
        for entry in place_rows:
            con.execute("insert into places_locales (name, _locale, _parent_id) values (?, 'en', ?)",
                        (entry["en"], entry["id"]))
        for entry in territory_rows:
            (last,) = con.execute("select coalesce(max(_order), 0) from territories_other_names where _parent_id = ?",
                                  (entry["id"],)).fetchone()
            con.execute("insert into territories_other_names (_order, _parent_id, id, language, form) "
                        "values (?, ?, ?, 'en', ?)", (last + 1, entry["id"], secrets.token_hex(12), entry["en"]))

json.dump(report, open(report_path, "w"), ensure_ascii=False, indent=1)
for kind in ("places", "territories"):
    r = report[kind]
    print(kind, "| écrits:" if apply else "| à écrire:", len(r["written"]), "| sans identifiant:", len(r["noWikidata"]),
          "| sans nom anglais:", len(r["noEnglishLabel"]), "| pas encore demandés:", len(r["notAsked"]))
