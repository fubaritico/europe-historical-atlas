import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Confessions } from '../collections/Confessions'
import { HierarchyLinks } from '../collections/HierarchyLinks'
import { ImportanceReasons } from '../collections/ImportanceReasons'
import { People } from '../collections/People'
import { PeriodNames } from '../collections/PeriodNames'
import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'
import { TERRITORY_KINDS, Territories } from '../collections/Territories'
import { Titles } from '../collections/Titles'
import { OTHER_LANGUAGES, REQUIRED_OTHER_LANGUAGES } from '../fields/nameForms'

/**
 * The rule of a record's names in the other languages, as the MCP's descriptions say it (CMS-495): built from the
 * lists the validation reads, so the agents read the rule the server holds.
 */
const OTHER_NAMES_RULE =
  '`otherNames` — its name in the other languages, one line a language, each { language, form } with language ' +
  `among ${OTHER_LANGUAGES.join(', ')}, never French and never twice the same; a line in ` +
  `${REQUIRED_OTHER_LANGUAGES.join(', ')} is required on every create and every update, and an update that ` +
  'carries `otherNames` replaces every line: send the existing ones back with the new one'

import type { Plugin } from 'payload'

/**
 * What a model may do over MCP, in every collection: read, create and change — **never delete** (2026-11-02 for the
 * registers, a person, a territory, a confession or a reason shared by many sheets; CMS-508 for the rest, below).
 */
const ENTER_NEVER_DELETE = { find: true, create: true, update: true, delete: false } as const

/**
 * How a model **puts a record in the bin, to undo its own errors**, said in the description of each collection that
 * has one (CMS-508, the dev's go of 2026-11-24) — the one thing that sets those collections apart. Undoing an error was a deletion from
 * CMS-454 (the dev, 2026-11-18: « je n'efface plus tes erreurs »), and 39 sheets deleted on 2026-11-24 had to be put
 * back by hand from a copy: the plugin's delete tool calls `payload.delete`, which erases for good even in a
 * collection with a bin (Payload 3.92, `operations/deleteByID.ts` — the bin is the admin's own gesture, an update
 * writing `deletedAt`, `ui/elements/DeleteDocument`). So the key no longer deletes; the model writes `deletedAt`
 * through the update tool, as the admin does. Three guards hold it:
 * - a record something still cites is refused, naming what cites it (`claimDependants.refuseTrashingCited`): a place
 *   under a sheet or an event, a source under a line, a title under a link or a sheet — so an error is undone from
 *   the sheet down to its place and its source, never the other way;
 * - one record at a time, by its id: the plugin's tool also takes a filter, which one call could empty a collection
 *   with — refused on these six collections (`refuseBulkRemovalOverMcp`);
 * - the bin is the dev's: a record in it is restored, or erased, in the admin alone — the update tool finds no record
 *   in the bin. A model can still read the bin, the find tool taking a `trash` flag (review SEC-002): reading only.
 *
 * **Not held**: nothing says which records a key created, so the model can put in the bin a sheet the dev entered —
 * which he restores from it.
 */
const TRASH_RULE =
  'To undo an error, put the record in the bin — never delete it: update it by its `id` with `deletedAt` set to the ' +
  'current date and time (ISO 8601); it leaves every search, and the dev restores it or empties the bin in the admin. ' +
  'One record at a time, never by a `where`; a record another still cites is refused, naming what cites it.'

/** The kinds of land a territory can be, for its description — read from the collection, the office said apart. */
const LAND_KINDS = TERRITORY_KINDS.filter((kind) => kind !== 'office').join(', ')

