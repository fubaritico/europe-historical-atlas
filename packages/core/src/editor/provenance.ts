import type { Provenance } from './documentEdits'

/**
 * Split a source declared as `"<name> (<licence>)"` into the provenance a year records.
 *
 * **One reading for both applications**: the Cartographer records the coast's anchors under the name this
 * returns, and the atlas finds them again by the same name — two parsers would drift, and a coast read as
 * no coast draws a frontier along every estuary.
 *
 * **It refuses rather than guesses** (`rules/error-handling.md`): a source with no licence in brackets
 * would otherwise have to be recorded under a licence nobody declared — and a licence is the one thing
 * this project cannot afford to make up, the GPL years being the reason it watches its sources at all.
 * @param source - an asset's `source` — the mask's or the rivers' — e.g.
 *   `"Natural Earth 10m land minus lakes (public domain)"`
 * @returns the name and the licence
 * @throws when the declaration does not end with its licence in brackets
 */
export function provenanceOf(source: string): Provenance {
  const provenance = parseProvenance(source)
  if (provenance === null) {
    throw new Error(
      `[provenance] the source "${source}" names no licence in brackets; no anchor can be recorded under it.`
    )
  }
  return provenance
}

/**
 * Read a source declared as `"<name> (<licence>)"`, without refusing — for a reader asking which anchors
 * were recorded under it, to whom *"none could have been"* is the exact answer when it names no licence.
 * @param source - an asset's `source`
 * @returns the name and the licence, or `null` when the declaration does not end with its licence
 */
export function parseProvenance(source: string): Provenance | null {
  const match = /^(.+?)\s*\(([^()]+)\)$/.exec(source.trim())
  const name = match?.[1]
  const licence = match?.[2]
  return name === undefined || licence === undefined ? null : { name, licence }
}
