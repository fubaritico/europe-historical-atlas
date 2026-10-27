import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import { contentFileSchema } from '@europe-historical-atlas/core/data/contentFormat'

import config from '../payload.config'

import { toContent, toSiegeEnginePeriods } from './toContent'

import type { DocEvent } from './toContent'

/** Where the atlas reads its content: its `public/`, served as `/content/events.json`. */
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content/events.json'
)

/**
 * Export every event for the atlas (CMS-223): read them through Payload's Local API with every locale and every
 * relation resolved, and every siege engin's period; turn them into the content format, check the result against
 * `core`'s schema, write it.
 * Anything wrong stops the export and names the event — nothing half-written reaches the atlas.
 */
const payload = await getPayload({ config })
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
const content = contentFileSchema.parse(
  toContent(docs as unknown as DocEvent[], {
    periods,
    warn: (message) => {
      console.warn(message)
    },
  })
)
await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(content, null, 2)}\n`)
console.warn(`[CMS] ${String(content.events.length)} event(s) written to ${OUT}`)
process.exit(0)
