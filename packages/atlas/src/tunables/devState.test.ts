import { describe, expect, it } from 'vitest'

import { createDevState, extentRect } from './devState'
import { ALL_CONTROL_TABLES } from './params'

describe('createDevState', () => {
  describe('happy path', () => {
    it('starts every group at its declared default', () => {
      const dev = createDevState()
      expect(dev.relief.exaggeration).toBeGreaterThan(0)
      expect(dev.framing.fov).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('covers every declared control table except the camera, which owns its own', () => {
      // A group declared in tunables/params but missing here would be a folder the panel renders against
      // nothing. Walked rather than listed, so adding a group fails this instead of going unnoticed.
      //
      // `camera` is the deliberate exception: its live values are `controls.options`, held by the map
      // controls themselves and mutated in place by the panel. Copying them here would give the panel
      // two places to write and the camera one to read.
      const dev = createDevState() as unknown as Record<string, unknown>
      for (const table of ALL_CONTROL_TABLES) {
        if (table.name === 'camera') continue
        expect(Object.keys(dev)).toContain(table.name === 'coastline' ? 'coast' : table.name)
      }
    })

    it('leaves the debug overlays off', () => {
      expect(createDevState().debug.showFrustum).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('hands out independent copies, so one map cannot retune another', () => {
      const first = createDevState()
      const second = createDevState()
      first.relief.exaggeration = 99
      expect(second.relief.exaggeration).not.toBe(99)
    })
  })

  describe('unmanaged errors', () => {
    it('copies the defaults rather than aliasing them', () => {
      // Mutating a default would poison every later session in the same page, which is exactly what an
      // HMR reload is.
      const first = createDevState()
      first.texture.seaLevel = 4242
      expect(createDevState().texture.seaLevel).not.toBe(4242)
    })
  })

  describe('edge cases', () => {
    it('gives the panel a mutable object, since that is how a slider writes', () => {
      const dev = createDevState()
      dev.political.year = 1500
      expect(dev.political.year).toBe(1500)
    })
  })
})

describe('extentRect', () => {
  const extent = { centerX: 10, centerZ: -4, halfWidth: 3, halfDepth: 2 }

  describe('happy path', () => {
    it('spreads the rectangle around its centre', () => {
      expect(extentRect(extent)).toEqual({ minX: 7, maxX: 13, minZ: -6, maxZ: -2 })
    })
  })

  describe('variants', () => {
    it('keeps the shape when the centre moves', () => {
      const moved = extentRect({ ...extent, centerX: 100 })
      expect(moved.maxX - moved.minX).toBe(6)
    })
  })

  describe('managed errors', () => {
    it('collapses to a point at zero half-size rather than inverting', () => {
      const point = extentRect({ ...extent, halfWidth: 0, halfDepth: 0 })
      expect(point.minX).toBe(point.maxX)
      expect(point.minZ).toBe(point.maxZ)
    })
  })

  describe('unmanaged errors', () => {
    it('reports an inverted rectangle for a negative half-size rather than quietly fixing it', () => {
      // Silently swapping the edges would hide a bad tuning behind a working camera.
      expect(extentRect({ ...extent, halfWidth: -3 }).minX).toBeGreaterThan(
        extentRect({ ...extent, halfWidth: -3 }).maxX
      )
    })
  })

  describe('edge cases', () => {
    it('handles a rectangle centred on the origin', () => {
      expect(extentRect({ centerX: 0, centerZ: 0, halfWidth: 1, halfDepth: 1 })).toEqual({
        minX: -1,
        maxX: 1,
        minZ: -1,
        maxZ: 1,
      })
    })
  })
})
