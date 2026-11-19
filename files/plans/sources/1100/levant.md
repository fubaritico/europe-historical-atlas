# The Levant, Cyprus and Mesopotamia in 1100 — the towns entered on 19/11

Entered by the historian on 19/11/2026, at the dev's request (_« il me faudrait des villes dans cette zone-là »_, the
Levant from Cilicia to Gaza; then _« une partie de la Mésopotamie »_, old towns and towns no longer standing). His
measure of the same day: enough towns for the map to read, not every attested place. Sorted and entered by me, no
agents. Working files: `files/resources/historien/1100/regions/levant-1100-research/` (git-ignored).

## Before

13 sheets of 1100 between Cilicia and Gaza (Antioch, Tarsus, Tripoli, Damascus, Tyre, Jerusalem…), 15 in Upper
Mesopotamia and Iraq (Baghdad, Basra, Kufa, Raqqa, Mardin, Amid…). No Aleppo, Homs, Hama, Acre, Jaffa, Mosul.

## The method

Wikidata (QLever): settlements of Syria, Lebanon, Israel, Palestine, Jordan, Cyprus and southern Turkey with an
English page (1,432), then towns of Iraq and the Jazira and ancient sites over the whole zone (447). The 500 best
documented were read (rendered English Wikipedia), every sentence dated 900–1105 extracted, and sorted by me: a
sentence proving the town alive at a stated date ≤ 1105. **51 entered** (places 13609–13659, sheets 13627–13677,
sources 5410–5460), checked by script (51/51).

**The holder**: the 1100 title of the country the map draws under the town, except where the accepted sentence
itself says otherwise:

| town | holder entered | why |
| --- | --- | --- |
| Latakia | Byzantine Empire (2) | Bohemond failed to take it from the Byzantines in 1099; Tancred took it in 1103 |
| Jableh | Banu Ammar of Tripoli (302) | captured by Banu Ammar after 1081 |
| Caesarea, Arsuf | Fatimid Caliphate (117) | taken by Baldwin I in 1101 — Muslim in 1100; the sentence says « Muslim », Fatimid is my reading |
| Anazarbus, Mopsuestia | Principality of Antioch (191) | annexed to Bohemond's principality in 1097–1098 |

**These six are in alert, on purpose** (`cities:alerts`, 46 alerts on 13,645 on 19/11): the map draws Latakia under
Antioch, Anazarbus and Mopsuestia under Byzantium, Caesarea and Arsuf under Jerusalem, and does not draw Tripoli.

## Where the map and the sources part — for the dev

- **The Lebanese and Palestinian coast is drawn Seljuk**: in 1100 Acre, Sidon, Beirut and Tyre were Fatimid (Acre
  taken in 1104, Beirut and Sidon in 1110), Tripoli and Jableh were the Banu Ammar's. Acre is entered under the
  country drawn (Seljuk), its sentence (Nasir Khusraw, 1047) saying nothing of its holder — **to verify** before
  moving it.
- **Tiberias is drawn Seljuk**; Tancred held Galilee from 1099 (a recollection, not read: to verify).
- **Apamea, Salamiyah**: Khalaf ibn Mula'ib, Ridwan of Aleppo — the base has no title for them; entered under the
  Seljuk sultan (105). Ridwan (Aleppo), Duqaq (Damascus), the Munqidhites (Shaizar) want their own titles.

## Refused

Kyrenia (« perhaps in 1100 »), Deir al-Balah (the sentence starts inside a parenthesis), Mersin (no date for the town
around 1100), the ancient sites dated only BCE (Ugarit, Megiddo, Babylon, Nineveh, Assur…), every town whose page
gives no sentence dated 900–1105 (Beirut, Sidon, Nicosia, Paphos, Famagusta, Samarra, Wasit…) — a second pass,
`/find-sources`, for those.
