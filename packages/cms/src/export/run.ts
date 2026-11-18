import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '../payload.config'

import { contentFiles, contentText } from './contentFiles'
import { readContent } from './readContent'

/** Where the export is written: the atlas's `public/content/`, which the Cartographer serves too. */
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content'
)

/**
 * Export every event and every city at a date (CMS-223, ATLAS-295): read them out of the base (`readContent`), write
 * them as two files, one per reader (`contentFiles`) — `atlas.json`, what the atlas shows, and `cartographer.json`,
 * everything. Anything wrong in the base stops the export before a file is written, and names the event. The two
 * files are then written one after the other: should the second fail (a full disk), the pair is of two exports —
 * said by the test of the committed files (`committedContent.test.ts`), and mended by running the export again.
 */
const content = await readContent(await config, (message) => {
  console.warn(message)
})
const files = contentFiles(content)
// Both texts made before either is written: what can fail between the two writes is the disk alone.
const texts = { atlas: contentText(files.atlas), cartographer: contentText(files.cartographer) }
await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'atlas.json'), texts.atlas)
await writeFile(path.join(OUT, 'cartographer.json'), texts.cartographer)
console.warn(
  `[CMS] ${String(content.events.length)} event(s) written to ${OUT}: ${String(files.atlas.cities.length)} city sheet(s) in atlas.json, ${String(content.cities.length)} in cartographer.json`
)
process.exit(0)
