import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { angleAt, insideRing, kmBetween, kmToSegment, sampleSegment } from './geo.mjs'

describe('kmBetween', () => {
  it('measures one degree of latitude as 111.32 km', () => {
    assert.equal(kmBetween([0, 40], [0, 41]).toFixed(2), '111.32')
  })

  it('shrinks a degree of longitude by the cosine of the latitude: 85.3 km at 40° N', () => {
    assert.equal(kmBetween([0, 40], [1, 40]).toFixed(1), '85.3')
  })
})

describe('kmToSegment', () => {
  it('measures to the segment, not to its line, past an end', () => {
    // 1° of latitude above the end (1, 40): the line through the segment would give 0.
    assert.equal(kmToSegment([2, 40], [0, 40], [1, 40]).toFixed(1), '85.3')
  })

  it('measures perpendicularly within the segment', () => {
    assert.equal(kmToSegment([0.5, 40.1], [0, 40], [1, 40]).toFixed(2), '11.13')
  })
})

describe('insideRing', () => {
  const square = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ]

  it('finds a point inside', () => {
    assert.equal(insideRing([1, 1], square), true)
  })

  it('leaves a point outside out', () => {
    assert.equal(insideRing([3, 1], square), false)
  })
})

describe('angleAt', () => {
  it('reads a straight line as 180°', () => {
    assert.equal(Math.round(angleAt([0, 40], [1, 40], [2, 40])), 180)
  })

  it('reads a right angle as 90° once longitude is shrunk at the latitude', () => {
    // 0.1° east is 8.5 km at 40° N; 0.0766° north is the same 8.5 km.
    assert.equal(Math.round(angleAt([0.1, 40], [0, 40], [0, 40 + 8.527 / 111.32])), 90)
  })

  it('answers NaN for a leg of no length', () => {
    assert.equal(Number.isNaN(angleAt([0, 40], [0, 40], [1, 40])), true)
  })
})

describe('sampleSegment', () => {
  it('cuts 85 km into steps of at most 5 km, both ends kept', () => {
    const samples = sampleSegment([0, 40], [1, 40], 5)
    assert.equal(samples.length, 19)
    assert.deepEqual(samples[0], [0, 40])
    assert.deepEqual(samples.at(-1), [1, 40])
  })
})
