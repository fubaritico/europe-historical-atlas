import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'

import { advanceFlight, beginFlight, flightZoom, interrupt, restPoint } from './cameraFlight'
import { createControlsState } from './controlsState'

import type { ControlsState, Flight } from './controlsState'

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
    flyFocusZoom: 1,
    flyArcZoom: 0,
    ...over,
  })
}

/** A flight literal, so the zoom curve can be exercised without a camera at all. */
function flight(over: Partial<Flight> = {}): Flight {
  return {
    fromX: 0,
    fromZ: 0,
    toX: 10,
    toZ: 10,
    fromZoom: 0.2,
    toZoom: 1,
    peakZoom: 0,
    elapsed: 0,
    duration: 1,
    ...over,
  }
}

describe('flightZoom', () => {
  describe('happy path', () => {
    it('is exactly at the top of the arc halfway through', () => {
      expect(flightZoom(flight({ peakZoom: 0 }), 0.5)).toBeCloseTo(0)
    })
  })

  describe('variants', () => {
    it('leaves and meets its endpoints exactly, whatever the arc does between them', () => {
      const f = flight({ fromZoom: 0.2, toZoom: 1, peakZoom: 0 })
      expect(flightZoom(f, 0)).toBeCloseTo(0.2)
      expect(flightZoom(f, 1)).toBeCloseTo(1)
    })

    it('pulls out below both ends rather than interpolating straight between them', () => {
      // The whole point of the arc: a straight interpolation from 0.6 to 1 never goes below 0.6.
      const f = flight({ fromZoom: 0.6, toZoom: 1, peakZoom: 0.1 })
      expect(flightZoom(f, 0.5)).toBeLessThan(0.6)
    })

    it('still pulls out when both ends are at maximum zoom', () => {
      // Focus to focus. Without this the trip is a lateral travelling shot at ground level.
      const f = flight({ fromZoom: 1, toZoom: 1, peakZoom: 0 })
      expect(flightZoom(f, 0.5)).toBeCloseTo(0)
    })

    it('does nothing at all when the arc sits at both ends', () => {
      const f = flight({ fromZoom: 0.5, toZoom: 0.5, peakZoom: 0.5 })
      expect(flightZoom(f, 0.3)).toBeCloseTo(0.5)
    })
  })

  // L3 (managed errors): N/A — it is arithmetic over three numbers and handles nothing.

  describe('unmanaged errors', () => {
    it('carries a NaN through rather than resolving it to a plausible zoom', () => {
      // A broken frame time must stay visible as a camera that has gone nowhere. Substituting a number
      // here would hide the defect behind an answer nothing downstream could tell apart from a real one.
      expect(flightZoom(flight(), Number.NaN)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('clamps progress past the end rather than curving back down', () => {
      // 4p(1 - p) is negative past 1: unclamped, the arc would overshoot past the destination zoom.
      expect(flightZoom(flight({ toZoom: 1 }), 1.5)).toBe(1)
    })

    it('meets its destination exactly, not a rounding error short of it', () => {
      // The sine this first used put the arrival at 0.9999999999999999, which no eye would catch and
      // no invariant could be written against.
      expect(flightZoom(flight({ fromZoom: 0.25, toZoom: 1, peakZoom: 0 }), 1)).toBe(1)
    })

    it('clamps progress before the start', () => {
      expect(flightZoom(flight({ fromZoom: 0.2 }), -3)).toBeCloseTo(0.2)
    })
  })
})

describe('beginFlight', () => {
  describe('happy path', () => {
    it('sets a flight going toward the point it was given', () => {
      const s = state()
      beginFlight(s, 12, -8, 1)
      expect(s.flight).toMatchObject({ toX: 12, toZ: -8 })
    })

    it('settles at the zoom it was asked for, not at a step from where it started', () => {
      const s = state()
      beginFlight(s, 0, 0, 1)
      expect(s.flight?.toZoom).toBe(1)
    })
  })

  describe('variants', () => {
    it('starts from where the camera currently is', () => {
      const s = state()
      s.target.set(3, 0, 4)
      beginFlight(s, 0, 0, 1)
      expect(s.flight).toMatchObject({ fromX: 3, fromZ: 4, fromZoom: 0.2 })
    })

    it('kills the inertia it interrupts, so the ease is not disturbed by a glide', () => {
      const s = state()
      s.velX = 5
      s.velZ = -5
      s.velZoom = 0.3
      beginFlight(s, 0, 0, 1)
      expect([s.velX, s.velZ, s.velZoom]).toEqual([0, 0, 0])
    })

    it('replaces a flight already in progress rather than queueing behind it', () => {
      const s = state()
      beginFlight(s, 10, 0, 1)
      beginFlight(s, -10, 0, 1)
      expect(s.flight?.toX).toBe(-10)
    })

    it('takes the top of the arc from the tunable', () => {
      const s = state({ flyArcZoom: 0.1 })
      s.zoom = 0.6
      beginFlight(s, 0, 0, 1)
      expect(s.flight?.peakZoom).toBeCloseTo(0.1)
    })
  })

  describe('managed errors', () => {
    it('arrives at once under reduced motion, with no flight at all', () => {
      // The destination is the point; the arc is the flourish. A zero duration is how the composition
      // root expresses `prefers-reduced-motion`, the same way it collapses the inertia.
      const s = state({ flyDurationMs: 0 })
      beginFlight(s, 12, -8, 1)
      expect(s.flight).toBeNull()
      expect([s.target.x, s.target.z]).toEqual([12, -8])
      expect(s.zoom).toBe(1)
    })

    it('does not settle past the end of the zoom range', () => {
      const s = state()
      beginFlight(s, 0, 0, 5)
      expect(s.flight?.toZoom).toBe(1)
    })

    it('clamps the arc below both ends rather than bouncing over them', () => {
      // An arc zoom above either end would make the middle of the trip CLOSER than its extremities,
      // which is not a flight.
      const s = state({ flyArcZoom: 0.9 })
      s.zoom = 0.3
      beginFlight(s, 0, 0, 0.5)
      expect(s.flight?.peakZoom).toBeCloseTo(0.3)
    })
  })

  describe('unmanaged errors', () => {
    it('treats a negative duration as an instant arrival rather than flying backwards', () => {
      const s = state({ flyDurationMs: -500 })
      beginFlight(s, 4, 4, 1)
      expect(s.flight).toBeNull()
      expect(s.target.x).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('flies to where it already is without going anywhere', () => {
      const s = state()
      beginFlight(s, s.target.x, s.target.z, 1)
      expect(s.flight?.toX).toBe(s.flight?.fromX)
    })
  })
})

describe('advanceFlight', () => {
  describe('happy path', () => {
    it('arrives exactly at the destination', () => {
      const s = state()
      beginFlight(s, 20, -20, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.7)
      expect([s.target.x, s.target.z]).toEqual([20, -20])
      expect(s.flight).toBeNull()
    })
  })

  describe('variants', () => {
    it('is past halfway at halfway, the ease being symmetric', () => {
      const s = state()
      beginFlight(s, 100, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.35)
      expect(s.target.x).toBeCloseTo(50)
    })

    it('starts gently rather than snapping, unlike the inertia', () => {
      // Ease-IN as well as out: a flight is a move the reader did not make by hand, so it must not look
      // as though the map was yanked out from under them.
      const s = state()
      beginFlight(s, 100, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.07) // a tenth of the way through
      expect(s.target.x).toBeLessThan(10)
    })

    it('pulls the zoom out to the top of the arc halfway across', () => {
      const s = state()
      s.zoom = 0.5
      beginFlight(s, 10, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.35)
      expect(s.zoom).toBeCloseTo(0)
    })

    it('carries the zoom to its destination by the end', () => {
      const s = state()
      beginFlight(s, 10, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.7)
      expect(s.zoom).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('lands rather than overshooting when a frame runs long', () => {
      const s = state()
      beginFlight(s, 30, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 99)
      expect(s.target.x).toBe(30)
      expect(s.zoom).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('moves nothing on a zero-length frame', () => {
      const s = state()
      beginFlight(s, 30, 0, 1)
      const before = s.target.x
      const f = s.flight
      if (f) advanceFlight(s, f, 0)
      expect(s.target.x).toBe(before)
      expect(s.flight).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    it('hands the camera back the moment it arrives', () => {
      const s = state()
      beginFlight(s, 1, 1, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.7)
      expect(s.flight).toBeNull()
    })
  })
})

describe('restPoint', () => {
  describe('happy path', () => {
    it('is where the camera is, when it is not going anywhere', () => {
      const s = state()
      s.target.set(5, 0, -5)
      s.zoom = 0.4
      expect(restPoint(s)).toEqual({ x: 5, z: -5, zoom: 0.4 })
    })
  })

  describe('variants', () => {
    it('is where a flight is headed, not where it has got to', () => {
      // The live target mid-flight is a point the camera is passing through, not one it was ever meant
      // to stop at. Remembering that as somewhere to return to strands the reader halfway.
      const s = state()
      beginFlight(s, 40, -40, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.2)
      expect(restPoint(s)).toEqual({ x: 40, z: -40, zoom: 1 })
    })
  })

  // L3 (managed errors): N/A — it reads two fields and handles nothing.

  describe('unmanaged errors', () => {
    it('reports the live position once an instant arrival has left no flight behind', () => {
      const s = state({ flyDurationMs: 0 })
      beginFlight(s, 7, 7, 0.8)
      expect(restPoint(s)).toEqual({ x: 7, z: 7, zoom: 0.8 })
    })
  })

  describe('edge cases', () => {
    it('hands back a copy, so a caller keeping it cannot be moved by a later pan', () => {
      const s = state()
      const rest = restPoint(s)
      s.target.x += 50
      expect(rest.x).not.toBe(s.target.x)
    })
  })
})

describe('interrupt', () => {
  describe('happy path', () => {
    it('gives the camera back to the reader', () => {
      const s = state()
      beginFlight(s, 10, 10, 1)
      interrupt(s)
      expect(s.flight).toBeNull()
    })
  })

  describe('variants', () => {
    it('leaves the camera where the flight had got to, not back where it began', () => {
      // Snapping back would undo a move the reader watched happen.
      const s = state()
      beginFlight(s, 100, 0, 1)
      const f = s.flight
      if (f) advanceFlight(s, f, 0.35)
      const half = s.target.x
      interrupt(s)
      expect(s.target.x).toBe(half)
    })

    it('says nothing about the focus, so looking around keeps the way back', () => {
      const s = state()
      s.focusReturn = { x: 1, z: 2, zoom: 0.3 }
      interrupt(s)
      expect(s.focusReturn).toEqual({ x: 1, z: 2, zoom: 0.3 })
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
      beginFlight(s, 1, 1, 1)
      interrupt(s)
      interrupt(s)
      expect(s.flight).toBeNull()
    })
  })
})
