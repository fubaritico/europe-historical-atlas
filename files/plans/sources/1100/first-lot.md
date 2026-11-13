# The atlas's first lot of 1100 — who held each city, sourced at last — 2026-11-12

At the dev's request (12/11): *"the first 120–130 cities added to be shown in the atlas have no holder sourced — look
at that lot too"*. The base held, for 1100, **98 sheets with no holder line** (96 of them shown in the atlas): the major
cities entered before the method existed — Paris, London, Constantinople, Kiev, Baghdad, Jerusalem… Each had an
importance, no holder and no source.

**Where it lives**: `files/resources/first-lot-1100-research/` (git-ignored) — `BRIEF.md`, `lots/` (built by
`work/lead/build.mjs` from a read-only export of the 98 sheets, each city given the polities the dev's 1100 map puts it
in), `reports/<lot>.md|json`, `sources/<lot>/`. Ten lots by historical area, one research agent each under
`/find-sources`; **427 quotations re-checked by the lead against the saved texts, none missing** — three of the
Scandinavian ones, read by the agent on the PDF's page images, are entered in the exact form of the file's text layer
(its OCR misreadings kept), so that every quotation in the base is found word for word in a file.

| | cities | holder with ≥ 2 independent witnesses | with one | none |
| --- | --- | --- | --- | --- |
| all lots | 98 | 82 | 12 | 4 |

The four with no holder named: **Derbent** and **Nakhchivan** (Encyclopaedia Iranica refused the scripts — its articles
are to read in the browser), **Gray** (the count of Burgundy, but which one), **Ottaviano** (a leftover of the Italian
research; nothing medieval found). 16 marked fragile.

**In the CMS since 2026-11-12** (`/enter-in-cms`, four agents, brief `ENTRY.md` of the research folder, the record of each
lot in `entered/`): the 98 sheets updated — holder, QID and lines — none created; Ottaviano left untouched (no holder);
sources 737–890. The holder that changes within 1100 is the report's most probable, both readings kept as lines. One
duplicate source left for the dev to delete in the admin (762, Le Strange, its twin 755 is cited). Sent to the code
instance for its read-only check.

## Holders that change within 1100 — the dev's open question, which day the map shows

The question first asked on Barbastro (taken 18 October 1100) comes back on a dozen cities:
- **Jerusalem**: Godfrey dies 18 July 1100; Baldwin I anointed king on Christmas Day.
- **Edessa**: Baldwin of Bourcq from October 1100. **Antioch**: Bohemond captured c. July 1100, Tancred from March 1101.
- **Rouen**: pledged to William Rufus until his death (August 1100); Robert Curthose takes the duchy back in September.
- **Volodymyr**: taken from Davyd Igorevich at the council of Uvetichi, 30 August 1100.
- **Prague**: Duke Bretislav II dies 22 December 1100; Bořivoj II enthroned on Christmas Day.
- **Baghdad**: the Friday sermon passes from Berk-Yaruq to Muhammad Tapar on 25 May 1100.
- **Cologne**: the see vacant from November 1099, Frederick I named in January, consecrated in November 1100.

## What the sources say against the 1100 map — readings, not decisions

1. **Ireland** — Dublin under Muirchertach Ua Briain of Munster since 1094 (the map: Kingdom of the Isles; Norway only in
   1102); Cork, Waterford, Limerick (Limerick his seat) in Munster (the map: nobody, or « Viking settlements »); Armagh an
   abbey city under the king of Ailech (the map: nobody).
2. **The Rus'** — Novgorod and Pskov under a prince installed from Kiev, Mstislav (the republic dates from 1136); Murom and
   Ryazan the Sviatoslavichi's share of the Chernigov lands (the separate principality from 1127, its seat Murom);
   **Vladimir** dated to 1108 by the archaeologist Voronin — to drop from 1100 or to keep as a settlement of Rostov-Suzdal,
   not Ryazan; Halych in Vasilko's Terebovl, not Peremyshl; Tmutarakan most probably Byzantine (the map: nobody).
3. **Anatolia and the Levant** — Caesarea of Cappadocia and Ancyra under the Danishmendids (the map: the « Armenian kingdom
   of Cilicia », a kingdom only from 1198, and the sultanate of Rum); Tyre Fatimid 1089–1124 (the map: nobody); Tripoli
   under the Banu Ammar (the map: the Great Seljuks); Amid under the Inalids (the map: the Great Seljuks).
4. **Iran** — Kerman under the Seljuks of Kerman, a branch of their own, not the Great Seljuks.
5. **The west** — Palma an independent taifa of Majorca under Mubashshir (the map: the taifa of Denia); Reims the
   archbishop's, county included, since 940 (the map: the county of Champagne); Rouen as above.
6. **Gdańsk** under the Pomeranians' own princes, outside Poland (the map: nobody).
7. **Constantinople** falls ~1.1 km outside the drawn `byzantine-empire` — a hole in the drawing at the Golden Horn, not a
   reading.
8. **Less certain than the map shows** — Mecca and Medina (which caliph the sharifs recognised in 1100 is not settled; the
   map: Fatimid); Visby (Gotland self-governing, paying tribute to the Swedish king — hatching rather than a colour);
   Damascus and Raqqa under the Seljuks by a nominal tie only.

## Faults of the map's registry, read on Wikidata by the agents — the dev's map, to correct by him

- `norman-england` carries **Q200485** (« Norman conquest of England », an event); the kingdom is **Q179876**.
- `principality-of-polotsky` carries **Q200797** (the city of Polotsk); the principality is **Q517333**.
- `principality-of-rostov-suzdal` carries **Q83546** (the Grand Principality of Vladimir, from 1125).
- `kingdom-of-poland` carries **Q577867**; in 1100 Poland was a duchy, **Q108084610**. No `duchy-of-bohemia` in the
  registry — Prague's tier below the Empire is missing.
- `kingdom-of-arles` is given the king of France as suzerain; the sources read put it under the emperor from 1032 — the
  answer to the dev's open question on Arles.

## Leads to read in the browser

Encyclopaedia Iranica (Barkiaroq, Shaddadids, Basra, Kerman, Darband, Nakjavan), Duffy 1992 in *Ériu* (Dublin's
under-king), the Great Russian Encyclopaedia, Mortel 1991 (Medina), Bryer 1970 (Trebizond's Gabras), the Regesta Imperii
and *Gallia christiana* (the archbishops), two local histories of Gray on Gallica. Each report lists its own.
