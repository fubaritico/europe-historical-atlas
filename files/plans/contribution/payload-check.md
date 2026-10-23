# Payload, checked before committing to it — CONTRIB-218 (2026-10-22)

> What `cartographer/06-contribution-tooling.md` asked to verify, *« not assumed »*, plus the dev's question of
> 2026-10-22: can the contribution forms and pages be customised, can our design system be used in them, and is
> it worth overriding Payload's own look with it? Each answer is graded: **read in the code** (the repository at
> `main`, `package.json` 3.92.0, fetched into `opensrc/` the same day), **read in the docs** (the `docs/` folder of
> that same repository), **npm** (the registry), or **web** (with its URL).

## The answers

| question | answer | graded |
| --- | --- | --- |
| current major | **3.92.0**, published 2026-10-22; **4.0.0-beta.4** on the `beta` tag | npm |
| licence | MIT | npm |
| Next.js required | **yes** for 3.x — `@payloadcms/next` and `@payloadcms/ui` peer on Next `15.2.9–15.4.x` or `>=16.3.3 <17` | npm, code |
| React | `^19.0.1 \|\| ^19.1.2 \|\| ^19.2.1` — our catalogue's React 19 fits | code |
| Node | `^22.23.4 \|\| >=24.22.1` — our Node 24.22.1 is exactly the floor | npm |
| SQLite for local authoring | **yes**: `@payloadcms/db-sqlite`, over libSQL (`@libsql/client` 0.14) and Drizzle; a file URL | code, docs |
| a point (lon/lat) | **yes, in SQLite too**, stored as GeoJSON text (`{"type":"Point","coordinates":[lon,lat]}`) | code: `drizzle/src/sqlite/schema/buildDrizzleTable.ts` |
| spatial queries (*near*, *within*, *intersects*) | **Postgres (PostGIS) only** — the drizzle query builder handles them only when `adapter.name === 'postgres'`. **We need none**: the atlas reads an export and places points itself | code: `drizzle/src/queries/parseParams.ts` |
| a polygon field | **none.** Field types: array, blocks, checkbox, code, collapsible, date, email, group, join, json, number, point, radio, relationship, richText, row, select, tabs, text, textarea, ui, upload. A geometry could only sit in `json`, unaided — **geometry stays in the Cartographer**, as planned | code: `payload/src/fields/config/types.ts` |
| fr and en side by side (CONTRIB-222) | **not native**: one locale at a time, chosen in a selector at the top of the admin. Side by side means a custom view or field | docs: `configuration/localization.mdx` |

## Customising — what Payload offers

**Every part of the admin can be replaced or extended by our own React components** (code: `config/types.ts`,
`collections/config/types.ts`; docs: `custom-components/`):

- **whole pages**: `admin.components.views` adds custom admin views, and replaces the dashboard or the account;
- **a collection's screens**: the edit view's save, publish and preview buttons, its document controls, the list's
  header zones;
- **a field**: its input (`Field`), its label, its description, its cell in the list, its diff between versions —
  e.g. a small map to place a point;
- **the shell**: navigation, header, logos, before/after zones of the login and the dashboard, global providers.

Components are **React Server Components by default**; ours become client components with `'use client'`. They
are referenced by **file path** in the config, resolved through a generated import map (never hand-edited).

**Styling** (docs: `admin/customizing-css.mdx`): one global stylesheet, `custom.scss`, at the root of the app; all
of Payload's CSS sits in `@layer payload-default`, so **any unlayered rule of ours wins** — the same mechanism our
Cartographer relies on. Its look is driven by ~20 families of CSS variables (`--theme-elevation-*`, `--theme-bg`,
`--theme-text`, `--font-body`, `--style-radius-*`…), dark mode included.

## Our design system inside Payload — does it fit?

Measured against `@fubaritico/styles` and `@fubaritico/tokens` 0.7.0, as installed:

- **No class collision**: every class of the design system starts with `ui-` (`.ui-button`, `.ui-card`…);
  Payload's are its own BEM names (`.btn`, `.field-type`…).
- **No variable collision**: 202 tokens in the design system, 320 custom properties in Payload's UI, **none shared**.
- **No element-level rule**: the design system's `styles.css` has 305 selectors and none targets a bare element
  (`button`, `input`, `*`…), so loading it in the admin restyles nothing of Payload's.
- **Same React major.**

So our components **can** run inside Payload's admin, beside its own, without either breaking the other.

## Is it worth overriding Payload's look with ours? — my recommendation

Three levels, by cost:

