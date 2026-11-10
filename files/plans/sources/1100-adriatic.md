# The Adriatic in 1100 — the holder of every coastal town

Research of 2026-11-10, at the dev's request (« toutes les villes que Venise tenait en 1100 », then every town of the
Adriatic shores). The same method as `1100-italy.md`, one change: the candidates are not filtered by a population of
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

## Leads to read in the browser

HRČAK (the Croatian journals portal) refused every script: Ančić 1998 and 2011 on the decade 1091–1102, Šišić on
Coloman and Dalmatia. Also Stephenson 2000 (pp. 197–201), Budak 2018, Kandler's *Codice diplomatico istriano*, Soustal &
Koder's *Tabula Imperii Byzantini* 3 (Epirus and Corfu villages), Ducellier on Albania (Persée blocks scripts). Each
report lists its own at its end.
