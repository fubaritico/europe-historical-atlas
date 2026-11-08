import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { holdersAt, readYearMap, segmentOwners } from './yearMap.mjs'

// A county with a vassal carved out of it: the vassal's ring is also a hole in its suzerain's.
const files = {
  'y/polities.json': {
    year: 1100,
    anchors: [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ],
    claims: [
      {
        polity: 'suzerain',
        rings: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
        ],
      },
      { polity: 'vassal', rings: [[4, 5, 6, 7]] },
    ],
  },
  'y/registry.json': {
    polities: [
      { id: 'suzerain', name: 'S', wikidata: 'Q1' },
      { id: 'vassal', name: 'V' },
    ],
  },
}
const map = readYearMap('y', (path) => files[path])

describe('readYearMap', () => {
  it('maps the registry Wikidata ids to the polities, and leaves out a polity without one', () => {
    assert.deepEqual([...map.polityByQid], [['Q1', 'suzerain']])
  })
})

describe('holdersAt', () => {
  it('gives the vassal ground to the vassal alone', () => {
    assert.deepEqual(holdersAt(map, [1.5, 1.5]), ['vassal'])
  })

  it('gives the rest to the suzerain', () => {
    assert.deepEqual(holdersAt(map, [3, 3]), ['suzerain'])
  })

  it('gives the sea to nobody', () => {
    assert.deepEqual(holdersAt(map, [9, 9]), [])
  })
})

describe('segmentOwners', () => {
  it('counts a segment run in either direction as one', () => {
    assert.deepEqual([...segmentOwners(map).get('4-5')].sort(), ['suzerain', 'vassal'])
  })
})
