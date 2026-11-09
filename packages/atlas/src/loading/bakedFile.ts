/**
 * A file the build writes into the site beside a year's files — its names (ATLAS-333), its overlaps (ATLAS-399) — read by
 * the page. **None is not a failure**: the dev server has none, and a year added since the build has none; the page then
 * computes what the file would have held.
 */

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/**
 * Fetch a baked file and read it.
 * @param url - where the build wrote it
 * @param read - its reader, which checks its shape before it is trusted
 * @param fetchFile - the transport
 * @returns what it holds, or `null` when the site holds no such file
 * @throws when the file is there but cannot be read — the transport failed, or it is not what the reader expects
 */
export async function fetchBakedFile<T>(
  url: string,
  read: (value: unknown, where: string) => T,
  fetchFile: FetchLike
): Promise<T | null> {
  const response = await fetchFile(url)
  // No file: computed in the page.
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`)
  // Vite's dev server may answer a path it does not hold with its own page, as HTML: no file either.
  const type = response.headers.get('content-type')
  if (!type?.includes('json')) return null
  return read(await response.json(), url)
}
