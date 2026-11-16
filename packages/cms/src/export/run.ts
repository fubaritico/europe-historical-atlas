import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../payload.config'

import { readContent } from './readContent'

/** Where the atlas reads its content: its `public/`, served as `/content/events.json`. */
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content/events.json'
)

/**
 * Export every event and every city at a date for the atlas (CMS-223, ATLAS-295): read them out of the base
 * (`readContent`), write them. Anything wrong stops the export and names the event — nothing half-written reaches the
 * atlas.
 */
const content = await readContent(await config, (message) => {
  console.warn(message)
})
await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(content, null, 2)}\n`)
console.warn(
  `[CMS] ${String(content.events.length)} event(s) and ${String(content.cities.length)} city sheet(s) written to ${OUT}`
)
process.exit(0)
