# The Adriatic in 1100 — the holder of every coastal town — CARTO-417

Research of 2026-11-10, at the dev's request (« toutes les villes que Venise tenait en 1100 », then every town of the
Adriatic shores). The same method as `italy.md`, one change: the candidates are not filtered by a population of
20,000 — on the eastern shore the towns of 1100 are villages today (Osor, Nin, Novalja).

**How the candidates were chosen** (Wikidata, not a search engine): every settlement within 30 km of the Adriatic
(Natural Earth's land outline, `files/spikes/fetch-land/out/ne_10m_land.geojson`), at least 1,000 inhabitants today,
plus every Montenegrin settlement of that strip (the dev), plus **one town per island** — the one a source attests in
1100, not today's largest. Neighbourhoods, monuments and duplicates removed by their Wikidata type. Wikidata's own dates
were too sparse to filter on (13 dated places of tens of thousands). The Aegean islands are listed (65) and left for
later (the dev: « pas en 1100, mais pour plus tard »).

**Where it lives**: `files/resources/adriatic-1100-research/` (git-ignored) — `BRIEF.md`, `candidates.json`, `lots/`,
`reports/<lot>.md|json`, `sources/<lot>/` (every text read), `ENTRY.md` and `entered/` for the CMS. 26 lots, one research
agent each under `/find-sources`; **2,231 quotations re-checked by the lead against the saved texts, none missing**
(`work/lead/check.py`).

| | places | existed | not yet | unknown |
| --- | --- | --- | --- | --- |
| all lots | 393 | 74 | 115 | 204 |

Only the 74 that existed go into the CMS, like Italy. « Unknown » is mostly a village no text names before the 14th
century — kept in the reports, not entered.

**In the CMS since 2026-11-10** (`/enter-in-cms`, four agents, the record of each lot in `entered/<lot>.json`): 70
places created (ids 707–776), 69 sheets of 1100 created and 3 updated (Kotor, Bar, Ulcinj), 90 sources (579–669), every
one cited by a line, no duplicate (checked read-only). Two towns that existed have no 1100 sheet, no source naming
their holder across 1100: **Himarë** (the place exists, 715) and **Biševo** (neither place nor sheet). The date rule as
the agents applied it: a quotation is a 1100 line when the holding it states runs through 1100 — a span, or a tenure
begun earlier and not ended before 1100 (Muggia given to the patriarch in 931, Venice's protection from May 1097); a
single event at another date is left out — **decided by the dev the same evening** (« pour l'instant, à moins qu'on
trouve d'autres sources ») and written into `/enter-in-cms`.

## What the sources say against the 1100 map — readings, not decisions

The dev decides in the Cartographer. The divergent readings of each town are in its lot's report.

1. **No Kingdom of Croatia on the map.** Between King Petar's death (1097) and Coloman's coronation (1102) the sources
   read give Croatia no king, Coloman leaving it in 1099; Šišić (1925, pp. 634–635) says no document survives for those
   years. The map's `kingdom-of-hungary` over inland Croatia is one reading (Coloman's conquest of 1097, the 1098
   agreement with Venice); the Kingdom of Croatia (Q858841) is the other, close — a case for hatching, not a new colour.
2. **Istria is imperial, not Venetian.** Poreč, Buje, Tar, Pula, Galižana — and Rijeka, Kastav on the Hungarian side —
   belong to the March of Istria (Holy Roman Empire), the bishops of Poreč and Pula as lords; Venice's oaths come in
   1145–1150. Piran's land too (Lucija, Seča): Venice took Piran in 1283.
3. **Dalmatia's towns are Venetian, for Byzantium, from May 1097 to 1105.** Split (the map: Hungary) swore to doge Vitale
   Michiel in 1097 (Rački's *Documenta*); Trogir and Zadar too, both off the drawn coast. Hungary takes them in 1105.
4. **The islands are divided.** Krk, Osor (Cres), Rab: Venice. Brač, Hvar, Vis: the Croatian kingdom in the Croatian
   encyclopaedia, Venice only in Šišić's reading. Korčula and Lastovo: Zachlumia under Bodin of Duklja, not Venice.
5. **Biograd** (the map: Venice) is the Croatian royal town where Coloman was crowned in 1102; Venice takes it 1115–1125.
6. **Mestre** (the map: Venice) is Treviso's, in the Kingdom of Italy, until 1337.
7. **Hum and Herzegovina.** The map's Serbia over Vrgorac, Ploče and the Grude villages: no witness; Croatia (or Hungary)
   west of the Trebižat–Neretva line, Bodin's Duklja over Hum. Northern Albania's Vau i Dejës and Shëngjin: Duklja or
   Byzantium, never Serbia.
8. **The drawn coast is short** in many places: Murano, Bibione, Rab town, Zadar, Trogir, Hvar town, Makarska, Budva and
   the coast to Petrovac, Kassiopi on Corfu — all inhabited in 1100, all outside every polity.
9. **Agree with the map**: Slovenia's Goriška (the Empire, under the patriarch of Aquileia), Montenegro (Duklja), Albania
   and Epirus (Byzantium), Corfu (Byzantium).

**A fault of the map's registry**: `byzantine-empire` carries Q112039853, which Wikidata labels « Foreign relations of
the Byzantine Empire »; the empire is Q12544.

## The hinterland — inland Croatia and Bosnia (2026-11-12)

The dev's rule for it (10/11): « des villes, des villes » — wide, by the date of first mention, not by population.
**How the candidates were chosen**: the 13,358 localities of Croatia and Bosnia within the research's Wikidata pool not
yet studied; their 46,360 hr/bs/sh/sr Wikipedia articles read by script (`inland/extract.py`) for a date before 1150 or
a century up to the XIIth near a word of mention (« prvi put se spominje », « pomen », « povelja »…); census tables, URLs
and altitudes removed; 332 kept, of which 52 antique-only (Roman sites) left for later, and 21 present-day quarters of
which the 13 dated ones kept (Kaptol, Trsat, Spinut…). Lots by today's region (`work/inland-lead/build.mjs`), each
place given the polity the dev's 1100 map puts it in; the brief `BRIEF-INLAND.md` added the župa of each district and
its seat when attested by 1100. **25 lots, 293 places + 15 župa seats added; 4,844 quotations (coast included)
re-checked against the saved texts, none missing** (`work/inland-lead/check.py`).

| | places | existed | not yet | unknown |
| --- | --- | --- | --- | --- |
| all lots | 307 | 67 | 155 | 85 |

**The extraction was a weak guide**: its sentence named a real attestation before 1150 for 50 places of 292 — the rest
were population figures, Hijri years, road numbers, a church or a župa rather than the village. It found the places;
the books decided. 125 entries disagree with the map; 139 are marked fragile (mostly a first date on Wikipedia alone —
no holder rests on Wikipedia alone).

**In the CMS since 2026-11-12** (`/enter-in-cms`, four agents, brief `ENTRY-INLAND.md`, the record of each lot in
`entered/inland-*.json`): 59 places created (ids 777–835) with their 1100 sheets (768–826), 5 existing sheets given
lines (Trebinje, Sirmium, Trogir, Ston, Imotski), 67 sources (670–736). Settled by the lead before entry: Tuzla entered
once (two lots held it), Trogir not re-created (the coast's), the Sisak lot's count is 1 (its closing line said 3), and
the Zadar lot's Vrana, Sikovo, Šopot take the Kingdom of Croatia like the other lots on the same witnesses, Hungary as
their other line. **Refused**, no position on Wikidata: Desnik (Q138834608) and Mokro (Q63341768). Checked read-only by the code
instance the same day: clean. The lines dated 1102 kept on the county of Knin's sheets (Knin joining the
Croatian-Hungarian kingdom, Coloman's march) stay — **the dev, 2026-11-12**: a quotation at another date is a line when
it proves, supports or corroborates the holding of 1100; written into `/enter-in-cms`.

**The antique round (2026-11-12)**: the 52 antique-only places and 10 Roman sites set apart, in 5 lots (`antique-*`,
same brief plus three points: was a settlement still there in 1100, an abandoned site is « not yet », a medieval
successor already researched is named, not redone). Of 62: **3 new places that existed** — Koljane (a 9th-century
Old-Croatian basilica), Caska (the medieval Kessa on Pag, under Venice) and Barban (added, a commune seat; its 740 still
to be tied to a document); 2 that existed are already in the base under their medieval name (Aenona = Nin, Tragourion =
Trogir). Salona, Narona, Issa, Epidaurum, Delminium, Burnum, Tarsatica, Nesactium, Fulfinum: destroyed and abandoned
long before 1100, their successors already researched except Vid (Narona). Most « ancient dates » of the extraction were
noise (gazette numbers, phone codes). **To check**: Kobler (1896) says the authentic notices of Rijeka begin only in the
XIIIth century, which weakens the date the coast lot used for Rijeka's existence in 1100.

### What the sources say against the 1100 map — readings, not decisions

1. **Slavonia is Hungarian directly, not a Croatian vassal.** Between the Drava and the Gvozd — Zagreb, Kaptol, Sisak,
   Čazma, Požega, the strip south of the Kupa, north-western Bosnia (Prijedor, Gradiška, Dubica) — every lot puts the
   land under the king of Hungary, outside the Croatian kingdom: Ladislaus's letter of 1091 (« Selauoniam iam fere totam
   acquisiui »), Felician's charter of 1134, Andrew II's of 1217, Thomas of Split, Šišić 1925. The other reading, kept:
   Šišić's unproven Croatian reoccupation up to the Drava before 1102. The map's `kingdom-of-croatia` over this ground
   is the opposite of the coast's finding below.
2. **South of the Gvozd, the Kingdom of Croatia — without a king, 1097–1102.** Lika, Krbava, Gacka, Knin, Bribir, the
   Zagora, Livno–Duvno–Glamoč, Pliva, Uskoplje, the Vrbanja valley: Croatian župas, each with its župan. Hungary over
   them is the second reading (Coloman's conquest of 1097; he left in 1099); southern Croatia goes to Coloman in 1102
   (Fine), the first Hungarian act on Livno is of 1103. One lot (Zadar's) ranks Hungary first on the same witnesses — to
   harmonise before entry. The map's Hungary over Croatia: a case for hatching (as the coast already said).
3. **Upper Bosnia is Dukljan, with its own knez — never Serbian.** The Lašva, Lepenica, Visoko, Sarajevo, Zenica: Bodin
   took Bosnia c. 1082–85 and set knez Stephen over it; Šišić 1944 has Bosnia in the Dukljan kingdom « from 1090 to
   1102 », Fine has it on its own after 1089–91. Its Wikidata item: **Q25340956**, « Bosnia (early medieval) », 838–1154
   (the Banate, Q3627069, starts in 1136). No witness puts any of it under Raška: **the map's Serbia over central and
   northern Bosnia rests on nothing read.**
4. **Usora, Soli and the Bosnian Posavina: undetermined.** Klaić infers Hungary from c. 1073 (with Srijem); Fine's dowry
   of c. 1130 (« probably northeastern Bosnia ») implies Serbia before. Tuzla (Soli, the Salines of Porphyrogenitus) is
   Serbian only weakly. The Drina was the Bosnia–Serbia border (the Chronicle of the Priest of Duklja, Kinnamos).
5. **Srijem is Hungarian from 1071 to 1126** (Fine, Šišić, Klaić) — Vinkovci, Vukovar, Sirmium; no witness makes it
   Byzantine in 1100.
6. **Hum is its own** — Blagaj (Porphyrogenitus' Bona), Ston, Mljet, Popovo, Široki Brijeg: three readings kept, Hum's
   princes after 1089–91 (Fine), Bodin's Duklja, the Croatian rulers until 1102; Serbia only from the mid-XIIth century.
   Travunia (Trebinje, Konavle) is Dukljan. Ljubuški and the lower Neretva: Croatian.
7. **Trsat, Sušak, Grobnik, Kukuljanovo are Croatian Vinodol**, not the Empire (the Rječina as border, Benussi and the
   charter of 1260 he quotes).
8. **Split's land and Trogir are the communes', under Venice's protection since May 1097** — Sućidar, Spinut, Žnjan
   (the map: Croatia under Hungary), Trogir (off the map).
9. **Agree with the map**: inland Istria (the March of Istria, margrave Poppo 1090–1101; lords the bishops of Pula,
   Poreč, Novigrad, Ulrich II of Weimar-Orlamünde) — with Kloštar (the abbey of St Michael at Lim) and Savudrija
   (attested 872) off the drawn ground, and east Istria (Plomin) Croatian until 1091–1102 as the other reading; Osijek
   and Baranja, Bjelovar, Koprivnica, Varaždin (Hungary; Međimurje weak).
10. **Krk**: Klaić (1901) reads it Croatian from 1059 and Coloman's soon after 1100, Venice only c. 1118 — kept against
    the coast lot's Venice.

## Leads to read in the browser

HRČAK (the Croatian journals portal) refused every script: Ančić 1998 and 2011 on the decade 1091–1102, Šišić on
Coloman and Dalmatia. Also Stephenson 2000 (pp. 197–201), Budak 2018, Kandler's *Codice diplomatico istriano*, Soustal &
Koder's *Tabula Imperii Byzantini* 3 (Epirus and Corfu villages), Ducellier on Albania (Persée blocks scripts). Each
report lists its own at its end.
