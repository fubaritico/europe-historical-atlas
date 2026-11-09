import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { placeLobeRefusals } from './coasts.mjs'

describe('placeLobeRefusals', () => {
  const islands = [{ id: 7, points: /** @type {[number, number][]} */ ([[12.1, 55.4], [12.2, 55.4]]) }]

  it('places a refusal on its island, at its first coast point', () => {
    assert.deepEqual(placeLobeRefusals([{ island: 7, why: 'no lobe' }], islands), [
      { polity: 'island #7', at: [12.1, 55.4], why: 'no lobe' },
    ])
  })

  it('throws, naming it, on a refusal for an island it was not given', () => {
    assert.throws(() => placeLobeRefusals([{ island: 9, why: 'x' }], islands), /\[use-cartographer\] lobeCuts refused island #9/)
  })
})
