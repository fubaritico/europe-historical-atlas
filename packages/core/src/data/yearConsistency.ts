/**
 * The checks that need more than one file at a time — where a year's three files first meet.
 *
 * A schema can say a ring holds whole non-negative numbers. Only this layer can say that index 4 102 is
 * past the end of a table of 412 anchors, and **that is the class of failure this project fears most**: an
 * out-of-range index resolves to `undefined`, whose coordinates are `NaN`, and a `NaN` ring rasterises as a
 * polity claiming nothing anywhere — a country silently absent from the map, with no error and nothing to
 * see. Same shape as the `reliefWorldY` defect recorded in `rules/error-handling.md`: a plausible answer
 * replacing a broken one.
 *
 * Hence `consistency` as its own arm of the taxonomy, reported per file: the error names **the file holding
 * the bad reference**, not the one it points at, because that is the file someone has to edit.
 */

import { assetError } from './assetError'
import { YEAR_FORMAT_VERSION } from './yearFormat'

import type { AssetKind } from './assetError'
import type { AuthoredYear, YearBorders, YearPolities, YearRegistry } from './yearFormat'

/** The three files of one year, each already checked against its own schema. */
export interface YearFiles {
  /** Who exists. */
  registry: YearRegistry
  /** What they hold. */
  polities: YearPolities
  /** How their limits are dressed. */
  borders: YearBorders
}

/**
 * Fail, naming the file that has to be edited and what it disagrees with.
 * @param asset - the file of the year that holds the wrong value, the one to edit
 * @param source - the folder the year was loaded from
 * @param detail - what that file says and what the other file says instead
 * @returns never; always throws a `consistency` asset error
 */
function disagree(asset: AssetKind, source: string, detail: string): never {
  throw assetError(asset, 'consistency', source, detail)
}

/**
 * Refuse a format version this code does not know.
 *
 * `semantic` rather than `consistency`: the file is internally sound and simply not ours to read, which is
 * the same class as a land mask cropped to a different part of the world.
 * @param files - the three payloads
 * @param source - the folder they came from, for the message
 */
function checkVersions(files: YearFiles, source: string): void {
  const seen: [AssetKind, number][] = [
    ['yearRegistry', files.registry.version],
    ['yearPolities', files.polities.version],
    ['yearBorders', files.borders.version],
  ]
  for (const [asset, version] of seen)
    if (version !== YEAR_FORMAT_VERSION)
      throw assetError(
        asset,
        'semantic',
        source,
        `format version ${String(version)}, this reader knows ${String(YEAR_FORMAT_VERSION)}`
      )
}

/**
 * Refuse three files that do not describe the same year.
 *
 * The registry is taken as the reference, so the error names whichever file differs from it — a folder
 * named 1110 holding a 1100 territory is exactly the mistake `[Save as…]` asks for the year to prevent.
 * @param files - the three payloads
 * @param source - the folder they came from
 */
function checkYears(files: YearFiles, source: string): void {
  const expected = files.registry.year
  if (files.polities.year !== expected)
    disagree(
      'yearPolities',
      source,
      `year ${String(files.polities.year)}, the registry says ${String(expected)}`
    )
  if (files.borders.year !== expected)
    disagree(
      'yearBorders',
      source,
      `year ${String(files.borders.year)}, the registry says ${String(expected)}`
    )
}

/**
 * Check the registry against itself: unique ids, suzerains that exist, and no loop of homage.
 *
 * **The cycle check earns its place by what it prevents, not by what it catches.** Anything walking the
 * chain to find a polity's depth — which is what decides who paints a cell and how heavy a border is drawn
 * — would spin for ever on a loop. A hang has no message and no stack worth reading.
 * @param registry - the year's registry
 * @param source - where it came from
 * @returns the ids, for the checks that follow
 */
function checkRegistry(registry: YearRegistry, source: string): Set<string> {
  const ids = new Set<string>()
  for (const polity of registry.polities) {
    if (ids.has(polity.id))
      disagree('yearRegistry', source, `two polities share the id "${polity.id}"`)
    ids.add(polity.id)
  }

  const suzerainOf = new Map<string, string>()
  for (const polity of registry.polities) {
    if (polity.suzerain === null) continue
    if (!ids.has(polity.suzerain))
      disagree(
        'yearRegistry',
        source,
        `"${polity.id}" owes "${polity.suzerain}", which is in no registry entry`
      )
    suzerainOf.set(polity.id, polity.suzerain)
  }

  for (const start of suzerainOf.keys()) {
    const walked = new Set<string>([start])
    let current = suzerainOf.get(start)
    while (current !== undefined) {
      if (walked.has(current))
        disagree('yearRegistry', source, `homage forms a loop through "${current}"`)
      walked.add(current)
      current = suzerainOf.get(current)
    }
  }
  return ids
}

