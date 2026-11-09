import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { itineraryRank } from './itinerary.mjs'

describe('the itinerary of the coasts', () => {
  it('ranks the coasts in the dev’s order: Norway, the Baltic, Brittany, Gibraltar, Greece, Egypt, the Caspian', () => {
    const places = [
      [5.3, 60.4], // Bergen
      [20.5, 54.7], // Königsberg
      [-4.5, 48.4], // Brest
      [-5.6, 36], // Gibraltar
      [23.7, 38], // Athens
      [31.5, 31.4], // the Nile delta
      [49.9, 40.4], // Baku
    ]
    const ranks = places.map((p) => itineraryRank(/** @type {[number, number]} */ (p)).rank)
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b))
  })

  it('names the stretch a point falls on', () => {
    assert.equal(itineraryRank([-7, 37.5]).stretch, 'Lisbon → Gibraltar')
  })

  it('places two points of one stretch in their order along it', () => {
    const a = itineraryRank([-9, 37.8]).rank
    const b = itineraryRank([-6.5, 36.4]).rank
    assert.ok(a < b, `${a} < ${b}`)
  })
})
