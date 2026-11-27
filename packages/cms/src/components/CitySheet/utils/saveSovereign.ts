import { refusalOf } from './saveHierarchyLink'

import type { LinkAnswer } from './saveHierarchyLink'

/** Ticks or unticks « souverain » on a title, in the base — the port every part of the chain is handed. */
export type SaveSovereign = (title: number | string, sovereign: boolean) => Promise<LinkAnswer>

/**
 * Ticks or unticks « souverain » on a title (the dev, 2026-11-16: *"the sovereign, you tick it"*), through Payload's
 * API so the collection's rules hold. Ticked, the hierarchical chain stops at that title over its dates.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param title - the title's id
 * @param sovereign - whether it is sovereign
 * @returns saved, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server fails, or refuses without a sentence
 */
export async function saveSovereign(
  fetcher: typeof fetch,
  api: string,
  title: number | string,
  sovereign: boolean
): Promise<LinkAnswer> {
  const response = await fetcher(`${api}/titles/${String(title)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sovereign }),
  })
  if (response.ok) return { kind: 'saved' }
  if (response.status >= 500) {
    throw new Error(
      `[CMS] the API failed to save a title's sovereignty (${String(response.status)})`
    )
  }
  return { kind: 'refused', message: await refusalOf(response, 'a title’s sovereignty') }
}
