# The cities of 1100 — a first list, to be read by the dev

> Drawn up 2026-10-29, late evening, for ATLAS-295 (`cities.md`). **A proposal, not data**: nothing is entered in the
> CMS until the dev has read it. Positions are not here — the CMS's Wikidata lookup fills them at entry.

**How it was made**

- **The capitals**: the seat of each sovereign of `years/1100/registry.json` (70 sovereigns, tribes left out), as far as I
  know it — **from memory**, not checked; *uncertain* where two seats compete or the seat moved around 1100.
- **The populations**: Bairoch, Batou & Chèvre (1988), through the transcription
  [JakeRuss/bairoch-1988](https://github.com/JakeRuss/bairoch-1988), in **thousands**, years 1000 and 1200 — the book has
  no 1100. **Found.** A reference to rank the cities, never figures we publish (*« any and all copyright to this data
  belongs to Bairoch, Batou, and Chèvre »*).
- **Bairoch covers Europe only**: Constantinople, and everything in the Levant, Egypt, Mesopotamia and Persia, are
  ranked **from memory**.
- **The orders** (decision 3 of `cities.md`): **capital**; **large city** = about 30 thousand or more around 1100;
  **city** = the rest worth showing in a first pass. **Superseded the same evening by decision 4** (importance is not
  population): the two lower orders were ranked by population alone and are to be re-read for their role — a
  religious seat, a market, a symbol.

## Capitals — shown from afar

| city | seat of | 1000 → 1200 | note |
| --- | --- | --- | --- |
| Constantinople | Byzantine Empire | — | the largest city of the map; from memory |
| Rome | State of the Church | 35 → 35 | |
| Paris | Kingdom of France | 20 → 110 | the Capetians also held court at Orléans (— → 27) — *probable* |
| Winchester / London | Kingdom of England | 15 → 20 / 25 → 25 | **uncertain**: the treasury at Winchester, the crowning at Westminster (Henry I, August 1100) |
| Toledo | Kingdom of León and Castile | 37 → 35 | Alfonso VI's seat after 1085; León (15 → 40) the old one — *probable* |
| Huesca | Kingdom of Aragon and Navarre | — | taken in 1096 — **uncertain** (Jaca before) |
| Barcelona | County of Barcelona | 5 → — | |
| Marrakesh | Almoravids | — | founded around 1070 — *probable* |
| Mahdia | Zirid Emirate of Ifriqiya | — | *probable* |
| Béjaïa | Hammadid Kingdom of Bejaia | — | moved from the Qal'a around 1090 — *probable* |
| Cairo | Fatimid Caliphate | — | |
| Jerusalem | Kingdom of Jerusalem | — | Baldwin I crowned there, 25 December 1100 — the event of `events.json` |
| Antioch | Principality of Antioch | — | |
| Edessa | County of Edessa | — | |
| Konya | Seljuk Sultanate of Rûm | — | after the loss of Nicaea, 1097 — **uncertain** |
| Isfahan | Seljuk Empire | — | in civil war in 1100 — **uncertain** |
| Kutaisi | Kingdom of Georgia | — | Tbilisi is Muslim until 1122 — *probable* |
| Kiev | Principality of the Kievan Rus | 45 → 40 | |
| Novgorod | Republic of Novgorod | 18 → 30 | |
| Esztergom | Kingdom of Hungary | — | Székesfehérvár the other royal seat — **uncertain** |
| Płock | Kingdom of Poland | — | Władysław Herman's seat; Kraków (— → 10) the old one — **uncertain** |
| Roskilde | Kingdom of Denmark | — | *probable* |
| Nidaros (Trondheim) | Kingdom of Norway | — | *probable* |
| Venice | Republic of Venice | 45 → 70 | |
| Pisa | Dominions of Pisa | — | |
| Naples | Duchy of Naples | 30 → 30 | |

**No capital marked**: the **Holy Roman Empire** — an itinerant court (Aachen crowns, Speyer buries, Regensburg and Goslar
host); **Sweden** — no seat I can name with any confidence. The small sovereigns of Ireland, Wales and the Caucasus are
left for a second pass.

## Large cities — with the vassals (0.45)

| city | 1000 → 1200 | note |
| --- | --- | --- |
| Córdoba | 450 → 60 | the caliphate fell in 1031; around 1100 well below its peak, still among the largest |
| Palermo | 350 → 150 | Norman since 1072 |
| Seville | 90 → 80 | |
| Granada | 26 → 60 | |
| Thessaloniki | 40 → 30 | |
| Regensburg | 40 → — | |
| Cologne | 21 → 50 | |
| Baghdad | — | the caliph's city under the Seljuks — from memory |
| Damascus | — | from memory |
| Alexandria | — | from memory |
| Aleppo | — | from memory |

## Cities — close up (0.8)

| city | 1000 → 1200 |
| --- | --- |
| Salerno | 50 → — |
| Mainz | 30 → 25 |
| Speyer | 25 → 30 |
| Worms | 20 → 28 |
| Genoa | 15 → 30 |
| Verona | 20 → 33 |
| Lyon | 20 → 22 |
| Tours | 20 → 20 |
| Chernigov | 20 → 25 |
| Smolensk | 1 → 40 |
| Ghent | 8 → 25 |
| Bruges | 12 → 25 |
| Prague | 10 → 10 |
| Zaragoza | 17 → 21 |

## What reading it should settle

- A capital wrong or missing — the uncertain ones above are the candidates.
- Whether a small sovereign's seat (Pisa, Naples, Ragusa, Amalfi) is a **capital shown from afar**: six points crowd Italy
  at zoom 0. My proposal: keep them capitals, and let the names that find no room fall to a point (decision 1).
