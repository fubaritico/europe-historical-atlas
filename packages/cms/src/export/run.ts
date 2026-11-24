import config from '../payload.config'

import { readContent } from './readContent'
import { CONTENT_DIR, folderWriter, writeContent } from './writeContent'

/**
 * Export every event and every city at a date (CMS-223, ATLAS-295): read them out of the base (`readContent`), write
 * them as two files, one per reader (`writeContent`). Anything wrong in the base stops the export before a file is
 * written, and names the record. The CMS's button « Exporter la base » runs the same two steps (CMS-499).
 */
const content = await readContent(await config, (message) => {
  console.warn(message)
})
const written = await writeContent(content, folderWriter(CONTENT_DIR))
console.warn(
  `[CMS] ${String(written.events)} event(s) written to ${CONTENT_DIR}: ${String(written.atlasCities)} city sheet(s) in atlas.json, ${String(written.cities)} in cartographer.json`
)
process.exit(0)
