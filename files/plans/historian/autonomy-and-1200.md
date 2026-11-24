# Autonomy, and the map of 1200 — what slowed us, what changes, the zones in order (2026-11-24)

> The dev, 2026-11-24, 2 h: *"we have to move with rhythm … as far as possible for the very beginning of January … a
> plan, proposals that make you autonomous, you first … loops, the subagents you spawn … maybe a cloud agent … plan
> and prepare the map of 1200: which zone first, every zone you would iterate on."* Written by the historian the same
> night; the coder's part is § 5. **Everything here is proposed** until the dev says otherwise.

## 1. The balance of the slowness — what made two weeks hurt

Measured where a measure exists; otherwise said as seen.

| # | what slowed us | how it showed | whose |
| --- | --- | --- | --- |
| 1 | **The city as the unit of research** | every city researched on its own, with its own quotations: 13 698 sheets for 1100, each a small investigation; the same lord proved again city after city | method (historian) |
| 2 | **No stopping rule for proof** | a question reopened round after round (Anatolia: three rounds, 29 lots, ~50 books for 138 sheets); the dev heard about sources he never asked for | method (historian) |
| 3 | **The research flow rewritten instead of run** | more than six hours on 23/11 reformulating `/find-sources`, `/bulk-entry` and two agents | historian |
| 4 | **Agents writing the CMS** | quotations deformed by entry agents, then rechecked and repaired by hand (8 on 23/11); lots too big, stopped at their limit with no report | historian |
| 5 | **Bookkeeping alerts mistaken for history** | Azov, Carcassonne: the map and the CMS naming one polity with two identifiers — red cities with nothing historical wrong | tooling + historian |
| 6 | **Plumbing between the two sessions** | « je saisis » / « CMS libre » for every write; one commit and a full check per export (about ten on 23–24/11, one to two minutes each); the CMS's MCP tools read once per session; CMS restarts | tooling (coder § 5) |
| 7 | **The map's holder of truth split in two** | `years/` uncommitted and the dev's, the alerts reading it: the 39 sheets removed then restored on 24/11 came from there | tooling |
| 8 | **My mistakes, the costliest** | five sheets deleted as witness-less (they had witnesses, 23/11); 39 sheets deleted instead of researched (24/11, 1 h 08); his tab assumed open without a check; 2 pages of 30 of his atlas read before answering; a person's Wikidata given for a country; drawing he judged calamitous (Anatolia, 22/11) | historian |
| 9 | **Talking instead of doing** | long briefings, questions he did not have to settle, method told to him — against his rule (memory `all-cities-green-no-admin`) | historian |

**What went fast, to keep**: scripts for every measure (`cities:alerts`, `sides.mjs`, `verify_entry.py`); content
printed by script and pasted, never re-typed; on 24/11 the 39 alerts settled in about 30 minutes once the drawing was
done by script in the page (the pilot, § 3.4).

## 2. The principles of the new flow

1. **The city is what counts; the lord is only the way to it.** What the Cartographer shows and what `cities:alerts`
   measures is **a city, at a date, and whom it belonged to** — the reference in time and space every border pivots
   on (the dev, 24/11: *"in the Cartographer, what is authoritative is the city and its belonging"*). That does not
   change: we deliver and check city by city. What changes is the path: a lord's tenure is **proved once** (titles and
   links, DESIGN-262 § 4) and given, with that proof, to the cities of his district — the sheet saying it is deduced
   from its district (§ 3.5). **A city that may not follow its district is researched on its own**, as before: a
   bishop's city, a commune, a royal town inside a vassal's land, a disputed border town — found ahead by its 1100
   sheet, its reason of importance (bishopric, commune), or a source line already in the base that contradicts the
   district.
2. **A stopping rule for proof** (to confirm by the dev — it is his rule of 24/11 made operational): a title or a link
   is entered on **one work read** that states it, or **two independent reference sources** that agree; **at most three
   rounds** per question; after the third, the question is closed — the city is removed from the year, or the title
   entered as uncertain (the hatching, `evidence-system.md` § 6). **Never asked to the dev.** Agreed by the dev, 24/11.
   **On the map** (the dev, 24/11: some enclaves of 1100 looked doubtful, Benevento's was right): **an enclave only
   when the city's belonging is proved by a work** (Benevento, the Pope's); otherwise no enclave — two readings that
   oppose make a **dispute** (the zone hatched between the two), no proof at all takes the city out of the year. **To
   apply first to the circles drawn round the 39 cities on 24/11**: kept, hatched or removed by this rule.