/**
 * The collections a model reaches over MCP — the ones the historian enters its sources into: the places, a city at
 * a date with its holder (CMS-335), the sources, the importance reasons a city's line cites (CMS-431), the
 * confessions of its communities (CMS-433); and the hierarchical chain (CMS-422) — the register of people, the
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
      `A place on the map: a city with its \`name\` (today's French name), ${OTHER_NAMES_RULE}, ` +
      'its position `location` as { longitude, latitude } — Wikidata ' +
      'gives the latitude first — its Wikidata id `wikidata`, and its geographic lot today, `country` and ' +
      '`region`, each `{ name, wikidata }` — the country (P17) and the first-level division Wikidata gives. ' +
      TRASH_RULE,
  },
  [PlacePeriods.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A city at a date (« Ville à une date »): its importance; `periodName`, an id from period-names — the name ' +
      'the place bore at that date, a name of that same place, the one the map writes; its holder `holderTitle`, an id from titles — the ' +
      'person, for the territory held, the city answers to at that date; its hierarchical chain is computed from the ' +
      'links of that title, never entered here — and, until 1100 is taken over, the polity holding it as text ' +
      '(holderName, holderQid); its source lines, each with a subject, a source and a quotation; its `communities`, each a confession, a ' +
      '`weight` (dominant or present) and `weightAttested` — true only when a source says that weight — and each named ' +
      'by a line with the subject « community » citing the same confession; `showInAtlas` (false by default) ' +
      'decides whether the published atlas shows it — every city still reaches the Cartographer. ' +
      TRASH_RULE,
  },
  [PeriodNames.slug]: {
    // The same guards as a title (CMS-495): a name a sheet cites refused, one at a time, to the bin only (CMS-508).
    enabled: ENTER_NEVER_DELETE,
    description:
      'A name of the time (« Nom d’époque »): the name a `place` (an id from places) bore — Ankara is « Ancyre » in ' +
      '1100 — as `forms`, one line a language, each { language, form } with language among fr, en, es, it, de and ' +
      'never the same language twice (another spelling in one language is another record); with its `lines`, each ' +
      '{ source, where, quotation, asWritten }. The place itself bears its present name. `label` is written by the ' +
      'server. Search by `place` before creating — a name is entered once and reused by the sheets of every year. ' +
      TRASH_RULE,
  },
  [Sources.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A source: a book, an atlas, an encyclopaedia page or a database, with its kind. ' +
      TRASH_RULE,
  },
  [ImportanceReasons.slug]: {
    // Opened to creation on the dev's call, 2026-11-13 (CMS-431): the list knew only the Latin world, and the
    // historian adds what a source attests — a fortress, a patriarchate, a great mosque. Read only until then.
    enabled: ENTER_NEVER_DELETE,
    description:
      'Why a city matters at a date (archbishopric, university, fortress, patriarchate, great mosque…): its id is ' +
      'what a city’s source line with the subject « reason » cites. Search before creating — a reason that exists ' +
      'is reused, never created twice; a reason tied to a faith names it, the sign depends on it. ' +
      `Its \`name\` is French, ${OTHER_NAMES_RULE}.`,
  },
  [Confessions.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A confession a city’s community belongs to (catholic, orthodox, Sunni Muslim, Jewish…): its id is what a ' +
      'community and its « community » line cite. Search before creating — one that exists is reused, never created twice. ' +
      `Its \`name\` is French, ${OTHER_NAMES_RULE}.`,
  },
  [People.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      `The register of people: who someone is, nothing more — \`name\` (French), ${OTHER_NAMES_RULE}, ` +
      '`kind` (`person` or `house`, a dynasty), ' +
      '`wikidata`; for a person `born` and `died`, each { year, month, day, circa, margin, calendar }, and `house` ' +
      '(the id of a record of kind house); for a house `founded`, `ended` and `founder`. No rank, role or ' +
      'confession here. Search by `wikidata` before creating — a person is entered once.',
  },
  [Territories.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      `The register of territories: what is held — a land (\`kind\` ${LAND_KINDS}) or an office (\`office\`) — ` +
      `with \`name\` (its French name), ${OTHER_NAMES_RULE} — \`wikidata\`, ` +
      '`existsFrom`, `existsTo`. Never a point on the map, never its suzerain. Search by `wikidata` before creating.',
  },
  [Titles.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A title: a `person` (an id from people) holding a `territory` (an id from territories) over a `date` ' +
      '({ start, end }, each { year, month, day, circa, margin, calendar }; end empty for a single year), with its ' +
      '`lines` — at least one, each { source, where, quotation, asWritten }. `sovereign` true when the title answers ' +
      'to no one over its dates: the hierarchical chain stops at it (the dev, 2026-11-16 — never a link to no one). ' +
      '`label` is written by the server. Search by person and territory before creating. ' +
      TRASH_RULE,
  },
  [HierarchyLinks.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A hierarchical link: the title `vassal` answers, over a `date`, to the title `suzerain` (`answersTo` ' +
      '"suzerain", always — a sovereign is ticked on its title, `sovereign`, never entered as a link to no one). With ' +
      'its `lines`. Entered once per pair and period, reused by every place under it; a divergent reading is a second ' +
      'link. `label` is written by the server. ' +
      TRASH_RULE,
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
