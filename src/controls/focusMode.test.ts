import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'

import { advanceFlight, interrupt } from './cameraFlight'
import { createControlsState } from './controlsState'
import { clearFocus, enterFocus, isFocused, leaveFocus, leaveFocusTo } from './focusMode'

import type { ControlsState } from './controlsState'

/** Controls over a stand-in element, so no DOM is needed to focus a camera. */
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
    initialZoom: 0.25,
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

/** Run the flight in progress to completion, so a test can assert where the camera came to rest. */
function land(s: ControlsState): void {
  const flight = s.flight
  if (flight) advanceFlight(s, flight, flight.duration)
}

describe('enterFocus', () => {
  describe('happy path', () => {
    it('flies to the point and settles at the focus zoom', () => {
      const s = state()
      enterFocus(s, 20, -20)
      land(s)
      expect([s.target.x, s.target.z]).toEqual([20, -20])
      expect(s.zoom).toBe(1)
    })

    it('remembers where the camera stood', () => {
      const s = state()
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      expect(s.focusReturn).toEqual({ x: 4, z: 6, zoom: 0.25 })
    })
  })

  describe('variants', () => {
    it('does not move the way back when focus jumps to another target', () => {
      // Jumping from one target to the next stays inside the mode. If the return crept along behind the
      // reader, Escape would stop meaning anything after the first jump.
      const s = state()
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      land(s)
      enterFocus(s, -30, 10)
      expect(s.focusReturn).toEqual({ x: 4, z: 6, zoom: 0.25 })
    })

    it('honours a focus zoom that is not the maximum', () => {
      const s = state({ flyFocusZoom: 0.7 })
      enterFocus(s, 1, 1)
      land(s)
      expect(s.zoom).toBeCloseTo(0.7)
    })

    it('remembers where a flight in progress was headed, not where it had got to', () => {
      // Double-clicking during the flight home would otherwise remember a point halfway there, and the
      // next Escape would strand the reader somewhere they had never been.
      const s = state()
      s.target.set(0, 0, 0)
      enterFocus(s, 50, 50)
      land(s)
      leaveFocus(s) // flying back to (0, 0, 0.25)
      const midFlight = s.flight
      if (midFlight) advanceFlight(s, midFlight, 0.2)
      enterFocus(s, -10, -10)
      expect(s.focusReturn).toEqual({ x: 0, z: 0, zoom: 0.25 })
    })
  })

  // L3 (managed errors): N/A — it delegates the only failable part (the duration) to `beginFlight`.

  describe('unmanaged errors', () => {
    it('still enters the mode when the flight arrives instantly', () => {
      const s = state({ flyDurationMs: 0 })
      enterFocus(s, 5, 5)
      expect(isFocused(s)).toBe(true)
      expect(s.zoom).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('focuses on where the camera already stands without losing the way back', () => {
      const s = state()
      s.target.set(9, 0, 9)
      enterFocus(s, 9, 9)
      expect(s.focusReturn).toEqual({ x: 9, z: 9, zoom: 0.25 })
    })
  })
})

describe('leaveFocus', () => {
  describe('happy path', () => {
    it('flies back to where the camera stood before the focus', () => {
      const s = state()
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      land(s)
      leaveFocus(s)
      land(s)
      expect([s.target.x, s.target.z]).toEqual([4, 6])
      expect(s.zoom).toBeCloseTo(0.25)
    })

    it('reports that there was a focus to leave', () => {
      const s = state()
      enterFocus(s, 1, 1)
      expect(leaveFocus(s)).toBe(true)
    })
  })

  describe('variants', () => {
    it('leaves the mode, so a second Escape has nothing to do', () => {
      const s = state()
      enterFocus(s, 1, 1)
      leaveFocus(s)
      expect(isFocused(s)).toBe(false)
      expect(leaveFocus(s)).toBe(false)
    })

    it('comes back to a viewpoint the reader panned away from mid-focus', () => {
      // Panning stays inside the mode, so the way back must survive it.
      const s = state()
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      land(s)
      interrupt(s)
      s.target.set(35, 0, -35) // the reader looks around
      leaveFocus(s)
      land(s)
      expect([s.target.x, s.target.z]).toEqual([4, 6])
    })
  })

  // L3 (managed errors): N/A — the absent focus is a reported state, not an error.

  describe('unmanaged errors', () => {
    it('does nothing and says so when the camera was never focused', () => {
      const s = state()
      const before = s.target.x
      expect(leaveFocus(s)).toBe(false)
      expect(s.flight).toBeNull()
      expect(s.target.x).toBe(before)
    })
  })

  describe('edge cases', () => {
    it('returns instantly under a zero duration rather than not returning at all', () => {
      const s = state({ flyDurationMs: 0 })
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      leaveFocus(s)
      expect([s.target.x, s.target.z, s.zoom]).toEqual([4, 6, 0.25])
    })
  })
})

describe('leaveFocusTo', () => {
  describe('happy path', () => {
    it('lands on the point at the zoom held before the focus was entered', () => {
      const s = state()
      s.target.set(4, 0, 6)
      enterFocus(s, 20, -20)
      land(s)
      leaveFocusTo(s, -15, 15)
      land(s)
      expect([s.target.x, s.target.z]).toEqual([-15, 15])
      expect(s.zoom).toBeCloseTo(0.25)
    })

    it('leaves the mode', () => {
      const s = state()
      enterFocus(s, 1, 1)
      leaveFocusTo(s, 2, 2)
      expect(isFocused(s)).toBe(false)
    })
  })

  describe('variants', () => {
    it('re-centres at the current zoom when there was no focus to leave', () => {
      const s = state()
      s.zoom = 0.6
      leaveFocusTo(s, 30, -30)
      land(s)
      expect([s.target.x, s.target.z]).toEqual([30, -30])
      expect(s.zoom).toBeCloseTo(0.6)
    })

    it('keeps the arc, so a re-centring is not a lateral slide at ground level', () => {
      const s = state()
      s.zoom = 0.9
      leaveFocusTo(s, 80, 0)
      const flight = s.flight
      if (flight) advanceFlight(s, flight, flight.duration / 2)
      expect(s.zoom).toBeCloseTo(0)
    })
  })

  // L3 (managed errors): N/A — both branches are ordinary states of the camera.

  describe('unmanaged errors', () => {
    it('does not restore a zoom from a focus that was already left', () => {
      const s = state()
      s.zoom = 0.25
      enterFocus(s, 1, 1)
      land(s) // now at zoom 1
      leaveFocusTo(s, 2, 2)
      land(s) // back to 0.25
      leaveFocusTo(s, 3, 3)
      land(s)
      expect(s.zoom).toBeCloseTo(0.25)
    })
  })

  describe('edge cases', () => {
    it('lands where it already is without leaving the zoom behind', () => {
      const s = state()
      s.zoom = 0.4
      leaveFocusTo(s, s.target.x, s.target.z)
      land(s)
      expect(s.zoom).toBeCloseTo(0.4)
    })
  })
})

describe('clearFocus', () => {
  describe('happy path', () => {
    it('forgets the focus without moving the camera', () => {
      const s = state()
      enterFocus(s, 20, -20)
      land(s)
      const { x, z } = s.target
      clearFocus(s)
      expect(isFocused(s)).toBe(false)
      expect([s.target.x, s.target.z]).toEqual([x, z])
      expect(s.flight).toBeNull()
    })
  })

  describe('variants', () => {
    it('leaves a flight in progress alone', () => {
      const s = state()
      enterFocus(s, 20, -20)
      clearFocus(s)
      expect(s.flight).not.toBeNull()
    })
  })

  // L3 (managed errors): N/A — it clears one field and cannot fail.

  describe('unmanaged errors', () => {
    it('is harmless when there is no focus', () => {
      const s = state()
      expect(() => {
        clearFocus(s)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('can be called twice', () => {
      const s = state()
      enterFocus(s, 1, 1)
      clearFocus(s)
      clearFocus(s)
      expect(isFocused(s)).toBe(false)
    })
  })
})

describe('isFocused', () => {
  describe('happy path', () => {
    it('is false on a camera that has only ever navigated', () => {
      expect(isFocused(state())).toBe(false)
    })
  })

  describe('variants', () => {
    it('is true from the moment the focus begins, not once the flight lands', () => {
      const s = state()
      enterFocus(s, 1, 1)
      expect(isFocused(s)).toBe(true)
    })
  })

  // L3/L4: N/A — it reads one field and cannot fail.

  describe('edge cases', () => {
    it('stays true while the reader drives the camera themselves', () => {
      const s = state()
      enterFocus(s, 1, 1)
      interrupt(s)
      expect(isFocused(s)).toBe(true)
    })
  })
})
