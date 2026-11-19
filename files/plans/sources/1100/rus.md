# The Rus' in 1100 — the towns attested before 1105

Entered by the historian on the night of 18–19/11/2026, alone (no agents: no number was given), as the third point of
the order of 17/11 (« un peu de Russie »). The working files were deleted on 19/11 at the dev's
request; what stays is this note, the dated sentences of the 33 places in `files/resources/historien/extraits/`, and
the reads in `registre/reads.jsonl`.

## What the base held before

~70 sheets of 1100 in Russia, Ukraine and Belarus (Kiev, Novgorod, Chernigov, Polotsk, Smolensk, Rostov, the Crimean
forts, Volga Bulgaria…), each under a title of 1100 already in the base: Sviatopolk II (172, 116), Davyd Sviatoslavich
(139), Vladimir Monomakh (155, 170), Oleg Sviatoslavich (252), Mstislav (274), Vseslav (211), Volodar (315), Vasilko
(217), Davyd Igorevich (379).

## The method

1. **Candidates**: Wikidata (QLever) — places in RU/UA/BY with a first written record (P1249) or an inception (P571)
   from 800 to 1105, with a Russian Wikipedia page: 282, of which 176 not in the base and farther than 1.5 km from a
   sheet of 1100. Then 32 chronicle towns Wikidata gives no date to, looked up by their Russian page title.
2. **Reading**: the rendered Russian page (REST API), the sentences carrying a year 800–1105, read by me.
3. **Holder**: the title of 1100 of the polity drawn under the point (`meta.py`), as in every lot.
4. **Entry**: through the MCP; checked by script against the file (33/33 exact); `cities:alerts`: 65 alerts on 13,594
   cities, none of the 33.

## Entered — 33 places (places 13576–13608, sheets 13594–13626, sources 5377–5409)

Staryi Chortoryisk (1100), Mukachevo (1086), Khust (castle, 1090), Turiisk (1097), Zvenyhorod (1086), the church of the
Annunciation at Gorodishche (1103), Bryn/Debryn (fort, 1097), the Kiev Caves monastery (1096), Lukoml (1078), Usviaty
(1021), Zvenigorod of Kiev (1097), Belgorod of Kiev (fortress, 991), Bishche (1086), Vytachiv/Uvetichi (the congress of
1100), Voin (1079), Voronkiv (1096), Kankov (castle, 903), Kobyzhcha (1100), Peremyl (1097), Pisky/Pesochen (1092),
Protsiv (1096), Sviatopolch (1095), Staroye Rakomo (1015), Torchesk (1093), Khalepie (1093), Kopys (1059), the Vydubychi
monastery (1070–1077), Selezivka (1039), Olzhychi (947), Slutsk (1097), Busk (1097), Zdvyzhen (1097), Rodnia (978).

One line each, the page's own sentence; a fortress cites reason 7, a monastery reason 9, the others « importance ».

## Refused, and why (the rules of the sorting)

- **Legend or hedge**: Zhytomyr (« по легенде »), Uglich (« недостоверных »), Bohuslav (« считается »), Plisnesk
  (« вероятнее всего »), Perevolochna (« предполагается »), the Yuriev and Zimne monasteries (« по преданию »), Sokolivka.
- **The Turov charter of 1005** (Kapyl, Dubrovytsia, Vysotsk, Stepan, a 17th-century copy held to be a later
  fabrication): not entered on it alone.
- **A neighbour, not the place**: Bilylivka (the hillfort of Rostovets beside it), Sedniv (a battle « near it »),
  Nizhyn (« Nezhatina niva »), Zaporizhzhia (settlements on both banks), Shchekavytsia (a hill of Kiev).
- **One sign per place**: Berestove, the Near Caves and the Dormition cathedral are within the Caves monastery; the
  detinets of Zvenyhorod and of Chortoryisk are their towns; Belohorodka is Belgorod of Kiev; the Borisoglebskaya church
  is in Vyshhorod.
- **First mention after 1105**: Peresopnytsia (1149), Tumashch (1150), Yaropolch (1160), Pronsk (1131), Vshchizh (1142),
  Izheslavl, Karachev (1146), Krasne (1136), Velikiye Luki, Lutava (no year), Putyvl.
- **No polity drawn under the point, so no holder**: Oleshky (Oleshye, 1084, in the steppe), the Alan churches of the
  Caucasus, the Perm and Tatarstan hillforts, Yelabuga.
- **Only « 11th century » or no year**: Khotyn, Melnytsia, the Crimean hillforts dated by archaeology alone.

## Corrected after the coder's check (19/11)

Selezivka (place 13603) was entered under « oblast de Kiev »: Wikidata keeps a former P131 beside the current one, and
`meta.py` takes the first first-level division it meets. Its page says Zhytomyr oblast, where the point lies: corrected
to « oblast de Jytomyr » (Q40637). The other 32 regions were read against their pages' first sentence: none other off. Bryn (place 13582), left
without a region, given « oblast de Kalouga » (Q2842) from its page.

## Open — for the dev or a later pass

- **Busk, Peremyl, Bishche, Zvenyhorod are drawn under Volodar of Peremyshl** (title 315); Busk and Peremyl sit in
  Volhynia today. The chronicle's congress of Uvetichi (1100) is said to have given Davyd Igorevich towns of Volhynia
  (Buzhsk among them) — **to verify in the Povest' text before any line**: not entered, a recollection only.
- **The Rodnia sheet** stands on 978 alone; whether Rodnia still stood in 1100 is not read.
- **Second pass, by `/find-sources`**: the chronicle towns before 1100 whose Russian page gives no year sentence
  (Dorogobuzh 1084, Snovsk 1068, Sosnytsia) — the Povest' vremennykh let itself, read on its year.
