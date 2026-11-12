import { describe, expect, it } from 'vitest'

import { landPieces } from './landClip'
import { createLandMask } from './landMask'

import type { LandMask } from './landMask'

/** A mask eleven cells wide and three high: the cells a predicate names are land. */
const maskWhere = (isLand: (col: number) => boolean): LandMask =>
  createLandMask(
    {
      width: 11,
      height: 3,
      scale: 1,
      bbox: { west: 0, south: 0, east: 1, north: 1 },
      source: 'test',
    },
    (col) => isLand(col)
  )

const west = maskWhere((col) => col <= 4)

describe('landPieces', () => {
  it('keeps a line wholly over land as it is', () => {
    const line = [
      { u: 0, v: 0.5 },
      { u: 0.3, v: 0.5 },
    ]
    expect(landPieces(line, west)).toEqual([line])
  })

  it('drops a line wholly at sea', () => {
    expect(
      landPieces(
        [
          { u: 0.7, v: 0.5 },
          { u: 1, v: 0.5 },
        ],
        west
      )
    ).toEqual([])
  })

  it('ends a line running out to sea on the coast, where the coverage falls to one half', () => {
    const pieces = landPieces(
      [
        { u: 0, v: 0.5 },
        { u: 1, v: 0.5 },
      ],
      west
    )
    expect(pieces).toHaveLength(1)
    expect(pieces[0]?.[0]).toEqual({ u: 0, v: 0.5 })
    // Land up to cell 4, water from cell 5: the coast at 4.5 cells of 10, so u = 0.45.
    expect(pieces[0]?.at(-1)?.u).toBeCloseTo(0.45, 3)
  })

  it('cuts a line crossing a strait one cell wide, though no vertex lies in it', () => {
    const strait = maskWhere((col) => col !== 5)
    const pieces = landPieces(
      [
        { u: 0, v: 0.5 },
        { u: 1, v: 0.5 },
      ],
      strait
    )
    expect(pieces).toHaveLength(2)
    expect(pieces[0]?.at(-1)?.u).toBeCloseTo(0.45, 3)
    expect(pieces[1]?.[0]?.u).toBeCloseTo(0.55, 3)
    expect(pieces[1]?.at(-1)).toEqual({ u: 1, v: 0.5 })
  })

  it('starts a line coming in from the sea on the coast', () => {
    const pieces = landPieces(
      [
        { u: 1, v: 0.5 },
        { u: 0.1, v: 0.5 },
      ],
      west
    )
    expect(pieces).toHaveLength(1)
    expect(pieces[0]?.[0]?.u).toBeCloseTo(0.45, 3)
    expect(pieces[0]?.at(-1)).toEqual({ u: 0.1, v: 0.5 })
  })
})
