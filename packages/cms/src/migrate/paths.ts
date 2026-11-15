import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where the schema's migrations live, each `.ts` with the `.json` snapshot it was generated against (CMS-276). Its own
 * module, so a script that only needs the folder does not load the whole config, which wants the `.env`.
 */
export const MIGRATION_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations'
)
