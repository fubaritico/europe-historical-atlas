/**
 * Nine countries of 1100 frozen as the names' fixture (ATLAS-301, « The gap to the reference », 29/10): each the owner
 * grid the atlas places the names on, cropped around the country with its neighbours — the country is owner `0`, each
 * neighbour a number of its own, nobody's ground `-1`. Written by `files/spikes/name-fixture/build-fixture.ts`; read by
 * the names' tests only, so every change of the construction is measured on the same nine shapes.
 */

import FIXTURE from './names1100.json'

/** One country of the fixture. */
export interface NameShape {
  /** Its polity id in 1100. */
  readonly id: string
  /** Its name in the registry. */
  readonly name: string
  /** The display level it is cut at: `0` the sovereigns, `1` with their direct vassals. */
  readonly level: number
  /** Why it is in the fixture: the kind of shape it stands for. */
  readonly why: string
  /** The crop's width, in cells. */
  readonly width: number
  /** The crop's height, in cells. */
  readonly height: number
  /** Each cell's owner, row-major: `0` the country. */
  readonly owners: Int16Array
}

/**
 * A grid decoded from its runs.
 * @param runs - `[value, count, value, count, …]`
 * @param size - how many cells
 * @returns the grid
 * @throws when the runs do not fill the grid exactly — the fixture is broken
 */
function decoded(runs: readonly number[], size: number): Int16Array {
  const grid = new Int16Array(size)
  let at = 0
  for (let index = 0; index < runs.length; index += 2) {
    const value = runs[index] ?? 0
    const count = runs[index + 1] ?? 0
    grid.fill(value, at, at + count)
    at += count
  }
  if (at !== size) throw new Error(`[fixture] runs fill ${String(at)} cells of ${String(size)}`)
  return grid
}

/** The nine countries, by polity id. */
export const NAME_SHAPES: ReadonlyMap<string, NameShape> = new Map(
  FIXTURE.shapes.map(({ id, name, level, why, width, height, runs }) => [
    id,
    { id, name, level, why, width, height, owners: decoded(runs, width * height) },
  ])
)

/**
 * One country of the fixture.
 * @param id - its polity id
 * @returns it
 * @throws when the fixture does not hold it
 */
export function nameShape(id: string): NameShape {
  const shape = NAME_SHAPES.get(id)
  if (shape === undefined) throw new Error(`[fixture] no shape ${id}`)
  return shape
}
