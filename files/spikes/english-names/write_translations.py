"""Give every place, territory and person still without an English line the coder's translation (CMS-495).

    python3 -I write_translations.py <base.db> <translations.json> [--apply]

A place Wikidata names in no English keeps its own name in English — a village's name is not translated — unless
`placesOverride` gives a form (an abbey, a castle); a territory and a person take the coder's translation. Three
houses entered under their Wikidata id get their French name. Without --apply nothing is written; with it, one
transaction, additions only: a record that has an English line already is left as it is. A record of the lists with
no translation stops the run before anything is written. Run on a copy first, then on the base.
"""
import json
import secrets
import sqlite3
import sys

db, path = sys.argv[1], sys.argv[2]
apply = "--apply" in sys.argv[3:]
t = json.load(open(path))
con = sqlite3.connect(db)
con.execute("pragma foreign_keys = on")


def missing(table):
    """The records of a register with no English line, and their French name."""
    return con.execute(
        f"select r.id, r.name from {table} r where not exists (select 1 from {table}_other_names o "
        "where o._parent_id = r.id and o.language = 'en') order by r.id").fetchall()


writes = []
for record, name in missing("places"):
    writes.append(("places", record, t["placesOverride"].get(str(record), name)))
for table, key in (("territories", "territories"), ("people", "people")):
    for record, _ in missing(table):
        form = t[key].get(str(record))
        if form is None:
            sys.exit(f"{table} {record}: no translation — nothing written")
        writes.append((table, record, form))

if apply:
    with con:
        for record, french in t["peopleFrench"].items():
            con.execute("update people set name = ? where id = ?", (french, int(record)))
        for table, record, form in writes:
            (last,) = con.execute(f"select coalesce(max(_order), 0) from {table}_other_names where _parent_id = ?",
                                  (record,)).fetchone()
            con.execute(f"insert into {table}_other_names (_order, _parent_id, id, language, form) "
                        "values (?, ?, ?, 'en', ?)", (last + 1, record, secrets.token_hex(12), form))
counts = {table: sum(1 for w in writes if w[0] == table) for table in ("places", "territories", "people")}
print("écrits" if apply else "à écrire", counts)
