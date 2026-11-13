# The Kingdom of Hungary and its neighbours in 1100 — the night run of 12–13 November 2026

At the dev's request (12/11 evening): *« toutes les villes de Hongrie de l'époque, tu les trouves, tu les saisis ; et
d'autres villes pour la Serbie, la Bosnie, la Croatie et la Roumanie »*, with the fortresses and the ruins (*« ça
pinpointe un territoire »*), run overnight — *« tu ne t'arrêtes pas au premier truc, rapporte ce que tu n'as pas pu
faire »*.

**Where it lives**: `files/resources/hungary-1100-research/` (git-ignored) — `work/collect.py` and `work/forts.py`
(Wikidata), `pool.json` (27,485 places), `wiki/` (37,033 articles: the Hungarian one and the country's own for each
place), `work/extract.py` (the first mention), `dates.json`, `work/build.mjs`, `lots/`, `BRIEF.md`, `reports/`,
`sources/`, `entered/`.

## How the places were chosen

Wikidata's localities of today's Hungary, Slovakia, Romania and Serbia (their own classes, plus village, town, city,
human settlement), Transcarpathia and Burgenland by their box, and every **castle, fortress, fort, castle ruin, hillfort,
fortification and ruins** of those countries and of Croatia and Bosnia (861) — less what the CMS already holds and what
the Adriatic round already studied. For each, the Hungarian article and the country's own; the first mention extracted
in Hungarian, Slovak, Romanian, Serbian, Ukrainian, German (the years of the Hegira in Ottoman registers set aside).

| | places read | strong lead (a mention dated ≤ 1150) | weak lead (a year only — noise, not researched) |
| --- | --- | --- | --- |
| Hungary | 3,374 | 438 | 327 |
| Slovakia | 3,091 | 554 | 116 |
| Romania | 13,911 | 271 | 110 |
| Serbia | 5,997 | 85 | 135 |
| Burgenland and its edge | 182 | 30 | 10 |
| Transcarpathia | 60 | 15 | 5 |
| Croatian fortresses | — | 16 | 6 |
| Bosnian fortresses | — | 6 | 14 |

**Researched**: the strong leads only — **1,415 places in 98 lots of 15** (88 fortresses), duplicates merged. The weak
tier, sampled, was road numbers, page numbers, seats in a hall: left out, listed in `dates.json`.

## Progress

**All 97 lots researched** (13/11 morning), 1,486 places with the county seats the lots added: **278 existed in
1100**, 1,076 first attested after it (not-yet), 132 unknown. Every quotation re-checked against its file by the lead:
7,862, of which 11 not found (lot hu-05's page images, re-taken from the OCR text at entry or left out).

| country | existed | not-yet | unknown |
| --- | --- | --- | --- |
| Hungary | 134 | 276 | 53 |
| Slovakia | 69 | 477 | 31 |
| Romania | 38 | 221 | 23 |
| Serbia | 21 | 57 | 14 |
| Croatian fortresses | 7 | 8 | 3 |
| Burgenland and its edge | 5 | 23 | 3 |
| Transcarpathia | 2 | 10 | 5 |
| Bosnian fortresses | 2 | 4 | 0 |

**Entered in the CMS** (only the « existed », batches A to L, records in `entered/<lot>.json`): about **200 places
created** with their 1100 sheet, about 20 existing sheets given lines (Nitra, Presbourg, Komárno, Tolna, Trenčín, Győr…),
about 240 sources. A county-seat castle goes on its town's sheet (Nitra Castle → Nitra, Bratislava Castle →
Presbourg), never a place of its own. The not-yet and unknown are not entered: listed under `refused` in each record.

**Places whose sources disagree with the map**: 98, most of them in the Galicia-Volhynia block (below); the others
are Holíč and Kopčany (Morava), northern Spiš and the Kysuce/Orava edge (sk-02, sk-04, sk-05), a few Serbian places of
the Morava valley (rs-03 to rs-06), four Croatian fortresses (hr-01), Toričan (ba-01), two Lower Austrian castles (at-02)
— each lot's `.md` gives the witnesses.

**Not done**: the BnF, JSTOR, Hungaricana (Györffy) and Arcanum were never searched — the night's agents had no
browser; each report's last section lists what to read there. The weak tier of leads (a year without a mention word)
was not researched. No Borovszky volume exists for Szepes, Sáros, Trencsén or Zólyom.

## For the dev — to do by hand, or to decide

- **Orphan sources to delete in the admin**: 905 « Bodrog » and 906 « Bodrogmonostor » (created for Bodrog's county
  seat, refused afterwards: no position on Wikidata).
- **Borsova's position** (Transcarpathia) taken from Hungarian Wikipedia's infobox (48°06′ N 22°44′ E), not from
  Wikidata, whose point falls on Dolha castle: an exception to the « Wikidata or refused » rule, sourced.
- **Karakó** (Q541500, the castle county of the Pápa plain, added by lot hu-09 as a county seat) is « existed » on two
  historians only (Pauler, the Magyar Katolikus Lexikon); its first charter read is of 1156 — « unknown » would be the
  stricter call.
