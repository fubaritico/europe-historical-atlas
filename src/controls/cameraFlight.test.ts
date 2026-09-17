import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'

import { advanceFlight, beginFlight, interrupt } from './cameraFlight'
import { createControlsState } from './controlsState'

import type { ControlsState } from './controlsState'

/** Controls over a stand-in element, so no DOM is needed to fly a camera. */
function state(over: Partial<ControlsState['opts']> = {}): ControlsState {
  const element = { clientWidth: 800, clientHeight: 600 } as unknown as HTMLElement
  return createControlsState(new PerspectiveCamera(35, 4 / 3, 0.1, 300), element, {
    extent: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
    minDistance: 1,
    maxDistance: 6,
    minPitchDeg: 30,
    maxPitchDeg: 55,
    panSpeed: 8,
    zoomSpeed: 0.1,
    smoothingTau: 0.12,
    initialZoom: 0.2,
    enableDrag: true,
    enableEdgeScroll: false,
    edgeScrollMargin: 24,
    edgeScrollSpeed: 4,
    flyDurationMs: 700,
    flyZoomIn: 0.35,
    ...over,
  })
}

describe('beginFlight', () => {
  describe('happy path', () => {
    it('sets a flight going toward the point it was given', () => {
      const s = state()
      beginFlight(s, 12, -8)
      expect(s.flight).toMatchObject({ toX: 12, toZ: -8 })
    })

    it('settles closer than it started, by the configured step', () => {
      const s = state()
      beginFlight(s, 0, 0)
      expect(s.flight?.toZoom).toBeCloseTo(0.55)
    })
  })

  describe('variants', () => {
    it('starts from where the camera currently is', () => {
      const s = state()
      s.target.set(3, 0, 4)
      beginFlight(s, 0, 0)
      expect(s.flight).toMatchObject({ fromX: 3, fromZ: 4, fromZoom: 0.2 })
    })

    it('kills the inertia it interrupts, so the ease is not disturbed by a glide', () => {
      const s = state()
      s.velX = 5
      s.velZ = -5
      s.velZoom = 0.3
      beginFlight(s, 0, 0)
      expect([s.velX, s.velZ, s.velZoom]).toEqual([0, 0, 0])
    })

    it('replaces a flight already in progress rather than queueing behind it', () => {
      const s = state()
      beginFlight(s, 10, 0)
      beginFlight(s, -10, 0)
      expect(s.flight?.toX).toBe(-10)
    })
  })

  describe('managed errors', () => {
    it('arrives at once under reduced motion, with no flight at all', () => {
      // The destination is the point; the arc is the flourish. A zero duration is how the composition
      // root expresses `prefers-reduced-motion`, the same way it collapses the inertia.
      const s = state({ flyDurationMs: 0 })
      beginFlight(s, 12, -8)
      expect(s.flight).toBeNull()
      expect([s.target.x, s.target.z]).toEqual([12, -8])
      expect(s.zoom).toBeCloseTo(0.55)
    })

    it('does not zoom past the end of the range', () => {
      const s = state({ flyZoomIn: 5 })
      beginFlight(s, 0, 0)
      expect(s.flight?.toZoom).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('treats a negative duration as an instant arrival rather than flying backwards', () => {
      const s = state({ flyDurationMs: -500 })
      beginFlight(s, 4, 4)
      expect(s.flight).toBeNull()
      expect(s.target.x).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('flies to where it already is without going anywhere', () => {
      const s = state()
      beginFlight(s, s.target.x, s.target.z)
      expect(s.flight?.toX).toBe(s.flight?.fromX)
    })
  })
})

describe('advanceFlight', () => {
  describe('happy path', () => {
    it('arrives exactly at the destination', () => {
      const s = state()
      beginFlight(s, 20, -20)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.7)
      expect([s.target.x, s.target.z]).toEqual([20, -20])
      expect(s.flight).toBeNull()
    })
  })

  describe('variants', () => {
    it('is past halfway at halfway, the ease being symmetric', () => {
      const s = state()
      beginFlight(s, 100, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.35)
      expect(s.target.x).toBeCloseTo(50)
    })

    it('starts gently rather than snapping, unlike the inertia', () => {
      // Ease-IN as well as out: a flight is a move the reader did not make by hand, so it must not look
      // as though the map was yanked out from under them.
      const s = state()
      beginFlight(s, 100, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.07) // a tenth of the way through
      expect(s.target.x).toBeLessThan(10)
    })

    it('carries the zoom along with the target', () => {
      const s = state()
      beginFlight(s, 10, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.7)
      expect(s.zoom).toBeCloseTo(0.55)
    })
  })

  describe('managed errors', () => {
    it('lands rather than overshooting when a frame runs long', () => {
      const s = state()
      beginFlight(s, 30, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 99)
      expect(s.target.x).toBe(30)
    })
  })

  describe('unmanaged errors', () => {
    it('moves nothing on a zero-length frame', () => {
      const s = state()
      beginFlight(s, 30, 0)
      const before = s.target.x
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0)
      expect(s.target.x).toBe(before)
      expect(s.flight).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    it('hands the camera back the moment it arrives', () => {
      const s = state()
      beginFlight(s, 1, 1)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.7)
      expect(s.flight).toBeNull()
    })
  })
})

describe('interrupt', () => {
  describe('happy path', () => {
    it('gives the camera back to the reader', () => {
      const s = state()
      beginFlight(s, 10, 10)
      interrupt(s)
      expect(s.flight).toBeNull()
    })
  })

  describe('variants', () => {
    it('leaves the camera where the flight had got to, not back where it began', () => {
      // Snapping back would undo a move the reader watched happen.
      const s = state()
      beginFlight(s, 100, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, 0.35)
      const half = s.target.x
      interrupt(s)
      expect(s.target.x).toBe(half)
    })
  })

  // L3 (managed errors): N/A — it clears one field and cannot fail.

  describe('unmanaged errors', () => {
    it('is harmless when nothing is flying', () => {
      const s = state()
      expect(() => {
        interrupt(s)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('can be called twice', () => {
      const s = state()
      beginFlight(s, 1, 1)
      interrupt(s)
      interrupt(s)
      expect(s.flight).toBeNull()
    })
  })
})
