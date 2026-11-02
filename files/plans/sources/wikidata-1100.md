# The Wikidata ids of the 1100 map — checked

> The historian, 2026-11-02 evening, at the dev's request (*"we must be sure the wiki id is the right one"*). « Tenue
> par » (CMS-335) keys a city's holder on the polity's Wikidata id, and the cities' panel (CARTO-193) compares it with
> the `wikidata` of the polity drawn under the city — so a wrong id in the map shows a right city in red.
>
> **Map read**: `years/1100/` (the Cliopatria import), `registry.json`, read-only, 2026-11-02. **The dev fixes the map
> himself**, in the Cartographer; nothing here is written into `years/`.
>
> **How each id was checked**: its Wikidata label, its inception (P571) and dissolution (P576) against 1100, its kind
> (P31: a state, a county, a principality — not a person, an event, a people, a region). The correction proposed is the
> id of the English Wikipedia article bearing the polity's name, checked the same way. 106 polities, 106 with an id;
> 37 flagged by the check, sorted below.

## Wrong item — the correction is ready (label and dates checked)

| polity (`id` in the map) | id in the map — what it is | correct id — dates on Wikidata |
| --- | --- | --- |
| Kingdom of France (`kingdom-of-france`) | Q207162 — Bourbon Restoration (1815) | **Q70972** Kingdom of France — 987–1791 |
| Byzantine Empire (`byzantine-empire`) | Q112039853 — Foreign relations of the Byzantine Empire | **Q12544** Byzantine Empire — 395–1453 |
| Old Kingdom of Norway (`old-kingdom-of-norway`) | Q202266 — Margaret I of Denmark, a person | **Q2196956** Kingdom of Norway (872–1397) |
| County of Barcelona (`county-of-barcelona`) | Q7038 — Girona, a city | **Q1233672** County of Barcelona — 801–1164 |
| County of Berga (`county-of-berga`) | Q15487 — Berga, a town | **Q956729** County of Berga — 988–1117 |
| County of Pallars Jussà (`county-of-pallars-jussa`) | Q12723 — the comarca | **Q2068891** County of Pallars Jussà — 1011–1192 |
| County of Pallars Sobirà (`county-of-pallars-sobira`) | Q12719 — the comarca | **Q2069303** County of Pallars Sobirà — 1011–1491 |
| County of Rosellón (`county-of-rosellon`) | Q13522657 — Roussillon, the province (1659) | **Q1541813** County of Roussillon — 812–1172 |
| Ghaznavid Empire (`ghaznavid-empire`) | Q12844800 — Ghaznavids, the dynasty | **Q249578** Ghaznavid Empire — 962–1187 |
| Uyunid Emirate (`uyunid-emirate`) | Q1448688 — Uyunid dynasty | **Q12229205** Uyunid Emirate — 1076–1238 |
| Principality of Polotsky (`principality-of-polotsky`) | Q200797 — Polatsak, the tribal land (from 780) | **Q517333** Principality of Polotsk — 900–1397 |

## Wrong item — the right polity is a question of history, for the dev

| polity (`id` in the map) | id in the map — what it is | what 1100 had | proposed |
| --- | --- | --- | --- |
| Norman England (`norman-england`) | Q200485 — the Norman conquest, an event | the Kingdom of England | **Q179876** Kingdom of England — 927–1707 |
| Norman Italy (`norman-italy`) | Q74011 — the Norman conquest of southern Italy, an event | two polities: the Duchy of Apulia and Calabria (1059–1130, **Q3715874**) and the County of Sicily (1071–1130, **Q1917014**) | split in two, or the duchy alone — *de mémoire*: the duke of Apulia was the count of Sicily's suzerain |
| Viking settlements (`viking-settlements`) | Q12567 — the Vikings, a people | to see on the map where it is drawn | none yet |
| Vermandois (`county-of-vermandois`), Maine (`county-of-maine`) | the region / the province, no dates | the counties | no county item found under their names — to search |

## Dates that do not reach 1100 — an anachronism or a wrong item

| polity | id | Wikidata's dates | reading |
| --- | --- | --- | --- |
| Taifa of Tortosa | Q605930 | 1010–**1099** | gone a year before; Tortosa then in the Taifa of Zaragoza (**Q33061**, 1018–1110) — *de mémoire*, to check |
| Hamdanid Emirates | Q837187 | ends **1004** | a century gone — to check what the map draws there |
| Novgorod Republic | Q151536 | from **1136** | in 1100 Novgorod is a principality under Kiev — *de mémoire*; the item is right, the name and status are not for 1100 |
| Rostov-Suzdal | Q83546 | Vladimir-Suzdal, from **1125** | Wikipedia redirects Rostov to it; no separate item found |
| Halych-Volhynia occupation | Q239502 | Galicia–Volhynia, from **1199** | in 1100 Halych and Volhynia are separate — *de mémoire* |

## Softer — the dynasty or the land for the state; acceptable until a better item is found

Najahid, Khwarezmid (Anushtegin, from 1077), Ziyadid, Zurayid, Chauhan, Paramara, Habbari, Chaulukya — the dynasty's
item stands for the state, which most of them have no separate item for. Kashmir, Tibetans, Celtic Britons (`brythons`),
Jämtland — a land or a people. **Not wrong for the cities' check as long as the city's holder uses the same id.**

## False alarms — right items the check flagged

County of Toulouse (Q1334322, 778–1271), County of Nevers (Q2070440, 801–1789), Principality of Peremyshl (Q4350658,
1031–1124), Principality of Pereyaslavl (Q1261908, 900–1239): right, flagged only because their kind is not in the
check's list.

## Not checked

The 69 polities the check did not flag are only as good as the check: a right label and dates bracketing 1100. An item
that is a state of the right period under the wrong name would pass. `years/1200/` is not checked yet.