| level | what | cost | verdict |
| --- | --- | --- | --- |
| **1. Theme** | point Payload's colour, font and radius variables at our tokens, in `custom.scss` | a few dozen lines | **yes** — cheap, and the admin reads as ours |
| **2. Our screens where Payload has none** | custom views and fields built with our design system: the source register, a claim with its evidence side by side (*« Euratlas dit ceci, Shepherd dit cela »*), the arbitration, fr/en side by side, the map to place a point | real work, but it is the work — no CMS form does it | **yes** — this is where the contribution's value is |
| **3. Re-skin all of Payload's own components** | override its buttons, inputs, lists, nav with ours | large, and **thrown away by 4.0**, whose admin is rebuilt *« around a stronger design system, with more semantic styling tokens »*, Sass removed ([Payload, 2026-06-09](https://payloadcms.com/posts/blog/payload-40-admin-ui-redesign-tanstack-mcp-and-more)) | **no** |

The same logic as the atlas and the Cartographer: the design system where our application *is*, not as a coat
of paint over someone else's.

## Version 3 or 4

- 4.0 is in beta (`4.0.0-beta.4`); no stable date announced. Reported breaking changes (web, secondary sources:
  [buildwithmatija](https://www.buildwithmatija.com/blog/payload-4-0), [a migration issue](https://github.com/JWMcNeil/jamjam/issues/15)):
  the Local API no longer bypasses access control by default; default query depth 2 → 1; versions on by default;
  some admin component types renamed; a migration issue lists Node ≥ 24.15 and Next ≥ 16.4. **The official v4
  migration guide was not read.**
- **Recommendation**: build on **3.x**, keep level 1 thin and level 3 out — then the move to 4 costs the theme
  file and the renamed types, not a re-skin. Re-check 4.0's status when CONTRIB-219 (creating the app) starts.

## Decided by the dev, 2026-10-23

| what | by |
| --- | --- |
| Payload 3.x, on Next with React 19 — *« ça me va »* | the dev |
| level 1: a light theme, so the admin is recognised as the historical atlas of Europe's world — *« un rappel »* | the dev |
| level 2: our own screens with the design system where Payload has none; level 3 left out | the dev |
| **one form per language**, Payload's native `localized` fields and its locale selector — **replaces CONTRIB-222's fr/en side by side**; a half-translated entry is reported by the export script (CONTRIB-223), the one place that sees both languages at once (`plan.md` P8) | the dev, on my recommendation |
| the arbiter is named: the dev signs his arbitrations | the dev |
| the source register, and its two forms below | the dev — *« c'est exactement comme ça que je le voyais »* |

### The source register — declare a source once, then link it to a year

The goal, in the dev's words: the same as Euratlas's *periodis* PDF — **for each year, the sources that served to
draw its outlines and the derived maps, and sometimes its names**, naming leaning mostly on Wikipedia (*« une
bonne boussole »*). The register holds 20 to 25 sources at first (the dev's atlases bought or downloaded, kept in
the git-ignored `files/resources/Atlases/`), so a year picks them from a dropdown. The fields follow the `Source` of
`evidence/step-2-concepts-in-core.md` §2, which is the line `/create-data-mention` already logs on ATLAS-152.

**1. A source — written once, in the register**

| field | example | input |
| --- | --- | --- |
| title | *Historical Atlas* | text |
| author | William Shepherd | text |
| publisher, year of edition | Henry Holt, 1911 | text, number |
| kind | historian's atlas | select: primary · historian-atlas · scholarly · encyclopaedia · crowd-database — weights 4 · 3 · 3 · 2 · 1 (CORE-270, the dev 2026-10-22) |
| licence | public domain | select: public domain · CC0 · CC BY · CC BY-SA · all rights reserved |
| permitted use | calque | **computed from the licence, never typed** — a source in copyright can only be a reference (my call, confirmed by the dev: a mis-click must not let one pass as traced) |
| address | a Commons or archive.org URL | URL, optional — a printed book has none |
| copy of | Armenica.org → Hewsen 2001 | relation to other sources: a copy is not a second witness (principle 3) |

Wikipedia and Wikidata are entries like any other (encyclopaedia, crowd-database) — no exception outside the machine.

**2. A source linked to a year — what the year's « Sources » page lists**

| field | example | input |
| --- | --- | --- |
| year | 1100 | select |
| source | Shepherd 1911 | **dropdown of the register** |
| what it served for | outlines · names · bonds of vassalage | checkboxes |
| how | traced · read (reference) | choice, bounded by the permitted use |
| regions | Armenia, Georgia | text |
| plate or page | pl. 66 | text |

## Not verified

- the official v4 migration guide;
- that the SQLite file works with the Local API from a separate export script (CONTRIB-223) — expected, not run;
- Payload running inside this pnpm workspace beside the catalogue (CONTRIB-219 will show it).
