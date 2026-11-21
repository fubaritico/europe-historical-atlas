import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Confessions } from '../collections/Confessions'
import { ImportanceReasons } from '../collections/ImportanceReasons'
import { People } from '../collections/People'
import { PeriodNames } from '../collections/PeriodNames'
import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'
import { TERRITORY_KINDS, Territories } from '../collections/Territories'
import { Titles } from '../collections/Titles'
import { VassalLinks } from '../collections/VassalLinks'

import type { Plugin } from 'payload'

/**
 * What a model may do in a register over MCP: read, create and change — **never delete**. A person, a territory, a
 * confession or a reason is shared by many sheets; the dev deletes those by hand, in the admin (2026-11-02).
 */
const ENTER_NEVER_DELETE = { find: true, create: true, update: true, delete: false } as const

/**
 * What a model may do in a collection it enters its own records into: read, create, change — and **delete, to undo
 * its own errors** (CMS-454; the dev, 2026-11-18: « je n'efface plus tes erreurs » — a sheet entered for the wrong
 * place came back to him each time). Four guards hold it:
 * - the key must be given the operation: the box « delete » is ticked by the dev on the key, per collection;
 * - a record something still cites is refused, naming what cites it (`claimDependants.refuseDeletingCited`): a place
 *   under a sheet or an event, a source under a line, a title under a link or a sheet — so an error is undone from
 *   the sheet down to its place and its source, never the other way;
 * - one record at a time, by its id: the plugin's tool also takes a filter, which one call could empty a collection
 *   with — refused on these five collections (`refuseBulkDeleteOverMcp`);
 * - a deletion is not taken back: there is no bin — the base's copies are the way back (CMS-278).
 *
 * **Not held**: nothing says which records a key created, so the model can delete a sheet the dev entered. Told to the
 * dev; a « created by » on each record would need a migration.
 */
const ENTER_AND_DELETE = { find: true, create: true, update: true, delete: true } as const

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
    enabled: ENTER_AND_DELETE,
    description:
      // The plugin takes a point as an object and stores it as Payload's [longitude, latitude] tuple (3.92.0,
      // `utils/schemaConversion/transformPointFields.js`, `utils/transformPointDataToPayload.js`).
      'A place on the map: a city with its name, its position `location` as { longitude, latitude } — Wikidata ' +
      'gives the latitude first — its Wikidata id `wikidata`, and its geographic lot today, `country` and ' +
      '`region`, each `{ name, wikidata }` — the country (P17) and the first-level division Wikidata gives.',
  },
  [PlacePeriods.slug]: {
    enabled: ENTER_AND_DELETE,
    description:
      'A city at a date (« Ville à une date »): its importance; `periodName`, an id from period-names — the name ' +
      'the place bore at that date, a name of that same place, the one the map writes; its holder `holderTitle`, an id from titles — the ' +
      'person, for the territory held, the city answers to at that date; its chain of vassalage is computed from the ' +
      'links of that title, never entered here — and, until 1100 is taken over, the polity holding it as text ' +
      '(holderName, holderQid); its source lines, each with a subject, a source and a quotation; its `communities`, each a confession, a ' +
      '`weight` (dominant or present) and `weightAttested` — true only when a source says that weight — and each named ' +
      'by a line with the subject « community » citing the same confession; `showInAtlas` (false by default) ' +
      'decides whether the published atlas shows it — every city still reaches the Cartographer.',
  },
  [PeriodNames.slug]: {
    // The same guards as a title (CMS-495): the box ticked on the key, a name a sheet cites refused, one at a time.
    enabled: ENTER_AND_DELETE,
    description:
      'A name of the time (« Nom d’époque »): the name a `place` (an id from places) bore — Ankara is « Ancyre » in ' +
      '1100 — as `forms`, one line a language, each { language, form } with language among fr, en, es, it, de and ' +
      'never the same language twice (another spelling in one language is another record); with its `lines`, each ' +
      '{ source, where, quotation, asWritten }. The place itself bears its present name. `label` is written by the ' +
      'server. Search by `place` before creating — a name is entered once and reused by the sheets of every year.',
  },
  [Sources.slug]: {
    enabled: ENTER_AND_DELETE,
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
    enabled: ENTER_AND_DELETE,
    description:
      'A title: a `person` (an id from people) holding a `territory` (an id from territories) over a `date` ' +
      '({ start, end }, each { year, month, day, circa, margin, calendar }; end empty for a single year), with its ' +
      '`lines` — at least one, each { source, where, quotation, asWritten }. `sovereign` true when the title answers ' +
      'to no one over its dates: the chain of vassalage stops at it (the dev, 2026-11-16 — never a link to no one). ' +
      '`label` is written by the server. Search by person and territory before creating.',
  },
  [VassalLinks.slug]: {
    enabled: ENTER_AND_DELETE,
    description:
      'A link of vassalage: the title `vassal` answers, over a `date`, to the title `suzerain` (`answersTo` ' +
      '"suzerain", always — a sovereign is ticked on its title, `sovereign`, never entered as a link to no one). With ' +
      'its `lines`. Entered once per pair and period, reused by every place under it; a divergent reading is a second ' +
      'link. `label` is written by the server.',
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
