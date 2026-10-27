import { getPayload } from 'payload'

import config from '../payload.config'
import { fetchPlaceEntity } from '../wikidata/placeEndpoints'

import { seed } from './seed'
import { ENGINE_SOURCES, SIEGE_ENGINES } from './siegeEngineData'
import { ACTORS, EVENTS, PLACES, SOURCES, TYPES } from './year1100'

import type { SeedCollection, SeedId, SeedStore } from './seed'

/**
 * Seed the base with the events of 1100 and the siege engins (`pnpm seed:cms`): through Payload's Local API, so every record passes the
 * same validation as the form, and the places read from Wikidata by the same fetch and reader as the form's button.
 * Anything wrong stops the run and names the record.
 */
const payload = await getPayload({ config })

const store: SeedStore = {
  async findId(collection: SeedCollection, field: string, value: string) {
    const { docs } = await payload.find({
      collection,
      where: { [field]: { equals: value } },
      locale: 'fr',
      limit: 1,
      depth: 0,
      pagination: false,
    })
    return docs[0]?.id ?? null
  },
  async create(collection: SeedCollection, data: Record<string, unknown>) {
    // The data is built per collection in `seed.ts`; Payload validates it against the collection here.
    const doc = await payload.create({ collection, data: data as never, locale: 'fr' })
    return doc.id
  },
  async readField(collection: SeedCollection, id: SeedId, field: string) {
    const doc = await payload.findByID({ collection, id, locale: 'fr', depth: 0 })
    return (doc as unknown as Record<string, unknown>)[field]
  },
  async update(collection: SeedCollection, id: SeedId, data: Record<string, unknown>) {
    await payload.update({ collection, id, data, locale: 'fr' })
  },
}

const report = await seed(store, (id) => fetchPlaceEntity(id), {
  types: TYPES,
  sources: [...SOURCES, ...ENGINE_SOURCES],
  actors: ACTORS,
  places: PLACES,
  events: EVENTS,
  siegeEngines: SIEGE_ENGINES,
})
for (const [collection, count] of Object.entries(report)) {
  console.warn(
    `[CMS] ${collection}: ${String(count.created)} created, ${String(count.found)} already there, ${String(count.updated)} given a value`
  )
}
process.exit(0)
