import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload, readMigrationFiles } from 'payload'

import { contentFileSchema } from '@europe-historical-atlas/core/data/contentFormat'

import { assertMigrated } from '../migrate/migrateBase'
import config from '../payload.config'

import { toContent, toSiegeEnginePeriods } from './toContent'
import { chainRegister } from './toContentChain'

import type { DocEvent } from './toContent'
import type { DocCitySheet } from './toContentCity'

/** Where the atlas reads its content: its `public/`, served as `/content/events.json`. */
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content/events.json'
)

/**
 * Export every event and every city at a date for the atlas (CMS-223, ATLAS-295): read them through Payload's Local
 * API with every locale and every relation resolved, and every siege engin's period; turn them into the content
 * format — each city sheet first checked by the schema the form and the server check it by, and given its chain of
 * vassalage computed from the titles and the links — check the result
 * against `core`'s content schema, write it.
 * Anything wrong stops the export and names the event — nothing half-written reaches the atlas.
 */
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
const content = contentFileSchema.parse(
  toContent(
    { events: docs as unknown as DocEvent[], cities: cities.docs as unknown as DocCitySheet[] },
    {
      periods,
      warn: (message) => {
        console.warn(message)
      },
      register,
    }
  )
)
await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(content, null, 2)}\n`)
console.warn(
  `[CMS] ${String(content.events.length)} event(s) and ${String(content.cities.length)} city sheet(s) written to ${OUT}`
)
process.exit(0)
