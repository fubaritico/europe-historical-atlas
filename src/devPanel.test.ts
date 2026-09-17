// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest'

import { createDevPanel } from './devPanel'
import { CAMERA_CONTROL_ORDER } from './devParams'
import { createDevState } from './devState'

import type { DevPanelCallbacks } from './devPanel'
import type { DevState } from './devState'
import type GUI from 'lil-gui'

beforeAll(() => {
  // lil-gui asks the OS about its colour scheme; jsdom has no `matchMedia`. The one thing that ever
  // stood between this panel and a test suite, and it was never checked.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
})

/** The slice of a lil-gui controller a test needs, including the range it clamps to. */
interface ControllerProbe {
  object: object
  property: string
  getValue: () => unknown
  setValue: (value: unknown) => void
  /** Fire the release hook. Most controls bind to it: a rebuild must not run on every drag frame. */
  _callOnFinishChange: () => void
  _min?: number
  _max?: number
}

/**
 * Move a control the way a reader does: drag it, then let go.
 *
 * Both hooks, because the panel binds cheap updates to `onChange` and anything that rebuilds to
 * `onFinishChange` — a test that only fires the first would find most of the panel inert and be wrong.
 * @param controller - the control to move
 * @param value - what to move it to; a distinct one is chosen when omitted
 * @returns nothing
 */
function nudge(controller: ControllerProbe, value?: unknown): void {
  controller.setValue(value ?? otherValue(controller))
  controller._callOnFinishChange()
}

/** Every callback, counted by name. */
function countingCallbacks(): { callbacks: DevPanelCallbacks; calls: Record<string, number> } {
  const calls: Record<string, number> = {}
  const count = (name: string) => (): void => {
    calls[name] = (calls[name] ?? 0) + 1
  }
  const names = [
    'rebuildRelief',
    'rebuildTexture',
    'rebuildCoastline',
    'rebuildRhumb',
    'rebuildRivers',
    'rebuildPolitical',
    'rebuildBorders',
    'rebuildBorderGeometry',
    'rebuildRose',
    'setWireframe',
    'setCoastColor',
    'setRiverColor',
    'setRhumbColor',
    'setRoseOpacity',
    'setFov',
    'applyExtent',
    'setFrustumDebug',
    'logAll',
    'logCameraState',
  ]
  return {
    callbacks: Object.fromEntries(names.map((n) => [n, count(n)])) as unknown as DevPanelCallbacks,
    calls,
  }
}

/** A panel over live state, with every callback counted. */
function build(): {
  gui: GUI
  dev: DevState
  calls: Record<string, number>
  controls: ControllerProbe[]
} {
  const dev = createDevState()
  const { callbacks, calls } = countingCallbacks()
  const gui = createDevPanel({
    relief: dev.relief,
    texture: dev.texture,
    coast: dev.coast,
    rhumb: dev.rhumb,
    river: dev.river,
    political: dev.political,
    rose: dev.rose,
    controlsOptions: {
      panSpeed: 1,
      zoomSpeed: 1,
      smoothingTau: 0.1,
      enableDrag: true,
      enableEdgeScroll: true,
      edgeScrollSpeed: 1,
      flyDurationMs: 700,
      flyZoomIn: 0.35,
      edgeScrollMargin: 24,
      minDistance: 1,
      maxDistance: 10,
      minPitchDeg: 30,
      maxPitchDeg: 55,
      initialZoom: 0,
      extent: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
    },
    framing: dev.framing,
    extent: dev.extent,
    debug: dev.debug,
    callbacks,
  })
  // Through `unknown`: `_callOnFinishChange` is protected on lil-gui's own `Controller`, so the two
  // types do not overlap however narrow the probe is.
  const controls = gui.controllersRecursive() as unknown as ControllerProbe[]
  return { gui, dev, calls, controls }
}

/** A number inside the control's own range, and different from the one it holds. */
function otherNumber(controller: ControllerProbe, current: number): number {
  const low = controller._min ?? current - 1
  const high = controller._max ?? current + 1
  return current === low ? high : low
}

/** Whether a value is a colour, which the panel carries as an `{ r, g, b }` object. */
function isRgb(value: unknown): value is { r: number; g: number; b: number } {
  return value !== null && typeof value === 'object' && 'r' in value
}

/**
 * A value the controller will actually accept as different from the one it holds.
 *
 * Handing back the same value would move nothing, which reads as an inert control rather than as a test
 * that failed to press the button — the colour objects caught me out exactly that way.
 * @param controller - the control to move
 * @returns a distinct value of the right kind
 */
function otherValue(controller: ControllerProbe): unknown {
  const current = controller.getValue()
  if (typeof current === 'boolean') return !current
  if (typeof current === 'string') return current === '#000000' ? '#ffffff' : '#000000'
  if (typeof current === 'number') return otherNumber(controller, current)
  if (isRgb(current)) return { r: 255 - current.r, g: 255 - current.g, b: 255 - current.b }
  return current
}

/** How many callbacks have fired in total. */
const total = (calls: Record<string, number>): number =>
  Object.values(calls).reduce((sum, n) => sum + n, 0)

/**
 * The controls that deliberately trigger nothing, because the render loop reads them every frame.
 *
 * Written as an allow-list so that an control added later and wired to nothing fails this test rather
 * than going quietly inert — which is how this panel lost two sets of sliders.
 */
