# Italy in 1100 — the holder of every comune over 20,000 inhabitants

Research of 2026-11-10, at the dev's request (« toutes les villes d'Italie de plus de 20 000 habitants … pour l'année 1100 »).
508 comuni (Wikidata, population > 20,000), ten lots by region, one research agent each under `/find-sources`;
every quotation re-checked by the historian against the text the agent saved (1,579 quotations, none missing).

**Where it lives**: the reports and every text read are in `files/resources/italy-1100-research/` (git-ignored) —
`reports/<lot>.md` (one block per town, its witnesses and quotations) and `reports/<lot>.json`. Not yet in the CMS:
the dev's CMS server was down on 2026-11-10; to enter with `/enter-in-cms`, the `existed` towns only.

| lot | existed | not yet | unknown | disagree with the map |
| --- | --- | --- | --- | --- |
| lombardia | 50 | 0 | 21 | 0 |
| northwest | 31 | 6 | 5 | 7 |
| northeast | 36 | 7 | 8 | 11 |
| emilia-marche | 42 | 3 | 3 | 1 |
| tuscany-umbria | 38 | 5 | 5 | 3 |
| lazio-abruzzo | 41 | 9 | 5 | 16 |
| campania | 46 | 3 | 18 | 18 |
| south | 45 | 7 | 5 | 2 |
| sicily | 28 | 14 | 12 | 5 |
| sardinia | 8 | 3 | 4 | 0 |

**Aosta** sat in the Sardinia lot by a mistake of the lot-making (region read from the longitude); researched in
its own place: Kingdom of Burgundy, Count Humbert II — not the Kingdom of Italy.

## Where the sources contradict the 1100 map

« map » is the polity the current `years/1100` draws under the town; « off the drawn coast » means the town's point falls
outside every polity. Readings, not decisions: the dev decides in the Cartographer. The divergent readings of each town
are in its lot's report.

