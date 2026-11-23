"""Give the eleven events of 1100 their English title and description, and correct three event types' French labels
(CMS-495, the coder's translation of 2026-11-23).

    python3 -I write_events.py <base.db> [--apply]

Without --apply nothing is written; with it, one transaction: an English row is added to an event that has none, and
a type's label is corrected only while it still reads as it did. Run on a copy first, then on the base.
"""
import sqlite3
import sys

db = sys.argv[1]
apply = "--apply" in sys.argv[2:]
EVENTS = {
    1: ("Battle of Isbidh-rudh", "Near Hamadan, the Seljuk sultan Barkyaruq is defeated by his brother Muhammad, "
        "recognised again as sultan in Baghdad on 25 May."),
    2: ("Death of William Rufus", "The king of England dies in a hunting accident in the New Forest, from an arrow "
        "attributed to Walter Tirel."),
    3: ("Coronation of Henry I Beauclerc", "Three days after his brother's death, Henry is crowned king of England; "
        "he sets Robert Curthose aside and issues a Charter of Liberties."),
    4: ("Battle of Melitene", "Come to the aid of the Armenian governor Gabriel, Bohemond, prince of Antioch, is "
        "taken prisoner by the emir Danishmend; Tancred takes the regency."),
    5: ("Capture of Haifa", "With the support of the Venetian fleet, Tancred takes Haifa around 20 August."),
    6: ("Enthronement of the antipope Theodoric", "On the death of the antipope Clement III, Theodoric, bishop of "
        "Santa Rufina, is enthroned in Rome against Pope Paschal II."),
    7: ("Battle of Malagón", "The Almoravids defeat the Castilians near present-day Ciudad Real."),
    8: ("Ambush of the Nahr el-Kelb", "On his way to Jerusalem, Baldwin of Boulogne is attacked at the river "
        "crossing by the men of Duqaq of Damascus."),
    9: ("Capture of Barbastro", "Peter I of Aragon takes Barbastro."),
    10: ("Council of Poitiers", "William IX of Aquitaine disperses the prelates who were about to excommunicate King "
         "Philip I once more."),
    11: ("Coronation of Baldwin I, king of Jerusalem", "Baldwin of Boulogne, count of Edessa, succeeds his brother "
         "Godfrey of Bouillon and becomes the first king of Jerusalem; crowned in Bethlehem."),
}
# The dev's labels with a fault (CMS-495, said to him 2026-11-23): the French field as it reads, and as it should.
TYPES = {
    "Polithique - Révolution": "Politique - Révolution",
    "Polithique - Coup d'état": "Politique - Coup d'état",
    "Polithique - Accession au trone": "Politique - Accession au trône",
    "Conquest": "Conquête",
}
con = sqlite3.connect(db)
con.execute("pragma foreign_keys = on")
added = [e for e in EVENTS if con.execute(
    "select 1 from events_locales where _parent_id = ? and _locale = 'en'", (e,)).fetchone() is None]
fixed = [old for old in TYPES if con.execute("select 1 from event_types where name = ?", (old,)).fetchone()]
if apply:
    with con:
        for event in added:
            title, description = EVENTS[event]
            con.execute("insert into events_locales (title, description, _locale, _parent_id) values (?, ?, 'en', ?)",
                        (title, description, event))
        for old in fixed:
            con.execute("update event_types set name = ? where name = ?", (TYPES[old], old))
print("écrits" if apply else "à écrire", "| événements:", len(added), "| types corrigés:", len(fixed))
