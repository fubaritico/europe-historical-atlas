import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { crumbs, isFlatPixelEdge, isPixelRing, ringAreaKm2, stairs } from './lint.mjs'
import { yearMapFrom } from './yearMap.mjs'

/*
 * At 45° N, 0.08° of longitude is 6.3 km and 0.065° of latitude 7.2 km — one cell of Cliopatria's grid.
 * Land: a big square (0..2°, 44..46°) for `land`; inside it, a pixel of `waste` (4 points, its top and bottom flat),
 * and a second one of `waste` at sea, a little larger (further south); `isle`, a lone pixel at sea, its only ring.
 */
const pixel = (/** @type {number} */ x, /** @type {number} */ y) => [
  [x, y],
  [x + 0.08, y],
  [x + 0.08, y + 0.065],
  [x, y + 0.065],
]

const map = yearMapFrom(
  {
    year: 1300,
    anchors: [
      [0, 44],
      [2, 44],
      [2, 46],
      [0, 46],
      ...pixel(1, 45),
      ...pixel(5, 45),
      ...pixel(3, 44),
    ],
    claims: [
      { polity: 'land', rings: [[0, 1, 2, 3]] },
      { polity: 'waste', rings: [[4, 5, 6, 7], [12, 13, 14, 15]] },
      { polity: 'isle', rings: [[8, 9, 10, 11]] },
    ],
  },
  { polities: [{ id: 'land', name: 'Land' }, { id: 'waste', name: 'Waste' }, { id: 'isle', name: 'Isle' }] }
)

describe('the grid of the conversion', () => {
  it('a short edge along one latitude is a flat pixel edge, a sloped one is not', () => {
    assert.equal(isFlatPixelEdge([1, 45], [1.08, 45]), true)
    assert.equal(isFlatPixelEdge([1, 45], [1.08, 45.001]), false)
  })

  it('a long edge along one latitude is not a pixel edge', () => {
    assert.equal(isFlatPixelEdge([0, 44], [2, 44]), false)
  })

  it('a ring of the grid is a pixel ring; the big square is not', () => {
    assert.equal(isPixelRing(pixel(1, 45)), true)
    assert.equal(isPixelRing([[0, 44], [2, 44], [2, 46], [0, 46]]), false)
  })

  it('a pixel at 45° N is about 45 km²', () => {
    const km2 = ringAreaKm2(pixel(1, 45))
    assert.ok(km2 > 40 && km2 < 50, String(km2))
  })
})

describe('crumbs', () => {
  const found = crumbs(map)

  it('lists the three pixels, the one overflowing a neighbour first', () => {
    assert.deepEqual([found[0].polity, found[0].ring], ['waste', 0])
    assert.deepEqual(found[0].overflows, ['land'])
    assert.deepEqual(found.slice(1).map((c) => c.overflows), [[], []])
    assert.equal(found.length, 3)
  })

  it('marks a polity\u2019s largest ring as the whole polity, never a smaller one', () => {
    assert.equal(found.find((c) => c.polity === 'isle')?.whole, true)
    assert.equal(found.find((c) => c.polity === 'waste' && c.ring === 1)?.whole, true)
    assert.equal(found.find((c) => c.polity === 'waste' && c.ring === 0)?.whole, false)
  })

  it('does not take a large polity drawn in four points for a crumb', () => {
    assert.equal(found.some((c) => c.polity === 'land'), false)
  })

  it('leaves out a crumb outside the box', () => {
    assert.deepEqual(
      crumbs(map, { box: [4, 40, 6, 50] }).map((c) => c.polity),
      ['isle']
    )
  })

  it('does not count a vassal’s ground as an overflow', () => {
    const vassal = yearMapFrom(
      { year: 1300, anchors: map.anchors, claims: map.claims.slice(0, 2) },
      { polities: [{ id: 'land', name: 'Land' }, { id: 'waste', name: 'Waste', suzerain: 'land' }] }
    )
    assert.deepEqual(crumbs(vassal)[0].overflows, [])
  })
})

describe('stairs', () => {
  /*
   * A ring whose south side climbs in three steps of the grid from (0,44) to (0.24,44.195), then runs far away:
   * flat, up, flat, up, flat, up — three treads.
   */
  const steps = yearMapFrom(
    {
      year: 1300,
      anchors: [
        [0, 44],
        [0.08, 44],
        [0.08, 44.065],
        [0.16, 44.065],
        [0.16, 44.13],
        [0.24, 44.13],
        [0.24, 44.195],
        [2, 45],
        [0, 46],
      ],
      claims: [
        { polity: 'a', rings: [[0, 1, 2, 3, 4, 5, 6, 7, 8]] },
        { polity: 'b', rings: [[6, 5, 4, 3, 2, 1, 0, 8, 7]] },
      ],
    },
    { polities: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }
  )

  it('finds the run of steps once, with both polities holding it', () => {
    const found = stairs(steps)
    assert.equal(found.length, 1)
    assert.equal(found[0].treads, 3)
    assert.deepEqual([...found[0].polities].sort(), ['a', 'b'])
  })

  it('finds no stair in a ring of long edges', () => {
    assert.deepEqual(stairs(map, { polity: 'land' }), [])
  })
})