3. **Everything is done by script** (the dev, 24/11: *"every skill must have its arms and hands lengthened by
   scripts"*) — every gesture repeated becomes a tested script in its skill: the drawing too (a polity traced round its
   proved cities along its neighbours and rivers, the shape of a free plate laid by `/draw-from-plate`, the enclaves
   sorted by their proof), the CMS above all. On 24/11 the 39 alerts took 30 minutes by script; the Anatolia drawn by
   hand on 22/11 was refused. **Scripts write the CMS, agents never do.** **In TypeScript wherever the two are equal,
in Python where its libraries do better** (PDFs, geometry) — the dev, 24/11; no rewrite of the existing Python
scripts, each moves when touched. Agents research and return a file; a script builds every payload; a
   script checks the base against a copy taken before (`verify_entry.py`). This is what 23/11 taught.
4. **The data are the historian's, end to end** (the dev, 24/11, validated: *"I must stay on the front, on the atlas,
   with the coder … I can no longer come back to you and see holes, missing things, incoherences in the data"*). He
   hears three things only: **a zone started**, **a zone done** (*green*, or *N cities left and why*), **the context at
   60 %**. No source, no method, no tool, no question. Holes, duplicates and incoherences are found by the nightly
   checks (`cities:alerts`, `names:check`, the chains of vassalage) and fixed before he opens the Cartographer.
5. **Every night run ends with the base checked, the export done, the alerts measured, the resume point written.**

## 2 bis. Step 0 — the catch-up pass on 1100, before 1200 (the dev, 24/11)

What is reformed here is applied to 1100 first:

1. **The enclaves** — the 39 circles of 24/11 and every enclave already in his 1100, through the rule of § 2.2: kept
   when a work proves the belonging, hatched when two readings oppose, removed otherwise.
2. **The weakly proved cities** — those resting on Wikipedia alone or on the map: the stopping rule, three rounds at
   most, then kept, marked uncertain, or removed.
3. **The cities that may not follow their district** (bishoprics, communes, royal towns) — checked one by one (§ 2.1).

It ends as every zone does: the base checked, the export, `cities:alerts --map 1100` at zero, one line to the dev.

## 3. The flow of one zone — the loop

For a zone of 1200 (§ 4), unattended, in this order:

| step | what | who | model, effort |
| --- | --- | --- | --- |
| 3.1 the candidates | the zone's places **already in the base** (13 698 places of 1100, positions and Wikidata done) plus the 1200 foundations a Wikidata query finds | script | none |
| 3.2 the political frame | the zone's sovereigns and direct vassals in 1200, from a general work (the Cambridge Medieval History, Shepherd 1911 — public domain — and the dev's atlases) → a list of territories with their districts | historian | Opus, high |
| 3.3 the lords | per territory: holder in 1200, suzerain, one quotation from a work — **lots of 10 territories per research agent**, at most 10 agents at once | `source-researcher` agents | Opus, high (judgement); `book-reader` for a single book |
| 3.4 the map first | the zone's coasts checked (the 1200 map no longer stacks periods — § 5), then the zone's territories and vassals drawn from 3.2–3.3: **real shapes along their districts**, never circles | historian through the pilot (`/use-cartographer`) | Opus, high |
| 3.5 the cities | each candidate given the title **its district's research (3.3) names** — never the polity drawn under it: our map is never a witness (23/11). The sheet says it is **deduced from its district**, and carries the lord's own source line. The others listed | script — **to be written by the coder** | none |
| 3.6 the entry | sources, titles, links, sheets of 1200 — payloads built by script, posted through the MCP one by one, checked against a copy | script + historian | Sonnet is enough to drive it; the checks are scripts |
| 3.7 the measure | `cities:alerts --map 1200`; every alert classed: identity (fix the link), border (retouch), history (back to 3.3, round 2 or 3) | script, then the loop | — |
| 3.8 the close | the stopping rule (§ 2.2) applied to what remains; export; the coder commits; one line to the dev | historian | — |