- **« Nywyg » claimed twice**: the « predium Nywyg » of the Százd charter (c. 1067) is placed at Kisnémedi by lot hu-03
  and at Alsónémedi by lot hu-13, each on Wikipedia alone — one of the two sheets carries a wrong reading; to settle on
  Györffy (vol. IV, Pest county).
- **Kosovo's places without country** (Binač, Prizren, Lipljan): Wikidata gives both Kosovo and Serbia — which one the
  base shows is the dev's call.
- **A forgery to know**: the Veszprém chapter's « conscription of 1082 » was written in 1326–1327 (Pelczéder 2025,
  Karlinszky 2013, found by lot hu-11): Wikipedia's « 1082 » first mentions are not witnesses. **And a second**: the
  Zalavár abbey's charters dated « 1019 » and « 1024 », forged in the XIVth century (Karácsonyi 1891, Pauler 1899, the
  Magyar Katolikus Lexikon; lot hu-16).
- **Lists inside forged charters, my call to check**: the Zalavár « 1019 » charter (lot hu-17) and the Pécsvárad
  « 1015 » charter (lot hu-28, a forgery of the 1220s) are forgeries, but scholars trace their estate lists to older,
  authentic material (Szőke 2020 and 2021, Sümegi after Györffy: under Ladislaus, c. 1080s). The places named only
  there (Nagyrada, Esztergály; Szajk, Babarc, Apátvarasd, Zomba, Lovászhetény, Kölked; and, lot hu-27, Berkesd,
  Szilágy, Pereked, Nagypall, Hosszúhetény, Martonfa — Karácsonyi 1891 dates the list before 1077) are entered as existed, the
  strict reading (« unknown ») kept as a divergence on each. If you want the strict rule, they drop to unknown.
- **Places held by no polity**: Bârlad (Moldavia) existed in 1100, but its report attests only Cuman nomads, no
  polity — it was not entered. If places under the Cumans are to go in, the base needs a holder for them (the map's
  registry has `kimek-kipchak-confederation`, Q2477776, as a tribe; the Cumans are Q1035516): your call.
- **The Galicia-Volhynia anachronism**: the 1100 map puts Moldavia, Wallachia, Csík and Háromszék in
  `halych-volhynia-occupation` (Q239502, from 1199). Every lot there (ro-01, ro-03, ro-07, ro-12, ro-13, ro-15 to
  ro-18) found no witness for it: Hungary's frontier inside the Carpathians, Cuman nomads beyond, Byzantium in Dobruja.
- **Gömör castle** (Q12018119): added by lot sk-22 as a county seat on Beliana's dating (« first third of the
  XIth c. »), declined by lot sk-37 for want of a written record before 1198 (a charter Borovszky calls forged) —
  your call; the same holds for Hubovo and Figa, existed on Beliana alone.
- **Borovszky is not a witness for the Százd charter** (lot sk-25): his Zemplén volume puts Čerhov, Malá Tŕňa and
  Borša in it, and Hungarian Wikipedia copies him — Györffy's edition (DHA I 183–185) has none of them; entered
  not-yet, his claim kept as a divergence. Only Sirník is in the authentic part.
- **Existed on archaeology alone** (no text before 1100): Krásno (lot sk-16, a late-XIth-c. church dated by coins)
  and Kostoľany pod Tribečom (lot sk-15, graves with coins of Solomon and Ladislaus I) — both read through
  Wikipedia or a website, no excavation report; entered as existed, marked fragile. The strict call is « unknown ».
  The same for Prievidza (settlement finds of the X–XIIth c., Lukačka's *Lexikon* 2010) and Bojnice (Slovak
  Wikipedia and a tradition in Borovszky), lot sk-18, both first written in the Zobor charter of 1113.
- **The map disagrees with the sources at the Morava** (lot sk-08): Holíč and Kopčany, on the Morava's left bank,
  fall in `holy-roman-empire` on the 1100 map; Beliana (a Hungarian border castle at Holíč from the mid-XIth c.)
  and Cosmas (Coloman and Břetislav II meeting at Luczko/Hluk in 1099; the border on the Olšava in 1116) put the
  left bank in Hungary, and nothing read puts it under Moravia — the border to move to the Morava, in the
  Cartographer, by you.
- **The northern marches were a frontier, not settled ground** (lots sk-01 to sk-04, sk-07): Borovszky, after
  Karácsonyi, puts northern Zemplén beyond the border line (gyepű) of the kingdom's first century, « largely
  uninhabited » — the map's Hungary there is a claim over forest, which blur or hatching could show; your call.
  The same in Spiš (lot sk-05, Koszta, *Historický časopis* 57/2, 2009): border forest with a few border-guard
  settlements, no county before c. 1200; **northern Spiš** (Kamienka, Stará Ľubovňa) is put in the Polish land of
  Sącz until c. 1300 by Polish Wikipedia (after Nalepa, not read) and Sutarski — neither crown has a witness for 1100.
- **Lot order changed during the night**: the northern Slovak lots (forest marches of Orava, Liptov, Spiš, Turiec)
  gave nothing before 1100 — sk-01 to sk-04, 1 place in 60 — so they were moved to the end of the queue; the south of
  Slovakia, Hungary, Romania and Serbia first.
