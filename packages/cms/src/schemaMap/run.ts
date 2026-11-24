import config from '../payload.config'

import { SCHEMA_MAP_FILE, cmsCollectionsIn, writeSchemaMap } from './writeSchemaMap'

/**
 * `pnpm cms:schema` (CMS-280): the map of the schema written from the built configuration. Wiring only — `schemaMap`
 * draws it, tested there; no base is opened.
 */
try {
  console.warn(
    `[CMS] schema map written: ${writeSchemaMap(cmsCollectionsIn(await config), SCHEMA_MAP_FILE)}`
  )
  process.exit(0)
} catch (error: unknown) {
  console.error(`[CMS] cms:schema — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
