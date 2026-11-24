/**
 * The button's side of the export (CMS-499): call the route, and turn its answer into the sentence to show. No React
 * here, so it is exercised with a stub fetch.
 */

import type { ExportSummary } from '../../export/writeContent'

/** What an export answers: the sentence to show, and whether it went through. */
export type ExportAnswer = { ok: true; message: string } | { ok: false; message: string }

/** Said when the route itself cannot be reached — the CMS's server, not the export. */
const SERVER_DOWN = 'L’outil de contribution ne répond pas : l’export n’a pas été lancé, réessayez.'

/** How numbers are written to him: French, a thin space every three digits. */
const NUMBER = new Intl.NumberFormat('fr-FR')

/**
 * A count and its noun, singular or plural.
 * @param count - the count
 * @param one - the noun for one
 * @param many - the noun for several, or none
 * @returns e.g. « 13 698 villes »
 */
function counted(count: number, one: string, many: string): string {
  return `${NUMBER.format(count)} ${count === 1 ? one : many}`
}

/**
 * The sentence an export that went through is told by.
 * @param written - what it wrote, counted
 * @returns e.g. « Base exportée : 11 événements, 13 698 villes dont 116 sur l’atlas, 402 territoires. »
 */
export function exportedSentence(written: ExportSummary): string {
  const events = counted(written.events, 'événement', 'événements')
  const cities = counted(written.cities, 'ville', 'villes')
  const territories = counted(written.territories, 'territoire', 'territoires')
  return `Base exportée : ${events}, ${cities} dont ${NUMBER.format(written.atlasCities)} sur l’atlas, ${territories}.`
}

/**
 * Whether a value is what the route answers when the export went through.
 * @param value - the body read
 * @returns `true` for an export's count
 */
function isSummary(value: unknown): value is ExportSummary {
  if (typeof value !== 'object' || value === null) return false
  const keys: (keyof ExportSummary)[] = ['events', 'atlasCities', 'cities', 'territories']
  return keys.every(
    (key) => key in value && typeof (value as Record<string, unknown>)[key] === 'number'
  )
}

/**
 * Run the export on the CMS's server.
 * @param fetchFile - how to fetch; the browser's in the button
 * @returns the sentence to show, and whether it went through
 */
export async function runExport(fetchFile: typeof fetch = fetch): Promise<ExportAnswer> {
  let response: Response
  try {
    response = await fetchFile('/api/export-content', { method: 'POST', credentials: 'include' })
  } catch (error: unknown) {
    console.error('[CMS] the export route could not be reached', error)
    return { ok: false, message: SERVER_DOWN }
  }
  // The server answered: a body it cannot read is an unexpected answer, not a silent server (review QUAL-004).
  const body: unknown = await response.json().catch(() => null)
  if (response.ok && isSummary(body)) return { ok: true, message: exportedSentence(body) }
  const message =
    typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Réponse inattendue de l’export (${String(response.status)}).`
  console.error(`[CMS] the export failed: ${message}`)
  return { ok: false, message }
}
