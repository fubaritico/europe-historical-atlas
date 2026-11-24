import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CMS_COLLECTIONS } from '../collections/cmsCollections'

import { SCHEMA_MAP_PATH, schemaMap } from './schemaMap'

import type { CollectionConfig, SanitizedConfig } from 'payload'

/** The repository's root, from this file: `packages/cms/src/schemaMap/`. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

/** The map's file on disk. */
export const SCHEMA_MAP_FILE = path.join(ROOT, SCHEMA_MAP_PATH)

/**
 * The CMS's own collections as the built configuration holds them — Payload fills the collections in place when it
 * builds them (measured, CMS-280: a map drawn before and after a build differ), so the map is always drawn from the
 * built ones, whoever draws it: what the base holds, the fields Payload adds included. The MCP plugin's keys and
 * Payload's own collections are left out.
 * @param config - the configuration, built
 * @returns the CMS's collections, in the admin's order
 */
export function cmsCollectionsIn(config: SanitizedConfig): CollectionConfig[] {
  const ours = new Set(CMS_COLLECTIONS.map(({ slug }) => slug))
  return config.collections.filter(({ slug }) => ours.has(slug))
}

/**
 * Write the map of the schema (CMS-280) — by `pnpm cms:schema`, and by `pnpm migrate:create` after each migration, so
 * the map follows every field change.
 * @param collections - the collections drawn, from the built configuration (`cmsCollectionsIn`)
 * @param file - where the map is written
 * @returns the file written
 */
export function writeSchemaMap(collections: readonly CollectionConfig[], file: string): string {
  writeFileSync(file, schemaMap(collections))
  return file
}
