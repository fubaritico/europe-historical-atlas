/**
 * Where the atlas reads the content it pins on the map — the contribution's export (CMS-224).
 *
 * A port, so the atlas's pipeline is driven by a stub in its tests, and a fetch-backed implementation that reads the
 * static file the export writes into the atlas's `public/` (`plan.md` P7: static JSON, chosen 2026-09-24).
 */

import { fetchWithin } from '../utils/fetchWithin'

import { assetError } from './assetError'
import { contentFileSchema } from './contentFormat'
import { checkPayload } from './yearSource'

import type { ContentFile } from './contentFormat'

/** Something that can load the content file. */
export interface ContentSource {
  /**
   * Load every event.
   * @returns the content, checked against its schema
   */
  load(): Promise<ContentFile>
}

/**
 * Read a fetched value as the content file.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the content
 */
export function parseContentFile(value: unknown, source: string): ContentFile {
  return checkPayload('content', source, contentFileSchema, value)
}

/**
 * Create a {@link ContentSource} that fetches the exported file.
 * @param path - its URL, `/content/events.json`
 * @returns a fetch-backed content source
 */
export function createFetchContentSource(path: string): ContentSource {
  return {
    async load(): Promise<ContentFile> {
      const response = await fetchWithin(path)
      if (!response.ok)
        throw assetError('content', 'transport', path, `HTTP ${String(response.status)}`)
      return parseContentFile(await response.json(), path)
    },
  }
}
