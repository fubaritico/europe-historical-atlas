# Siege engines — the siege icon's artillery, chosen by date from sourced periods (2026-10-27) — ATLAS-286

> **Asked by the dev, 2026-10-27.** The siege icon is a tower **with an artillery piece in front of it** — *« trébuchet,
> catapulte ou canon, selon l'époque »*. The tower alone stands for the castle that protects a city (ATLAS-295). Which
> engin goes with which period is **data, held in the contribution and backed by sources**: *« il faut juste que ce soit
> présent dans la contribution et que tu cites quelque chose pour qu'on ait les données exactes »*.

## Decisions

| decision | by | when |
| --- | --- | --- |
| A siege is drawn as a tower and an engin of its period; a tower alone is a castle (a city's icon) | the dev | 2026-10-27 |
| The engins and their periods live in the contribution, each period backed by sources | the dev | 2026-10-27 |
| Where periods overlap, the map shows **the newest engin already in use** | the dev (option *a*) | 2026-10-27 |
| No catapult: the torsion engine (onager) is Roman, the medieval *mangonel* is a traction trebuchet | me, from Purton — the dev agreed with the model | 2026-10-27 |
| The export picks each siege's engin; the atlas only draws what it is given | me — an argument, not law | 2026-10-27 |
| A siege in no period: the export warns, naming it, and the map shows the tower alone | the dev | 2026-10-27 |
| The icon's stored value stays `tower` (renaming it rewrites a column, CMS-276); only its label changes | me — an argument, not law | 2026-10-27 |

## What the sources say

Found through Wikipedia's citations (*Trebuchet*, *Mangonel*, *Cannon*, read 2026-10-27) — **the books themselves
are not read**; the page numbers are Wikipedia's. Before the seed is committed, each line is checked against the
book where it can be reached, or kept with this grade.

| engin | in use in Europe | backed by |
| --- | --- | --- |
| **traction trebuchet** (*mangonneau*), pulled by hand | adopted by the Franks in the 8th c.; earliest western reference, the siege of Tortosa (808–809); the main siege engine until the 12th c.; phased out with the other around the mid-15th c. | Purton 2009, pp. 29, 367; Purton 2010, p. 269 |
| **counterweight trebuchet** | earliest description c. 1187 (al-Tarsusi, for Saladin); in England by 1217, in Iberia just after 1218; common in sieges by the 1230s; phased out around the mid-15th c. | Purton 2009, p. 387; Purton 2010, p. 269 |
| **cannon** | earliest European depiction 1326 (Walter de Milemete); breaching walls by c. 1374; decisive at Constantinople, 1453 | Milemete, *De nobilitatibus, sapientiis et prudentiis regum*, 1326 |

The works, for the source register:

- Peter Purton, *A History of the Early Medieval Siege, c. 450–1220*, Boydell Press, 2009 — scholarly.
- Peter Purton, *A History of the Late Medieval Siege, 1200–1500*, Boydell Press, 2010 — scholarly.
- Peter Purton, « The myth of the mangonel: torsion artillery in the Middle Ages », *Arms & Armour* 3 (2006) — scholarly; why there is no catapult.
- Walter de Milemete, *De nobilitatibus, sapientiis et prudentiis regum*, 1326 (Christ Church, Oxford) — a document of the period.

## The model

### A collection, « Engins de siège » (`siege-engines`)

| field | type | why |
| --- | --- | --- |
| `name` | text, localized, required | « Trébuchet à traction » / « Traction trebuchet » |
| `engine` | select, required: `traction-trebuchet` · `counterweight-trebuchet` · `cannon` | what the atlas knows how to draw — a closed list, like the event type's icon |
| `inUse` | the historical date field already in place (`fields/historicalDate`: start required, end optional, *circa* and margin) | the period the sources give; no end = still in use at the map's last century |
| `sources` | relationship to `sources`, many, **required** | no period without a source — the dev's condition |
| `wikidata` | the field already in place | the engin's item, for its names |

A **new** collection adds a table: Payload's push asks nothing for that (verified 2026-10-26 for an added field; a new
table is the same case), so it does not wait for CMS-276. The event type's `tower` option is relabelled « Tour et
engin de siège » — a label, not a value.

### The export chooses

For each event whose type draws a `tower`, the export takes the engins whose `inUse` contains the event's start, and
keeps **the one whose period began last** (`core/data/siegeEngines.ts`, `siegeEngineAt`). The content format goes to
**version 3**: `ContentEvent` gains `engine`, one of the three models or `null` — never absent, like every field of the
format. As from 1 to 2, the writer and the reader share one version, so the file in the atlas's `public/` is
rewritten at version 3 (every event `engine: null` until step 3) rather than version 2 being read on.

**A siege whose date falls in no period** (before the 8th c., or a hole in the table) — decided by the dev, 2026-10-27
(`rules/error-handling.md`): the export **warns, naming the event and its date**, and writes no engine; the atlas draws
the tower alone. Refusing the export was the alternative, and it would have stopped every other event for one missing
line of the table.

**Known limit, said once**: a period is European. A siege in the Levant in 1190 gets the counterweight trebuchet from
1217 only if the table says Europe; the table does not model regions. Revisit if the map reaches the Levant's sieges.

### Later, not now

A siege whose own source names its engin could say so on its record, and that would win over the period — a claim on
the event beats the table (`evidence-system.md`). Not built until a source asks for it.

## The steps, in order — each verified and committed alone

1. **core** — content format version 3: the optional `engine` on an event, its three models, the reader of v2 and v3, and
   the rule *the newest engin in use at a date* as a pure function, tested with literals (overlap, no period, open end).
2. **CMS** — the `siege-engines` collection and the `tower` label; types and import map regenerated.
3. **CMS export** — each siege given its engin through step 1's function; the warning decided above.
4. **CMS seed** — the four sources above in the register, the three engins with their periods; the dev reads the dates
   before they are committed.
5. **atlas** — the traction trebuchet beside the tower, 3D and flat (ATLAS-286), on `/icons.html` then on the map; the
   counterweight trebuchet and the cannon when a year after 1200 is published.
