import { getPayload, readMigrationFiles } from 'payload'

import { contentFileSchema } from '@europe-historical-atlas/core/data/contentFormat'

import { assertMigrated } from '../migrate/migrateBase'

import { toContent, toSiegeEnginePeriods } from './toContent'
import { chainRegister } from './toContentChain'
import { toContentTerritories } from './toContentTerritory'

import type { DocEvent } from './toContent'
import type { DocCitySheet } from './toContentCity'
import type { ContentFile } from '@europe-historical-atlas/core/data/contentFormat'
import type { SanitizedConfig } from 'payload'

/**
 * Read every event and every city at a date out of the base, as the atlas and the Cartographer read them (CMS-223,
 * ATLAS-295): through Payload's Local API with every locale and every relation resolved, and every siege engin's
 * period; turned into the content format — each city sheet first checked by the schema the form and the server check
 * it by, and given its chain of vassalage computed from the titles and the links — and the result checked against
 * `core`'s content schema. Shared by the export, which writes it for the atlas, and by the city alerts (CARTO-456),
 * which print it for the Cartographer's verdict without writing anything.
 * Anything wrong throws and names the event — nothing half-read goes on.
 * @param config - the CMS's configuration — the print gives it a logger on the standard error
 * @param warn - where a sheet the export leaves out is said
 * @returns the content, checked
 */
export async function readContent(
  config: SanitizedConfig,
  warn: (message: string) => void
): Promise<ContentFile> {
  const payload = await getPayload({ config })
  // A base behind the collections would fail mid-way on a missing column: refused first, the way out said (CMS-276)
  await assertMigrated(payload, await readMigrationFiles({ payload }))
  // The engins first: each siege is given the newest in use at its date.
  const engines = await payload.find({
    collection: 'siege-engines',
    depth: 0,
    pagination: false,
  })
  const periods = toSiegeEnginePeriods(engines.docs)
  const { docs } = await payload.find({
    collection: 'events',
    locale: 'all',
    depth: 2,
    pagination: false,
    sort: 'date.start.year',
  })
  const cities = await payload.find({
    collection: 'place-periods',
    locale: 'all',
    depth: 2,
    pagination: false,
    sort: 'date.start.year',
  })
  // The chains' register, read once: every title with its territory, every link (CARTO-435)
  const titles = await payload.find({ collection: 'titles', depth: 1, pagination: false })
  const links = await payload.find({ collection: 'vassal-links', depth: 0, pagination: false })
  const register = chainRegister(titles.docs, links.docs)
  // Every territory, for a polity of the map to be tied to one where it has no Wikidata id (CARTO-450)
  const territories = await payload.find({
    collection: 'territories',
    locale: 'fr',
    depth: 0,
    pagination: false,
    sort: 'name',
  })
  return contentFileSchema.parse({
    ...toContent(
      { events: docs as unknown as DocEvent[], cities: cities.docs as unknown as DocCitySheet[] },
      { periods, warn, register }
    ),
    territories: toContentTerritories(territories.docs),
  })
}
