# The cities on the map — ATLAS-295

> Opened 2026-10-29, evening, at the dev's request: *« on va passer au marquage des villes, la légende des points et des
> noms associés »* — how cities appear with the zoom, whether the point comes before the name, and when the country
> names step back so the cities and the icons stand out close up.
>
> **The direction behind it** (the dev, same evening): *« là on a beaucoup imité une présentation de jeux vidéo. Il faut
> qu'on arrive à retrouver des règles cartographiques qui vont nous permettre ensuite d'ajouter vraiment des éléments
> signalétiques forts pour que l'information soit bien comprise. »* The country names were built after Crusader Kings
> III; the cities are built from the cartographers' own rules, cited below.

## What exists (read from the code, 2026-10-29)

- The zoom runs from 0 (afar) to 1 (close). Vassals reveal from 0.45 to 0.8 (`tunables/params/vassals.ts`); the borders'
  inlay arrives at 0.4 (`political.ts`, `borderInlayZoom`); every country name fades to a 40 % watermark from 0.85
  (`names.ts`, `watermarkZoom`, `watermarkShare`) — put there on 2026-10-29 for the cities to come.
- A place in the CMS (`packages/cms/src/collections/Places.ts`) holds a name, a position, a Wikidata id and its dates
  (`existsFrom`, `existsTo`). **Nothing says how important it is.**
- Ten places exist, every one attached to an event, and reach the atlas inside `public/content/events.json`. There is
  no layer of cities.

## Decisions

