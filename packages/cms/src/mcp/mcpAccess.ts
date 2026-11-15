import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Confessions } from '../collections/Confessions'
import { ImportanceReasons } from '../collections/ImportanceReasons'
import { People } from '../collections/People'
import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'
import { TERRITORY_KINDS, Territories } from '../collections/Territories'
import { Titles } from '../collections/Titles'
import { VassalLinks } from '../collections/VassalLinks'

import type { Plugin } from 'payload'

/**
 * What a model may do in a collection over MCP: read, create and change — **never delete**. A deletion by a model is
 * the one gesture that is hard to take back; the dev deletes by hand, in the admin (the historian's call, 2026-11-02).
 */
const ENTER_NEVER_DELETE = { find: true, create: true, update: true, delete: false } as const

/** The kinds of land a territory can be, for its description — read from the collection, the office said apart. */
const LAND_KINDS = TERRITORY_KINDS.filter((kind) => kind !== 'office').join(', ')

/**
 * The collections a model reaches over MCP — the ones the historian enters its sources into: the places, a city at
 * a date with its holder (CMS-335), the sources, the importance reasons a city's line cites (CMS-431), the
 * confessions of its communities (CMS-433); and the chain of vassalage (CMS-422) — the register of people, the
 * territories they hold, their titles, and the links between titles.
 * Everything else stays out until a need names it.
 *
 * Each entry still goes through Payload as the key's user: the collections' access rules and hooks — the sheet's
 * check before saving included — apply to what a model writes as to what the dev types.
 */
export const MCP_COLLECTIONS = {
  [Places.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      // The plugin takes a point as an object and stores it as Payload's [longitude, latitude] tuple (3.92.0,
      // `utils/schemaConversion/transformPointFields.js`, `utils/transformPointDataToPayload.js`).
      'A place on the map: a city with its name, its position `location` as { longitude, latitude } — Wikidata ' +
      'gives the latitude first — its Wikidata id `wikidata`, and its geographic lot today, `country` and ' +
      '`region`, each `{ name, wikidata }` — the country (P17) and the first-level division Wikidata gives.',
  },
  [PlacePeriods.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A city at a date (« Ville à une date »): its importance, the polity holding it (holderName, holderQid) ' +
      'and its source lines, each with a subject, a source and a quotation; its `communities`, each a confession, a ' +
      '`weight` (dominant or present) and `weightAttested` — true only when a source says that weight — and each named ' +
      'by a line with the subject « community » citing the same confession; `showInAtlas` (false by default) ' +
      'decides whether the published atlas shows it — every city still reaches the Cartographer.',
  },
  [Sources.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description: 'A source: a book, an atlas, an encyclopaedia page or a database, with its kind.',
  },
  [ImportanceReasons.slug]: {
    // Opened to creation on the dev's call, 2026-11-13 (CMS-431): the list knew only the Latin world, and the
    // historian adds what a source attests — a fortress, a patriarchate, a great mosque. Read only until then.
    enabled: ENTER_NEVER_DELETE,
    description:
      'Why a city matters at a date (archbishopric, university, fortress, patriarchate, great mosque…): its id is ' +
      'what a city’s source line with the subject « reason » cites. Search before creating — a reason that exists ' +
      'is reused, never created twice; a reason tied to a faith names it, the sign depends on it.',
  },
  [Confessions.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A confession a city’s community belongs to (catholic, orthodox, Sunni Muslim, Jewish…): its id is what a ' +
      'community and its « community » line cite. Search before creating — one that exists is reused, never created twice.',
  },
  [People.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'The register of people: who someone is, nothing more — `name`, `kind` (`person` or `house`, a dynasty), ' +
      '`wikidata`; for a person `born` and `died`, each { year, month, day, circa, margin, calendar }, and `house` ' +
      '(the id of a record of kind house); for a house `founded`, `ended` and `founder`. No rank, role or ' +
      'confession here. Search by `wikidata` before creating — a person is entered once.',
  },
  [Territories.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      `The register of territories: what is held — a land (\`kind\` ${LAND_KINDS}) or an office (\`office\`) — ` +
      'with `name`, `wikidata`, `existsFrom`, `existsTo`. Never a point on the map, never its suzerain. Search by ' +
      '`wikidata` before creating.',
  },
  [Titles.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A title: a `person` (an id from people) holding a `territory` (an id from territories) over a `date` ' +
      '({ start, end }, each { year, month, day, circa, margin, calendar }; end empty for a single year), with its ' +
      '`lines` — at least one, each { source, where, quotation, asWritten }. `label` is written by the server. Search ' +
      'by person and territory before creating.',
  },
  [VassalLinks.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A link of vassalage: the title `vassal` answers, over a `date`, to the title `suzerain` (`answersTo` ' +
      '"suzerain") — or to no one (`answersTo` "no-one", only when a source states it: a sovereign; `suzerain` then ' +
      'stays empty). With its `lines`. Entered once per pair and period, reused by every place under it; a divergent ' +
      'reading is a second link. `label` is written by the server.',
  },
} as const

/**
 * Payload's MCP plugin, as this CMS uses it (`contribution/source-manager.md`, « Driven by voice »): the endpoint
 * `/api/mcp` and the collection of API keys, each key created by a contributor in the admin (group « MCP »), bound
 * to them, and choosing which of the operations above it allows.
 * @returns the plugin, for `buildConfig`'s `plugins`
 */
export function mcpAccess(): Plugin {
  return mcpPlugin({ collections: MCP_COLLECTIONS })
}