/**
 * Refuse a ring that points past the end of the anchor table.
 *
 * **The single most valuable check in this file.** An index of 4 102 into 412 anchors resolves to
 * `undefined`, whose coordinates read as `NaN`, and a `NaN` ring rasterises as a polity claiming nothing
 * anywhere. The map loses a country and says nothing.
 * @param asset - which file holds the ring
 * @param ring - the indices to check
 * @param anchorCount - how many anchors the year actually has
 * @param where - how to name this ring in a message
 * @param source - where the file came from
 */
function checkRingRange(
  asset: AssetKind,
  ring: readonly number[],
  anchorCount: number,
  where: string,
  source: string
): void {
  for (const index of ring)
    if (index >= anchorCount)
      disagree(asset, source, `${where} uses anchor ${String(index)} of ${String(anchorCount)}`)
}

/**
 * Check the anchor table against its parallel source array and the declared sources.
 * @param polities - the year's territory
 * @param source - where it came from
 */
function checkAnchorTable(polities: YearPolities, source: string): void {
  const anchorCount = polities.anchors.length
  if (polities.anchorSource.length !== anchorCount)
    disagree(
      'yearPolities',
      source,
      `${String(polities.anchorSource.length)} anchor sources for ${String(anchorCount)} anchors`
    )
  const sourceIds = new Set(polities.sources.map((provenance) => provenance.id))
  for (const [index, id] of polities.anchorSource.entries())
    if (!sourceIds.has(id))
      disagree(
        'yearPolities',
        source,
        `anchorSource[${String(index)}] names source ${String(id)}, undeclared`
      )
}

/**
 * Check every claim and every declared gap against the registry and the anchor table.
 * @param polities - the year's territory
 * @param ids - the registry's polity ids
 * @param source - where it came from
 */
function checkClaims(polities: YearPolities, ids: ReadonlySet<string>, source: string): void {
  const anchorCount = polities.anchors.length
  for (const claim of polities.claims) {
    if (!ids.has(claim.polity))
      disagree(
        'yearPolities',
        source,
        `a claim names "${claim.polity}", which is in no registry entry`
      )
    for (const [r, ring] of claim.rings.entries())
      checkRingRange(
        'yearPolities',
        ring,
        anchorCount,
        `"${claim.polity}" ring ${String(r)}`,
        source
      )
  }
  for (const [g, gap] of polities.deliberateGaps.entries())
    checkRingRange('yearPolities', gap.ring, anchorCount, `deliberateGaps[${String(g)}]`, source)
}

/**
 * Check the borders dressed by pair of polities.
 * @param borders - the year's border table
 * @param ids - the registry's polity ids
 * @param sourceIds - the declared provenance ids
 * @param source - where it came from
 */
function checkPairBorders(
  borders: YearBorders,
  ids: ReadonlySet<string>,
  sourceIds: ReadonlySet<number>,
  source: string
): void {
  for (const [p, pair] of borders.pairs.entries()) {
    for (const id of pair.between)
      if (!ids.has(id))
        disagree(
          'yearBorders',
          source,
          `pairs[${String(p)}] names "${id}", which is in no registry entry`
        )
    if (pair.source !== null && !sourceIds.has(pair.source))
      disagree(
        'yearBorders',
        source,
        `pairs[${String(p)}] names source ${String(pair.source)}, undeclared`
      )
  }
}

/**
 * Check the borders dressed by run of anchors.
 * @param borders - the year's border table
 * @param anchorCount - how many anchors the year has
 * @param sourceIds - the declared provenance ids
 * @param source - where it came from
 */
function checkRunBorders(
  borders: YearBorders,
  anchorCount: number,
  sourceIds: ReadonlySet<number>,
  source: string
): void {
  for (const [r, run] of borders.runs.entries()) {
    checkRingRange('yearBorders', run.run, anchorCount, `runs[${String(r)}]`, source)
    if (run.source !== null && !sourceIds.has(run.source))
      disagree(
        'yearBorders',
        source,
        `runs[${String(r)}] names source ${String(run.source)}, undeclared`
      )
  }
}

/**
 * Cross-check a year's three files and bind them into one value.
 *
 * Runs in order and stops at the first disagreement: the version, then the year, then the registry against
 * itself, then each of the other two against it. Nothing here repairs anything — a file that disagrees with
 * its neighbours is a file to edit, and guessing which of the two is right is exactly the silent
 * substitution `rules/error-handling.md` forbids.
 * @param files - the three payloads, each already checked against its own schema
 * @param source - the folder they came from, for the messages
 * @returns the year, ready to adapt or to edit
 */
export function assembleAuthoredYear(files: YearFiles, source: string): AuthoredYear {
  checkVersions(files, source)
  checkYears(files, source)
  const ids = checkRegistry(files.registry, source)
  checkAnchorTable(files.polities, source)
  checkClaims(files.polities, ids, source)
  const sourceIds = new Set(files.polities.sources.map((provenance) => provenance.id))
  checkPairBorders(files.borders, ids, sourceIds, source)
  checkRunBorders(files.borders, files.polities.anchors.length, sourceIds, source)
  return {
    year: files.registry.year,
    registry: files.registry,
    polities: files.polities,
    borders: files.borders,
  }
}