**The loop**: 3.3 → 3.7 repeat until the zone's alerts are zero or every remaining one has hit its third round. One
zone per night when it is small; a large zone (France, the Empire) split in sub-zones.

## 4. The zones of 1200, in order

The order: what the dev can check with his own atlases first, then the largest share of the map, then the rest.

| # | zone | the political frame in 1200 (from memory, to verify in 3.2) | why there |
| --- | --- | --- | --- |
| 1 | **Iberia** | Castile, León, Navarre, Aragon-Barcelona, Portugal; the Almohads in al-Andalus; the Balearics (Banu Ghaniya) | his atlas (García de Cortázar) read whole on 23/11; the north-west of 1100 just done |
| 2 | **France and the Angevin lands** | Philip II; the Angevin domains (Normandy, Anjou, Aquitaine) before 1204; Toulouse, Champagne, Flanders, Brittany, Burgundy | the largest number of 1100 places; the great fiefs are the textbook case of § 2.1 |
| 3 | **British Isles** | England (John, 1199), Scotland, the Welsh princes, Ireland (the Norman lordship and the Irish kings) | small, well documented |
| 4 | **Empire, west** | the double election (Philip of Swabia, Otto IV); the Low Countries, the Rhineland, Lorraine, Upper Burgundy, Arles | the 1100 lots of the Empire carry over |
| 5 | **Empire, east** | Saxony split after 1180, Bavaria, Austria, Styria, Bohemia, Meissen, Brandenburg | idem |
| 6 | **Italy** | the Kingdom of Sicily (Frederick II a minor), the Papal States, the communes, Venice | many cities, few lords: § 2.1 matters less, the communes do |
| 7 | **Hungary, Croatia, Poland** | Hungary with Croatia and Dalmatia; Poland divided among the Piasts | — |
| 8 | **The Balkans and Byzantium** | Byzantium before the Fourth Crusade; the Second Bulgarian Empire; Serbia; Bosnia | the map changes in 1204: draw 1200, not after |
| 9 | **Scandinavia and the Baltic** | Denmark, Norway, Sweden; the Baltic tribes; Livonia begins (Riga, 1201) | — |
| 10 | **Rus' and the steppe** | the Rus' principalities (Kiev, Vladimir-Suzdal, Novgorod, Galicia-Volhynia), the Cumans | — |
| 11 | **Anatolia and the Caucasus** | Rum, Cilician Armenia (a kingdom since 1198), Georgia under Tamar | the Anatolia of 1100 just done |
| 12 | **The Levant and Egypt** | the Ayyubids; Jerusalem at Acre, Antioch, Tripoli | — |
| 13 | **The Maghreb and the periphery** | the Almohads, Ifriqiya; the distant countries (rank `distant`) | the periphery needs little |

**The arithmetic to January**: from 24/11 to the start of January is about five and a half weeks; thirteen zones
means between two and three zones a week. Measured on 1100 for scale (not a promise): the whole map took from 05/11 to
24/11; the Anatolia of 1100 took one day for 138 sheets with three rounds; the 39 alerts of 24/11 took 30 minutes of
drawing by script. The plan reaches January only if § 2.1 and § 2.2 hold.

## 5. The coder's part — tooling, cloud, cleaning the 1200 map

From the coder's answer of 24/11, checked in the code that night. No duration is given (the dev's rule): the cost is
said in changes, the time will be measured on the first zone.

