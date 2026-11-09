import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { seaShores } from './coast.mjs'

const square = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ d) => [
  [x, y],
  [x + d, y],
  [x + d, y + d],
  [x, y + d],
]

describe('seaShores', () => {
  const contours = [
    { name: 'continent', points: square(0, 40, 20), land: true, closed: false },
    { name: 'island', points: square(5, 40, 0.5), land: true, closed: true },
    { name: 'closed sea', points: square(30, 40, 6), land: false, closed: true },
    { name: 'lake', points: square(10, 50, 1), land: false, closed: true },
  ]

  it('keeps the continents, the islands and a closed sea, and leaves a lake to the lakes’ plan', () => {
    assert.deepEqual(
      seaShores(contours).map((c) => c.name),
      ['continent', 'island', 'closed sea']
    )
  })
})
