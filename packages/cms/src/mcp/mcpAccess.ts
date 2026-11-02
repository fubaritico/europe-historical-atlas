import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'

import type { Plugin } from 'payload'

/**
 * What a model may do in a collection over MCP: read, create and change — **never delete**. A deletion by a model is
 * the one gesture that is hard to take back; the dev deletes by hand, in the admin (the historian's call, 2026-11-02).
 */
const ENTER_NEVER_DELETE = { find: true, create: true, update: true, delete: false } as const

/**
 * The collections a model reaches over MCP — the ones the historian enters its sources into: the places, a city at
 * a date with its holder (CMS-335), the sources. Everything else stays out until a need names it.
 *
 * Each entry still goes through Payload as the key's user: the collections' access rules and hooks — the sheet's
 * check before saving included — apply to what a model writes as to what the dev types.
 */
export const MCP_COLLECTIONS = {
  [Places.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A place on the map: a city with its name, its position `location` as [longitude, latitude] — longitude ' +
      'first — and its Wikidata id `wikidata`.',
  },
  [PlacePeriods.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description:
      'A city at a date (« Ville à une date »): its importance, the polity holding it (holderName, holderQid) ' +
      'and its source lines, each with a subject, a source and a quotation.',
  },
  [Sources.slug]: {
    enabled: ENTER_NEVER_DELETE,
    description: 'A source: a book, an atlas, an encyclopaedia page or a database, with its kind.',
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