| # | what | remedy | cost | needs |
| --- | --- | --- | --- | --- |
| a | **An export's commit runs the whole check** (`.husky/pre-commit`: lint-staged, the type-check of the repository, the five packages' tests, the hooks' tests — for one JSON file) | when only `packages/atlas/public/content/*.json` is staged, the hook runs only `committedContent.test.ts` and the format check | a few lines in the hook, one test | **the dev's decision** — his rule says the whole check at every commit |
| b | **Who commits the export** — the most frequent round trip of the night (about ten) | the historian commits the two export files himself, named, after its script check | one line in each role page, plus (a) | **the dev's decision** — a change of role |
| c | **Restoring a deleted record** | Payload 3.92's trash on city sheets, places, titles, links, sources: a deletion dates the record instead of erasing it; the 39 sheets of 24/11 would have come back with no script | a migration adding one column per table, tests; check first that the MCP deletes to the trash | a ticket to create |
| d | **Deleting a polity or a person** — refused on purpose by the MCP (`mcpAccess.ts`, the dev, 02/11) | open it on the key, keeping the refusal of what a sheet cites, with (c) | two lines and their tests | **the dev's decision** — he had closed it |
| e | **Merging two duplicates** (Ponthieu, by hand on 23/11) | `pnpm cms:merge <collection> <keep> <remove>`: moves every citation to the kept record, then trashes the other, after a copy of the base | a script and its tests on a test base | a ticket to create |
| f | Renaming in bulk | not a gap: `updateTerritories` / `updatePeople` rename one by one, the hook follows; `renameRecords` exists for a scripted batch | — | — |
| g | **The test base** — CMS-279 (in progress): the seed no longer builds a new base since English became required | the seed reads Wikidata's English label, plus the integration test | the condition to prove (c), (d), (e) without copying the dev's base by hand | — |
| h | « je saisis » / « CMS libre » | kept only before a migration or a server restart; with (b) the coder no longer writes for the exports. A lock or a queue would be code for three rare cases a week — advised against | none | — |

**The coder's order**: (b) and (a) first, they remove the most round trips; then (c) with (g); then (e) and (d); the
measure of 1200 in parallel, since it does not touch the CMS.

**The map of 1200 — measured by the coder on 24/11, read-only on the dev's working copy**: it no longer stacks
periods. Its 112 polities overlap only in 66 border slivers, each under 1 % of the smaller polity (the largest, 916 km²,
Qara Khitai × Kimek; Mann over Alba, 7 km²). The known issue of 08/11 is closed and archived. **No cleaning by script
is needed**: what remains is what Cliopatria lacks — the vassals outside France, the cities, the coasts to check, as for
1100. The measure, to run after every retouch: `files/spikes/year-overlaps/measure.ts`.

**Models for the coder's tasks**: Opus at high effort for (a)–(e) and the measure of 1200 — migrations and rights,
where an error costs the base; for an export's check and commit, no model if (b) is decided, otherwise Sonnet at low
effort; the review with its four reviewers as they are.

## 6. Loops, subagents, the cloud — what runs where

- **Local, unattended, on his Mac**: the CMS (SQLite), the Acer disk, his Cartographer, and the BnF through his Chrome
  are local — so the entry, the map and the BnF reading run here. The loop of § 3 runs as `/loop` (self-paced) or as a
  Workflow (the dev's word is needed to start one — "use a workflow"), the research agents spawned inside it, ten at
  most.
- **In the cloud**: a cloud session works on a copy of the GitHub repository — it reaches neither the CMS
  (127.0.0.1) nor Acer, nor the PDFs of the library. And writing research to a branch breaks two rules (the coder's
  correction): the repository is public, so quotations of works in copyright would be published; and Acer is the
  research's only home (the dev, 23/11). A private transit repository, copied to Acer by a local step, would work for
  research wholly online (archive.org, Gallica). **Advised**: the nights on the Mac, unattended, as on 23/11; the cloud
  only if the local nights prove the bottleneck on zone 1.
- **Models**: Opus at high effort for the judgement (the political frame, the research, the drawing); Sonnet for
  driving scripted entry; no model for what a script does (§ 3). The dev sets the number of agents (memory
  `research-runs-unattended`).

## 7. What the dev decides — one gesture each

1. The stopping rule of § 2.2 (one work or two references; three rounds; then removed or uncertain).
2. The order of the zones of § 4.
3. Whether a Workflow may run the night loop without asking each night.
4. **Decided, 24/11**: the historian owns the whole chain — research, entry (Sonnet subagents through scripts),
   export, commit, merge to `main`; an initiative fits in its tickets and ends visible in the Cartographer (§ 5 b).
   **It pushes too.** On the board, **a map is an epic and a zone a story**: the historian creates its zones' stories,
   carries each to Fait and says when it is done; several zones at once where it can (research in parallel, the
   drawing and the entry one at a time). Still open: the light check for an export's commit (§ 5 a).
5. Deletion of polities and persons opened to the historian, with the trash (§ 5 c, d).
6. A private cloud transit, or the nights on the Mac only (§ 6).
