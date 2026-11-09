import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { multiPolygonKm2, overlapZones } from './overlaps.mjs'
import { yearMapFrom } from './yearMap.mjs'

const square = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ d) => [
  [x, y],
  [x + d, y],
  [x + d, y + d],
  [x, y + d],
  [x, y],
]

const map = yearMapFrom(
  { year: 1300, anchors: [], claims: [{ polity: 'a', rings: [] }, { polity: 'b', rings: [] }, { polity: 'c', rings: [] }] },
  { polities: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }] }
)

/** Stand-ins for `core`: a and b share a 0.1° square, b and c refuse. */
const api = {
  polityShape: (/** @type {object} */ _d, /** @type {string} */ id) => ({ polity: id, shape: [], box: [0, 0, 1, 1] }),
  overlapCandidates: (/** @type {object} */ _d, /** @type {{ polity: string }[]} */ s) => [
    [s[0], s[1]],
    [s[1], s[2]],
  ],
  pairOverlap: (/** @type {{ polity: string }} */ a, /** @type {{ polity: string }} */ b) => {
    if (b.polity === 'c') throw new Error('degenerate')
    return [[square(0, 45, 0.1)]]
  },
  addOverlap: (/** @type {object} */ _d, /** @type {object[]} */ pieces, /** @type {object} */ next) => [...pieces, next],
}

describe('overlapZones', () => {
  const { zones, refused } = overlapZones(map, /** @type {never} */ (api))

  it('gives the zone two polities share, with its area', () => {
    assert.equal(zones.length, 1)
    assert.deepEqual(zones[0].polities, ['a', 'b'])
    assert.ok(zones[0].km2 > 80 && zones[0].km2 < 95, String(zones[0].km2))
  })

  it('skips a pair the geometry refuses and says which', () => {
    assert.equal(refused.length, 1)
    assert.match(refused[0], /^b × c: refused/)
  })

  it('takes a hole out of the area', () => {
    const outer = multiPolygonKm2([[square(0, 45, 0.1)]])
    const holed = multiPolygonKm2([[square(0, 45, 0.1), square(0.025, 45.025, 0.05)]])
    assert.ok(Math.abs(holed - outer * 0.75) < 1, `${holed} vs ${outer}`)
  })
})
