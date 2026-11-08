import { describe, expect, it } from 'vitest'

import { FREE_POINT_PROVENANCE } from '../../state/editionSlice'
import { backdropToLonLat } from '../../viewport/projection'
import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'
import { TEST_SHORE, testGestureContext, testPolity, testStore } from '../testGestureContext'

import { leaveLayerAtAnchor, waterVertexOf } from './waterVertex'

const at = (backdrop: [number, number]) => ({
  at: backdropToLonLat(backdrop, TEST_BACKDROP_FRAME),
  provenance: FREE_POINT_PROVENANCE,
})

/** France drawn on a shore vertex (anchor 0, backdrop 150,200) and two points inland (anchors 1 and 2). */
function openShore() {
  const store = testStore()
  store.getState().createPolity(testPolity('fr'), { kind: 'create', label: 'fr' })
  store.getState().drawOutline('fr', [at([150, 200]), at([200, 300]), at([100, 300])], {
    kind: 'draw-outline',
    label: 'fr',
  })
  return testGestureContext(store, [TEST_SHORE]).context
}

describe('waterVertex', () => {
  describe('happy path', () => {
    it('finds the coast vertex an anchor sits exactly on', () => {
      const context = openShore()
      expect(waterVertexOf(context, 0)).toMatchObject({ layer: 'coast', vertex: 5 })
    })
  })

  describe('variants', () => {
    it('finds nothing for an anchor placed inland', () => {
      expect(waterVertexOf(openShore(), 1)).toBeNull()
    })

    it('leaves the water and resumes it from the last anchor when that anchor is on it', () => {
      const context = openShore()
      context.session.outline = [{ at: [0, 0], provenance: FREE_POINT_PROVENANCE, anchor: 0 }]
      leaveLayerAtAnchor(context)
      expect(context.session.snap?.layer).toBe('coast')
    })
  })

  describe('managed errors', () => {
    it('follows nothing after a last point that is no anchor', () => {
      const context = openShore()
      context.session.outline = [{ at: [0, 0], provenance: FREE_POINT_PROVENANCE, anchor: null }]
      leaveLayerAtAnchor(context)
      expect(context.session.snap).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('finds nothing for an anchor the document does not hold', () => {
      expect(waterVertexOf(openShore(), 99)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('follows nothing when the outline is empty', () => {
      const context = openShore()
      leaveLayerAtAnchor(context)
      expect(context.session.snap).toBeNull()
    })
  })
})