| # | decision | by |
| --- | --- | --- |
| 1 | ~~**The point and the name enter together, by order of importance**~~ — **replaced on 31/10 by the levels of detail** (`detail-levels.md`): a city's point comes a level before its name, and nothing follows the zoom continuously. The original: **The point and the name enter together, by order of importance**: the capitals from the start, the large cities with the vassals (0.45), the other cities at 0.8. A point stays alone only when its name finds no room — and the console says so. | the dev, 29/10, on my proposal |
| 2 | **The country names fade to their watermark when the last order of cities arrives** — one threshold drives both, never two numbers tuned apart. | the dev, 29/10, on my proposal |
| 3 | **A city's importance is dated** — three values, capital, large city, city — and belongs to the place's period in the CMS (CMS-281), not to the place. | the dev, 29/10, on my proposal |
| 5 | **The contribution form of a city** (the dev, 29/10, on my sketch): one form a place and a period (« Paris en 1100 »). The contributor **chooses** the importance, **picks its reasons** in a multi-select — a list that grows (*« ça peut augmenter »*) — and **adds one line a source**: which source (from the CMS's source register), what it says (« 25 000 habitants », « capitale »), where in it. **The uncertainty is never typed**: below the lines the tool says how many sources there are and whether they agree. | the dev, 29/10 |
| 5b | **Two forms, never mixed** (the dev, 29/10: *« faut pas s'en mêler les pinceaux »*): **the place**, entered once — name, position, dates of existence, the form that exists; and **the city at a time** (« Paris en 1100 »), a form of its own that picks its place from a list and holds the period, the importance, the reasons and the sources' lines. A place has as many as it has periods. **Its time is a date or a span, one relation either way** (the dev: *« ça peut être une date ou un range de date, mais la relation de données est la même »*) — the events' own date field (`cms/src/fields/historicalDate.ts`: a start, an optional end → `instant` or `interval`). Each source line says **what about** (population, importance, reason), so the tool can tell two figures of one population apart and say whether they agree. | the dev, 29/10 |
| 7 | **A sheet is validated against what has already been contributed** (the dev: *« il faut un principe de validation sur la base de ce qui a déjà été contribué »*): the CMS refuses to save a city-at-a-time whose date overlaps another of the same place, and names that other one. Sources that disagree go in one sheet's lines, never in two rival sheets. **What overlaps** (the dev, 30/10, on my proposal): a date covers its year (« 1100 » meets « 1100 », not « 1101 »); a span covers its start to its end, both included; « vers » does not widen — the margin is our doubt about the date, not a duration of the city. **The date of a sheet** (the dev, 30/10, lukewarm about spans — *« il y a un moment donné où ça nous empêchera de saisir quelque chose »*): a start, required, which alone counts for its year; an end, optional, for a span. The events' field as it is. **Pure form validation, live** (the dev, same evening: *« ça valide à la saisie […] tant que tous les champs ne sont pas valides, il n'y a pas de bouton ajouter »*): each field is checked as it is typed against what is already saved, and the save button stays disabled until every field is valid — no refusal at save time. | the dev, 29/10, on my proposal |
| 8 | **The contribution screens are our own, assembled from ready-made parts** (the dev, 30/10: *« la légèreté, on n'en a rien à branler. On va assembler des solutions toutes faites : Formik plus Zod plus notre design system »*). Payload's own form validates while typing only after a first save attempt (`ui/src/views/Edit/index.tsx:524`, `skipValidation: !submitted`) and never greys its save button for invalid fields (`ui/src/elements/SaveButton/index.tsx:25`), so a contribution collection replaces its edit view (`admin.components.views.edit.default`) with ours: **Formik** for the form's state (2.4.9, React ≥ 16.8), **Zod** for the rules — the schemas in `core`, the same at the form, on the server and at the export — through a mapping of Zod's issues to Formik's errors written here (Formik expects Yup), and **fubaritico-ds** for the fields. Payload stays the base, the API, the accounts and the lists; simple lists (the reasons, the sources) keep its form. | the dev, 30/10 |
| 6 | **The reasons live in the CMS**, a collection of their own like the event types: the dev adds one (« pèlerinage », « port ») from the admin, with no code. | the dev, 29/10, on my proposal |
| 4 | **Importance is not population**: *« une ville peut être peu peuplée et être très importante »*. The population is one piece of evidence among others — a seat of power, a religious seat (Rome, 35 thousand in 1000 and in 1200), a market — and the importance is a judgement with its reasons and its source, never computed from a figure. | the dev, 29/10 |
| 4b | **The importance that orders the map is political** (the dev, 30/10: *« l'important, c'est l'importance politique »*). **No seat, no capital**: the Holy Roman Empire of 1100 has none — an itinerant court — and none is given it, not even a symbolic one (*« s'il n'y a pas de capitale, il n'y a pas de capitale »*). Aachen is no capital in 1100: Charlemagne's seat, three centuries gone (*« les gens s'en branlent »*); at most a small 3D model of its chapel one day, from his photos. | the dev, 30/10 |
| 4c | **The first cities of 1100, ranked from the sources** (the dev asked for 50 to 60, 2026-10-31): a **capital** where Bosker et al. (2013) say capital; a **large city** where they say archbishopric; a **city** where all three sources give a figure — 59 cities, 23 + 26 + 10. **The archbishopric counts as political** — not an arbitration but how the Middle Ages were (the dev: *« le religieux et la politique, c'est la même chose […] c'est comme ça, c'est la vie »*). Every figure and role is a source line, never averaged; written by the seed (`files/spikes/city-sources/seed-data.mjs` → `cms/src/seed/cities1100.ts`). **Kiev and Novgorod are not among them**: Bosker gives them no role, and only two sources a figure. | the dev, 31/10, on my proposal |
| 9 | **The marks** (the dev, 31/10, on the city marks' bench, « C4 avec le blanc à 60 % »): a **capital** and a **large city** are a dark ring around a dark point, the country's colour between them — the capital larger, its point larger (*« c'était mieux »*); a **city** a small dark point. **The light only around, never inside** (*« tu mets du blanc que autour »*), at 60 % so the rim takes the country's colour. The name to the right, larger and in capitals for a capital. Chosen after the value alone (dark disc for a capital, light for a large city), the size alone, and a square for the capital. The marks live in `atlas/src/scene/cities/cityMarks.ts`, the bench at `/cities.html`. | the dev, 31/10 |

**To know**: in 1100 a *capital* is often an uncertain claim — the Empire's court is itinerant. In the uncertainty
system (DESIGN-262) it is a claim with its source, never a truth.

## The cartographers' rules this rests on

Graded: **found** = read in a source during this session; **from memory** = mine, not yet checked.

- **Selection by scale** — Töpfer & Pillewizer (1966), the *radical law* or *principle of selection*: how many objects
  a smaller-scale map keeps; it gives the count, never which ones — the choice is by importance. **Found** (the 1966
  work and its scope: [Jiang, *Scaling of geographic space…*](https://arxiv.org/pdf/1102.1561)); the formula
  `n_f = n_a · √(M_a / M_f)` is **from memory**.
- **Order shown by size and value** — Bertin, *Sémiologie graphique* (1967): of the retinal variables, size and value
  (lightness) are *ordered*, read without a legend; hue and shape are not. So the three orders of cities differ by the
  point's size and the name's weight, not by colour. **Found** ([Penn State, GEOG 486](https://courses.ems.psu.edu/geog486/book/export/html/637),
  [Axis Maps](https://axismaps.com/guide/visual-variables)).
- **Where a city's name sits** — Imhof, *Positioning Names on Maps* (1975): *« where space allows, it is best to have the
  name beginning to the right of the symbol »*; Yoeli (1972) ranks eight positions, upper right first, then lower right,
  upper left, lower left — the standard practice since (ArcGIS names it *Imhof points*). A 2024 study finds readers
  prefer *above*. **Found** ([Kern & Brewer, Cartographic Perspectives 60](https://cartographicperspectives.org/index.php/journal/article/download/cp60-kern-brewer/pdf/1397),
  [arXiv 2407.11996](https://arxiv.org/pdf/2407.11996)); Imhof's own order **not read** — the book is not online.
- **A rank and a minimum zoom per place** — Natural Earth's populated places carry `SCALERANK` (0 most important to 10)
  and `MIN_ZOOM`, and web maps thin their labels on them. The same mechanism as decision 1, with three orders.
  **Found** ([Natural Earth, forum](https://www.naturalearthdata.com/?p=3508),
  [Mapbox](https://docs.mapbox.com/mapbox-tiling-service/examples/natural-earth-data-populated-places/)).

## Where the importance of a city in 1100 can come from

**Decided (the dev, 29/10): the three open sources, side by side** — Bosker, Buringh & van Zanden (2013, CC0), Buringh
(2021, CC0), Reba, Reitsma & Seto after Chandler (2016, CC BY 4.0) — merged by `files/spikes/city-sources/`, one column a
source, never averaged. They are evidence for decision 4, not the importance itself. The two below were the first
reading of the evening.


- **Bairoch, Batou & Chèvre, *La population des villes européennes, 800–1850*** (Droz, 1988): 2 206 European cities,
  by century. **The year 1100 is missing for lack of data** — 1100 sits between 1000 and 1200. The figures are the
  authors'; a reference (RÉFÉRENCE), never a source to copy. **Found**
  ([Cambridge, review](https://cambridge.org/core/journals/journal-of-economic-history/article/abs/modern-europe-la-population-des-villes-europeennes-banque-de-donnees-et-analyse-sommaire-des-resultats-8001850-by-paul-bairoch-jean-batou-and-pierre-chevre-geneva-librairie-droz-1988-pp-xix-337-sf-4500/932FFB6927635A96F6903931EA148AB0),
  [a transcription, JakeRuss/bairoch-1988](https://github.com/JakeRuss/bairoch-1988)).
- Chandler, *Four Thousand Years of Urban Growth* (1987) — **from memory**, not checked.

## Next — not decided

0. The screen of decision 8, its approach proposed on 2026-10-30: `city-sheet-screen.md`. Built the same day, and **the
   export writes the cities** into the atlas's content file (format version 5, the one that adds them), each checked by
   the one schema first — **prepared, the joins done at export** (the dev, 2026-10-30: *« les données, elles arrivent
   préparées, comme en GraphQL »*): a city arrives with its place, reasons and sources written in. The atlas reads it
   and draws no city yet.
1. Where the cities of 1100 come from, and how they are entered (the field of importance in the CMS, then 30 to 40
   cities) — a first list, to be read by the dev: `cities-1100.md`.
2. ~~The point's look per order~~ — decided, row 9. The name's place beside it (Imhof / Yoeli) is set to the right on the bench; to confirm on the map.
3. The far-off look decided on 27/10 (a point or a circle) and the close one still open (a tower or a timbered house).