const READ_EVERY_FRAME = new Set([
  'exaggeration',
  'exaggZoomIn',
  'opacity',
  'opacityZoomIn',
  ...CAMERA_CONTROL_ORDER,
])

describe('createDevPanel', () => {
  describe('happy path', () => {
    it('renders a control for every declared tunable', () => {
      expect(build().controls.length).toBeGreaterThan(50)
    })

    it('binds each control to the live object the map reads', () => {
      const { dev, controls } = build()
      const yearControl = controls.find((c) => c.property === 'year')
      if (yearControl) nudge(yearControl, 1600)
      expect(dev.political.year).toBe(1600)
    })
  })

  describe('variants', () => {
    it('leaves no control wired to nothing', () => {
      // The guard this panel never had. Both times its dispatch broke, the symptom was a slider that
      // moved and changed nothing, and nothing anywhere noticed.
      const inert: string[] = []
      for (const controller of build().controls) {
        const { calls, controls: fresh } = build()
        const match = fresh.find(
          (c) => c.property === controller.property && c.getValue() === controller.getValue()
        )
        if (!match) continue
        nudge(match)
        if (total(calls) === 0 && !READ_EVERY_FRAME.has(match.property)) inert.push(match.property)
      }
      expect(inert).toEqual([])
    })

    it('routes a border paint to a redraw, not to a whole year', () => {
      const { calls, controls } = build()
      const borderColor = controls.find((c) => c.property === 'borderColor')
      if (borderColor) nudge(borderColor, '#123456')
      expect(calls.rebuildBorders).toBe(1)
      expect(calls.rebuildPolitical ?? 0).toBe(0)
    })

    it('routes border smoothing to a re-trace, which costs no year', () => {
      const { calls, controls } = build()
      const smoothing = controls.find((c) => c.property === 'borderSmoothing')
      if (smoothing) nudge(smoothing)
      expect(calls.rebuildBorderGeometry).toBe(1)
      expect(calls.rebuildPolitical ?? 0).toBe(0)
    })

    it('routes a change of year to the full rebuild', () => {
      const { calls, controls } = build()
      const year = controls.find((c) => c.property === 'year')
      if (year) nudge(year, 1600)
      expect(calls.rebuildPolitical).toBe(1)
    })

    it('rebuilds the coastline and the rhumbs with the sea level, which they share', () => {
      const { calls, controls } = build()
      const seaLevel = controls.find((c) => c.property === 'seaLevel')
      if (seaLevel) nudge(seaLevel)
      expect(calls.rebuildTexture).toBe(1)
      expect(calls.rebuildCoastline).toBe(1)
      expect(calls.rebuildRhumb).toBe(1)
    })

    it('rebuilds the rivers for every tunable but the colour', () => {
      // Everything else is baked into the layer when it is built, which is the exact hole the inert
      // river sliders went through.
      const { calls, controls } = build()
      const reveal = controls.find((c) => c.property === 'revealStart')
      if (reveal) nudge(reveal)
      expect(calls.rebuildRivers).toBe(1)
    })

    it('repaints a colour live rather than rebuilding for it', () => {
      const { calls, controls } = build()
      const colours = controls.filter((c) => c.property === 'color')
      for (const control of colours) nudge(control, '#abcdef')
      expect(
        (calls.setCoastColor ?? 0) + (calls.setRhumbColor ?? 0) + (calls.setRiverColor ?? 0)
      ).toBe(colours.length)
    })
  })

  describe('managed errors', () => {
    it('puts every tunable back and rebuilds each system exactly once', () => {
      const { gui, dev, calls, controls } = build()
      const before = dev.texture.seaLevel
      const seaLevel = controls.find((c) => c.property === 'seaLevel')
      if (seaLevel) nudge(seaLevel)
      const reset = controls.find((c) => c.property === 'resetToDefaults')
      ;(reset?.object as { resetToDefaults: () => void }).resetToDefaults()
      expect(dev.texture.seaLevel).toBe(before)
      // One rebuild per system, not one per controller: lil-gui's own reset() would fire dozens of
      // full texture bakes in a row.
      expect(calls.rebuildTexture).toBe(2) // once for the sea level above, once for the reset
      expect(calls.rebuildPolitical).toBe(1)
      gui.destroy()
    })
  })

  describe('unmanaged errors', () => {
    it('dumps the settings and the camera state on demand', () => {
      const { calls, controls } = build()
      ;(controls.find((c) => c.property === 'logAll')?.object as { logAll: () => void }).logAll()
      ;(
        controls.find((c) => c.property === 'logState')?.object as { logState: () => void }
      ).logState()
      expect(calls.logAll).toBe(1)
      expect(calls.logCameraState).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('unmounts itself cleanly', () => {
      const { gui } = build()
      expect(() => {
        gui.destroy()
      }).not.toThrow()
    })

    it('keeps the relief at the top level, it being what the reader is looking at', () => {
      // Everything else is behind a closed folder; the relief is the one thing reached without a click.
      const { gui, controls } = build()
      const atRoot = controls.filter((c) => (c as unknown as { parent: unknown }).parent === gui)
      expect(atRoot.map((c) => c.property)).toContain('exaggeration')
      expect(atRoot.map((c) => c.property)).toContain('wireframe')
      gui.destroy()
    })
  })
})
