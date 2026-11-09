# Where a map comes from — the layers, every time (the dev, 2026-11-09)

> The dev: *"c'est systématique"*. Every year is built the same way, from one public base layer, checked against
> other maps, settled by the cities. Epic ATLAS-153 (*les trois couches*); the licences are `/create-data-mention`'s.

**The whole chain, in the dev's words** (2026-11-09): a public **substrate** — Cliopatria, OpenHistoricalMap from 1700
(*"comme tout le monde"*) — plus **Wikipedia** (*"comme tout le monde aussi"*), then what sets us apart: **corrections
from references** (the verification layers, below), **books mined** on archive.org, JSTOR and the BnF, and **index references** from
those books — index after index, Wikipedia's footnotes starting the same chain — given or deduced (`/find-sources`, « A book's index, systematically »). Not historical-basemaps:
it is GPL-3.0, set aside in September.

## 1. The base layer — imported, then run through the passes

| years | base layer | licence | how it comes in |
| --- | --- | --- | --- |
| before 1700 | **Cliopatria** (Seshat) | CC BY 4.0 — the year is CC BY, attributed | `files/spikes/cliopatria-import/` (`resolve.py`, `convert.ts`) |
| from 1700 | **OpenHistoricalMap** | CC0 | `files/spikes/fetch-ohm/fetch-ohm.mjs --year 1700` — not yet in the year format; 93.8 % of Europe covered in 1700, 61.8 % in 1500; no vassal links (0.7 %), Wikidata on 94 % |

Then the whole run of `SKILL.md` (« The order of work »): lint, islands erased and noted, coasts, stretches off the shore
in rounds, islands from the ledger, lakes. The geometry of the published year is this base, cleaned.

## 2. The verification layers — read against the base

| map | licence | use |
| --- | --- | --- |
| **Shepherd**, *Historical Atlas* (1911, 1923) | public domain | **calque**: may be traced, georeferenced under the canvas (`/draw-from-plate`) — a second base where Cliopatria is coarse |
| **Wikimedia Commons maps** (Wikipedia's historical maps), CC BY-SA | CC BY-SA — share-alike | **calque**: may be traced, **and the year then goes CC BY-SA** (`/create-data-mention`); read as a reference instead to keep it CC BY. Each one's link is kept, for its mention |
| **digitized atlases, PDF** (`files/resources/other-historical-atlases-pdf/`, git-ignored; each one's status in `files/plans/sources/bibliotheque.md`) | per atlas | public domain → calque; in copyright → reference |
| **atlases bought, scanned** (git-ignored, beside the PDFs) | in copyright | **reference** only — read and compared, never traced, never published |
| other atlases, not free (Euratlas, Duby, …) | not free | **reference**: they help derive the public map — read, compared, the gaps found and corrected **on our own geometry**, never traced (`/create-data-mention`, RÉFÉRENCE) |

A gap between the base and a verification layer is a question, not an answer: it goes to step 3.

## 3. The cities settle it

Where the layers disagree — a border, a province, a region, a district — the cities sourced at the date decide
(`decide.md`: a city on the wrong side moves the border first; an enclave; a disputed zone). The cities come from
`/find-sources` and the CMS (`sides.mjs` reads them). No city, no source: the base layer's course is kept, and the
uncertainty is said (blur, not hatching).

## 4. The mention

Every map used — base, calque or reference — is logged by `/create-data-mention` on the year's provenance ticket, with
its attribution. The published year names its base layer.