| town | map | the sources' most probable holder (— below the sovereign) | basis |
| --- | --- | --- | --- |
| La Spezia | republic-of-genoa | Holy Roman Empire — Obertenghi march / bishop of Luni (district, inferred) | district, fragile |
| Savona | republic-of-genoa | Holy Roman Empire — Boniface del Vasto (Aleramid marquess) — city with its bishop pressing for auton | town |
| Sanremo | republic-of-genoa | Holy Roman Empire — Counts of Ventimiglia, or the bishop of Genoa (date of the change not found) | town, fragile |
| Imperia | republic-of-genoa | Holy Roman Empire — Bishop of Albenga (Oneglia) — « dal 1100 » | town |
| Rapallo | republic-of-genoa | Holy Roman Empire — Bishop of Genoa, then the counts of Lavagna (Fieschi) — order given, no date | town, fragile |
| Chiavari | republic-of-genoa | Holy Roman Empire — Obertenghi march; counts of Lavagna (inferred) | district, fragile |
| Sarzana | republic-of-genoa | Holy Roman Empire — Bishop of Luni (castrum); Canossa dominion in the 11th c. | town, fragile |
| Venezia | off the drawn coast | Republic of Venice | town, fragile |
| Treviso | republic-of-venice | Holy Roman Empire — County of Treviso (counts — the Collalto per Wikipedia) inside the March of Vero | district |
| Chioggia | off the drawn coast | Republic of Venice | town |
| San Donà di Piave | republic-of-venice | Holy Roman Empire — Patriarchate of Aquileia (temporal jurisdiction, per Wikipedia) | town, fragile |
| Mira | republic-of-venice | Holy Roman Empire — Treviso/Padua mainland (diocese of Treviso for Mira and Oriago); Gambarare Venet | district, fragile |
| Mogliano Veneto | republic-of-venice | Holy Roman Empire — Bishop of Treviso / county of Treviso | district, fragile |
| Spinea | republic-of-venice | Holy Roman Empire — Bishop of Treviso (pieve of Rossignago) | district, fragile |
| Mirano | republic-of-venice | Holy Roman Empire — County of Treviso (Collalto counts sold land here in 1117) | district, fragile |
| Portogruaro | republic-of-venice | Holy Roman Empire — Bishop of Concordia, under the high lordship of the Patriarch of Aquileia | town, fragile |
| Paese | republic-of-venice | Holy Roman Empire — Treviso (district) | district, fragile |
| Martellago | republic-of-venice | Holy Roman Empire — Bishop of Treviso (pieve) / county of Treviso | district, fragile |
| Ferrara | holy-roman-empire | Matilda of Canossa as fief of the Roman Church, inside the Kingdom of  — rebel city under the Guibertist bishop Samuel (1100); retaken by Matilda in 1101 | town |
| Livorno | republic-of-pisa | Kingdom of Italy — Matilda of Canossa (court and castle of Livorno, given by her to the cathedral o | town, fragile |
| Massarosa | republic-of-pisa | Kingdom of Italy — Lucca (contado) — inferred | district, fragile |
| Cortona | papal-states | Kingdom of Italy — Bishop of Arezzo claimed temporal lordship (diocese of Arezzo until 1325); March | town |
| Pescara | holy-roman-empire | Norman Italy — County of Loritello — Drogo « Tasso », brother of Robert I of Loritello (resident in 1090) | town |
| Anzio | off the drawn coast | Papal States | district, fragile |
| Tivoli | papal-states | Tivoli — autonomous city of the imperial | town |
| Montesilvano | holy-roman-empire | Norman Italy — County of Loritello — Penne county, taken by Hugh Malmozzetto | district, fragile |
| Chieti | holy-roman-empire | Norman Italy — County of Loritello — Robert I of Loritello and his brother Drogo « Tasso » | town |
| Terracina | off the drawn coast | Papal States | town |
| Vasto | holy-roman-empire | Norman Italy — County of Loritello | district, fragile |
| Fondi | papal-states | Duchy of Fondi | town |
| Formia | papal-states | Norman Italy — Duchy of Gaeta — Count of Maranola (Landenolf, 1105) | district |
| Cassino | papal-states | Norman Italy — Principality of Capua — Abbey of Montecassino (Terra Sancti Benedicti) | town |
| Lanciano | holy-roman-empire | Norman Italy — County of Loritello | town |
| Termoli | off the drawn coast | Norman Italy | district, fragile |
| Francavilla al Mare | holy-roman-empire | Norman Italy — County of Loritello | district, fragile |
| Sora | papal-states | Norman Italy — Principality of Capua — Jonathas, brother of Jordan I of Capua (1091) | town |
| Ortona | off the drawn coast | Norman Italy — County of Loritello | town |
| Sulmona | holy-roman-empire | Norman Italy — Hugh Malmozzetto's lordship | district, fragile |
| Napoli | off the drawn coast | Duchy of Naples | town |
| Pozzuoli | norman-italy | Duchy of Naples | town |
| Acerra | duchy-of-naples | Principality of Capua — County of Acerra (Capuan vassal) | town |
| Marano di Napoli | norman-italy | Duchy of Naples | town, fragile |
| Benevento | norman-italy | Papal States | town |
| Cava de' Tirreni | duchy-of-naples | Duchy of Apulia and Calabria | district, fragile |
| Scafati | duchy-of-naples | Duchy of Apulia and Calabria | district, fragile |
| Nocera Inferiore | duchy-of-naples | Principality of Capua | town, fragile |
| Quarto | norman-italy | Duchy of Naples | town, fragile |
| Melito di Napoli | norman-italy | Duchy of Naples | town, fragile |
| Mugnano di Napoli | norman-italy | Duchy of Naples | town, fragile |
| Villaricca | norman-italy | Duchy of Naples | town, fragile |
| Mondragone | off the drawn coast | Principality of Capua | district, fragile |
| Castel Volturno | off the drawn coast | Principality of Capua | town, fragile |
| Orta di Atella | duchy-of-naples | Principality of Capua — County of Aversa | district, fragile |
| Bacoli | off the drawn coast | Duchy of Naples | district, fragile |
| Nocera Superiore | duchy-of-naples | as Nocera: Principality of Capua | district, fragile |
| Mercato San Severino | duchy-of-naples | Duchy of Apulia and Calabria | district, fragile |
| Taranto | off the drawn coast | Duchy of Apulia and Calabria — Bohemond I | town |
| Vibo Valentia | norman-italy | County of Sicily — Roger I of Sicily | district |
| Palermo | county-of-sicily | County of Sicily and Duchy of Apulia — shared city — half Count Roger I, half Duke Roger Borsa (Q468687) | town |
| Messina | county-of-sicily | County of Sicily and Duchy of Apulia — shared city — half Count Roger I, half Duke of Apulia | town |
| Siracusa | off the drawn coast | County of Sicily — Tancred, son of Count William of the Principate (date of the grant not given) | town |
| Augusta | off the drawn coast | County of Sicily | district, fragile |
| Milazzo | off the drawn coast | County of Sicily — Goffredo Borrello, holder of the val di Milazzo « in the first times of the conq | town |

## Not yet in 1100 — never to be drawn for that year

Afragola, Alessandria, Alghero, Altamura, Aprilia, Augusta, Bagheria, Barcellona Pozzo di Gotto, Belpasso, Biancavilla, Capoterra, Carbonia, Castelfranco Emilia, Castelfranco Veneto, Castelvetrano, Cecina, Cesenatico, Ciampino, Cittadella, Colleferro, Cuneo, Floridia, Follonica, Fonte Nuova, Fossano, Francavilla Fontana, Galatina, Giarre, L'Aquila, La Spezia, Ladispoli, Latina, Manfredonia, Martina Franca, Moncalieri, Mondovì, Monreale, Pachino, Palma di Montechiaro, Pietrasanta, Poggiomarino, Pomezia, Pontedera, Pordenone, Roseto degli Abruzzi, Rosolini, Rovereto, San Cataldo, San Giovanni Lupatoto, San Nicola la Strada, San Severo, Santeramo in Colle, Scandiano, Valdagno, Viareggio, Villafranca di Verona, Vittoria.

## What the map gets wrong, region by region — the short reading

- **Liguria**: the map gives the coast to the Republic of Genoa; no source gives the commune territory outside the city in
  1100 (Savona to Boniface del Vasto, Oneglia to the bishop of Albenga, Ventimiglia to its counts).
- **Veneto**: the map gives Venice the Trevigiano and the lower Piave; they are the county and bishop of Treviso (March of
  Verona) and the Patriarch of Aquileia — the Dogado stops at the lagoon.
- **Abruzzo**: the coast from Pescara to Vasto is the Norman County of Loritello, drawn in the Empire.
- **Southern Lazio**: Sora, Cassino, Formia (Capua, Gaeta) and Fondi (its own duchy) are drawn papal.
- **Campania**: Acerra Capuan, Benevento papal (in revolt), Pozzuoli and the western casali Neapolitan; the Naples–Aversa line
  is drawn by no text read.
- **Sicily**: Palermo and Messina shared between the count and the Duke of Apulia.
- **Tuscany**: Cortona is not papal (bishop of Arezzo); Livorno is Matilda's by one witness, the bishop of Pisa's by another.
- **Off the drawn coast**: Venice, Chioggia, Naples, Taranto, Syracuse, Terracina, Ortona, Termoli and others — the coast of
  1100 misses their points.
