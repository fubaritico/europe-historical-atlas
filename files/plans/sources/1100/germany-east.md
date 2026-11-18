# Eastern Germany in 1100 — the lots de-01 to de-09 (2026-11-14)

The historian's note for the places of today's Germany east of 11°E whose first written mention is before 1105. The
facts are in the base (sheets 1052 and up); this file holds the reasoning and the questions. Method: `/find-sources`,
the agent `source-researcher`, one lot at a time on Opus (the dev, 14/11); holder = the nearest lord the sources prove
(the dev, 14/11).

## The divergences kept — to arbitrate (the dev)

- **The Orla land (Orlagau) — Saalfeld abbey, or the archbishopric of Cologne?** Sheets 1122–1134 (Bucha, Hütten,
  Cordobang, Eliasbrunn, Friedebach, Strößwitz, Pahnstangen, Neunhofen, Niederkrossen, Oberkrossen, Schaala,
  Schmiedebach, Lehesten). **The sheet names the abbey** (Q817038). On the first four, three lines name Cologne and one
  the abbey: a count of lines would give Cologne. Why the abbey all the same:
  - the Cologne lines speak of an earlier step — Richeza leaves the Orlagau to the archbishopric in 1056/1063
    (Wikipedia, « Hoheneiche (Saalfeld) », « Neustadt an der Orla »);
  - the next step comes after it and is not undone before 1100: Anno II gives the Orla land to the abbey of St Peter at
    Saalfeld in 1071 « mit allen Rechten und Einkünften » (Peter Lang, *Quellenanhang*, n. 1473, citing Dobenecker,
    *Regesta Thuringiae* I, 892 and 811 — source 1206);
  - Cologne stays the lord above the abbey: both readings are true at two levels, and the rule of 14/11 asks for the
    nearer one.
  
  **Weak point**: the abbey rests on one scholarly witness that cites Dobenecker; Dobenecker itself (Jena's viewer) is
  not read yet — to read in the browser. A search snippet (lot de-09) tied « a 1074 Saalfeld document » to forgeries; the
  article behind it, read on 14/11 from the PDF the dev saved (Heidelberg, *Vorträge und Forschungen*, « Zur
  Rechtsgeschichte des Klosters Walkenried »), never names Saalfeld: its forgery is a diploma of 1085 for Goseck. A false
  alarm. **Claude's choice, signed by the dev on 14/11 (« OK »).**
  **Placed in the Orla land by position, no text naming them in it**: Pahnstangen, Köthnitz, Schwarza, Breternitz — their
  lines corroborate (Saalfeld fiefs of the 15th century for Schwarza; neighbouring Kaulsdorf in a Saalfeld charter of
  1074 for Breternitz), they do not prove.
- **Neehausen** (sheet 1117) — the church of Naumburg (charter of 18 October 1068, UB Naumburg no. 72) on the sheet; the
  counts of Mansfeld (the surrounding county) kept as a line.
- **Roitzsch** (sheet 1135) — the bishopric of Meissen, on Benno's charter « of 1071 » (UB Meissen no. 32), whose editor
  thinks it later; the village lies in the pagus Nisan, held by Wiprecht of Groitzsch.

## Cologne — 1100 (sheet 21), changed on 14/11 on the dev's word

Holder the Holy Roman Empire (Q12548) → **Archevêché de Cologne (Q11805)**, the dev's « OK » of 14/11: its lines name the
archbishops in person (Hermann III to 21 November 1099, Frederick I from January 1100). The line « l'archevêque, seigneur
de la ville » carried Kurköln (Q7904317) and now carries Q11805, the id of the 13 Cologne lines of the Orla land, so the
concordance gathers them. The Cartographer compares by QID: it will say « disagrees » with the map (the Empire) until it
climbs to the suzerain.

**A question for the whole base, not settled**: a city held by a bishop carries either the diocese (Naumburg Q315609,
Meissen Q15190598, Magdeburg Q27478048, Cologne Q11805) or the prince-bishopric, its temporal lordship (Cambrai Q558311,
Bamberg Q561334, Verdun Q17015016). One convention would let the concordance gather them.

## Where the map differs (reported, the map is his)

- **The pagus Nisan** (around Dresden) — Briesnitz, Gauernitz, Roitzsch, and in de-05 Doberschau, Seitschen: held by
  Wiprecht of Groitzsch 1084/85–1108 as the dowry of Judith of Bohemia (*Annales Pegavienses*); the map draws Meissen.
- **Groitzsch** — Wiprecht's own lordship, not the margrave of Meissen's.
- **Lehesten** — the map draws Franconia; the sources put it in the Saalfeld lordship.
- **Seidmannsdorf and Coburg** — the map draws Franconia; a privilege of Würzburg of 1075 (Quellenanhang) puts the church
  of Coburg under the abbot of Saalfeld.
- **Wiederau** — the map draws Meissen; the *Annales Pegavienses* name « villa Widerhowe » among Wiprecht's lands (1080).
- **The Northern March of the Udonids** (Altmark: Tangermünde, Seehausen) — not drawn.

## Places that existed with no holder proven — waiting for CMS-442 (a line that proves existence)

**From 14/11 no sheet is created for them** (the coder's remark, taken by Claude: a sheet with no line asserts the place
in 1100 with no source, against `/enter-in-cms` « every fact with its source »). Their existence is sourced in the lot's
report (`files/resources/historien/1100/regions/germany-east-1100-research/reports/de-NN.json`), entered once CMS-442 gives the line.

**27 sheets created before that, with no line** (sheet id, place): 1061 Taucha, 1062 Wischroda,
1065 Schalkau, 1069 Schrenz, 1075 Irxleben, 1081 Mausitz, 1085 Greifenhagen, 1087 Lüttgen-Salbke, 1098 Polkenberg,
1100 Brumby, 1104 Schwürbitz, 1105 Sittendorf, 1108 Schwanebeck, 1110 Eßleben, 1114 Weingarten, 1121 Deuben (Teuchern),
1136 Gösselborn, 1137 Kitzen, 1140 Kirchheim, 1141 Eichfeld, 1159 Teichel, 1160 Griesheim, 1161 Profen, 1162 Zeutsch,
1163 Dorndorf, 1164 Röbschütz, 1165 Pritschroda. (Also 578 Ottaviano, Italy, older.) **Deleted by the dev in the admin
on 14/11**, one by one (the filtered-list link I gave did not filter); their places stay, with no sheet.

**Not entered, same case** (no sheet; existence in the report named): de-11 — Röttelmisch, Weißen, Winzerla, Geunitz,
Schmieden (the Saale villages of 1083, probably Siegfried of Mainz's charter, Dobenecker I 939/940, unread), Wedringen,
Schederndorf, Gößnitz, Traßdorf. de-12 — Altendorf (Weismain), Schwarzach bei Kulmbach, Obristfeld (the Bamberg charters
of 1096, unread). de-13 — Oberröblingen (the Hersfeld tithe register, 881–899; no lord for 1100).

## Leads that were wrong (a lot's lesson)

- **Priester (Krostitz)** « 1100 »: the 1110 charter of Archbishop Adelgot for Prester at Magdeburg (« Prester
  (brezderi) », Mülverstedt no. 890), pinned on the wrong village — `unknown`.
- **Sachsendorf (Barby)**: its village dates only from 1670; the place of 1100 is **Patzetz** (Q34342631), a farm of Groß
  Rosenburg — place 1183 corrected from Sachsendorf to Patzetz on 14/11 (sheet 1174).
- Mechlenreuth (1102 refused in 2009, first mention 1185), Radis (1105 is a family's date, 1378), Oberröblingen (« 1100 »
  is a 1981 jubilee).

## The region closed (14/11)

13 lots, 199 leads before 1105: **125 places entered** (sheets 1052–1176), 27 of them with no line (above), and the
places with no proven lord listed above. Paulinzella, Hochstedt, Linderbach, Seehausen: first named 1101–1105, `not-yet`.
