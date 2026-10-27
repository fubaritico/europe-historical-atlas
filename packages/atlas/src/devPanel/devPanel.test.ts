// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest'

import { TRIBE_FEATHER } from '@europe-historical-atlas/core/editor/tribeFeather'

import { createDevState } from '../tunables/devState'

import { createDevPanel } from './devPanel'

import type { DevPanelCallbacks } from './devPanel'
import type { MapControlsOptions } from '../controls/mapControls'
import type { DevState } from '../tunables/devState'
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
    'rebuildFrame',
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
  controlsOptions: MapControlsOptions
} {
  const dev = createDevState()
  const { callbacks, calls } = countingCallbacks()
  // Held in a variable and handed back: the camera folder writes straight into this object rather than
  // through a callback, so it is the only place a camera control's effect can be observed.
  const controlsOptions: MapControlsOptions = {
    panSpeed: 1,
    zoomSpeed: 1,
    smoothingTau: 0.1,
    enableDrag: true,
    enableEdgeScroll: true,
    edgeScrollSpeed: 1,
    flyDurationMs: 700,
    flyFocusZoom: 1,
    flyArcZoom: 0,
    edgeScrollMargin: 24,
    minDistance: 1,
    maxDistance: 10,
    minPitchDeg: 30,
    maxPitchDeg: 55,
    initialZoom: 0,
    extent: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
  }
  const gui = createDevPanel({
    relief: dev.relief,
    texture: dev.texture,
    coast: dev.coast,
    rhumb: dev.rhumb,
    river: dev.river,
    political: dev.political,
    vassals: dev.vassals,
    tribes: dev.tribes,
    rose: dev.rose,
    frame: dev.frame,
    controlsOptions,
    framing: dev.framing,
    extent: dev.extent,
    debug: dev.debug,
    callbacks,
  })
  // Through `unknown`: `_callOnFinishChange` is protected on lil-gui's own `Controller`, so the two
  // types do not overlap however narrow the probe is.
  const controls = gui.controllersRecursive() as unknown as ControllerProbe[]
  return { gui, dev, calls, controls, controlsOptions }
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
  // The camera folder writes straight into the live options object, and the drive reads these on every
  // rendered frame. Spelled out rather than spread from `CAMERA_CONTROL_ORDER`: a blanket exemption
  // would hand the same free pass to a camera option added later and captured by value, which is the
  // exact shape of both failures this guard exists for.
  'panSpeed',
  'zoomSpeed',
  'smoothingTau',
  'enableDrag',
  'enableEdgeScroll',
  'edgeScrollSpeed',
  'minDistance',
  'maxDistance',
  'minPitchDeg',
  'maxPitchDeg',
])

/**
 * The vassals' reveal, read on every frame (`scene/layers/frameLayers`, `frameDetail`) — spelled out by key, as the camera's
 * are, so a vassal option added later and wired to nothing still fails the guard. Matched together with
 * its object (`dev.vassals`): the rivers' rebuilding controls share some of these keys.
 */
const VASSALS_READ_EVERY_FRAME = new Set(['enabled', 'revealStart', 'revealEnd', 'fade'])

/** The tribes' fade, written to a uniform on every frame (`mapLayers`) — spelled out by key, as above. */
const TRIBES_READ_EVERY_FRAME = new Set(['mode', 'widthKm'])

/**
 * The flight controls, read once when a flight begins rather than every frame.
 *
 * Exempt from the callback guard for the same reason — they trigger no rebuild — but the exemption is
 * only honest because {@link FLIGHT_CONTROLS} are asserted directly below, against the options object
 * the camera actually reads.
 */
const FLIGHT_CONTROLS = ['flyDurationMs', 'flyFocusZoom', 'flyArcZoom'] as const

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
        const { calls, controls: fresh, dev } = build()
        const match = fresh.find(
          (c) => c.property === controller.property && c.getValue() === controller.getValue()
        )
        if (!match) continue
        nudge(match)
        const exempt =
          (match.object === dev.vassals && VASSALS_READ_EVERY_FRAME.has(match.property)) ||
          (match.object === dev.tribes && TRIBES_READ_EVERY_FRAME.has(match.property)) ||
          READ_EVERY_FRAME.has(match.property) ||
          (FLIGHT_CONTROLS as readonly string[]).includes(match.property)
        if (total(calls) === 0 && !exempt) inert.push(match.property)
      }
      expect(inert).toEqual([])
      // Quadratic on purpose: the panel is rebuilt once per control, so a callback fired by one cannot
      // be credited to another. Six new title controls took it past the five-second default; the cost
      // is the price of the guard, not a slow test to fix.
    }, 30_000)

    it('writes each flight control into the options object the camera reads', () => {
      // These fire no callback, so the guard above cannot see them. Without this they would be exempt
      // on trust — and a flight tunable captured by value would go inert with nothing to say so.
      for (const property of FLIGHT_CONTROLS) {
        const { controls, controlsOptions } = build()
        const control = controls.find((c) => c.property === property)
        expect(control, `no control for ${property}`).toBeDefined()
        if (!control) continue
        const before = controlsOptions[property]
        nudge(control)
        expect(controlsOptions[property], property).not.toBe(before)
      }
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
      expect(calls.rebuildRhumb).toBe(1)
      // The coastline lies on the relief, so it is retraced through it — and without a land mask the
      // shore ramp is drawn against the same threshold.
      expect(calls.rebuildRelief).toBe(1)
      expect(calls.rebuildCoastline ?? 0).toBe(0)
    })

    it('routes the flat lift to the rhumbs, which alone stand on the flat sea', () => {
      const { calls, controls } = build()
      const control = controls.find((c) => c.property === 'yLift')
      expect(control).toBeDefined()
      if (control) nudge(control)
      expect(calls.rebuildRhumb).toBe(1)
      expect(calls.rebuildCoastline ?? 0).toBe(0)
    })

    it('routes the coast lift and the depth bias to a coastline rebuild', () => {
      for (const property of ['shoreLift', 'depthBias']) {
        const { calls, controls } = build()
        const control = controls.find((c) => c.property === property)
        expect(control).toBeDefined()
        if (control) nudge(control)
        expect(calls.rebuildCoastline).toBe(1)
      }
    })

    it('routes the shore ramp, the smoothing and the subdivision to a relief rebuild', () => {
      for (const property of ['shoreRamp', 'smoothing', 'segments']) {
        const { calls, controls } = build()
        const control = controls.find((c) => c.property === property)
        expect(control).toBeDefined()
        if (control) nudge(control)
        expect(calls.rebuildRelief).toBe(1)
      }
    })

    it('leaves the relief geometry alone when only the exaggeration moves, a scale on the mesh', () => {
      const { calls, controls } = build()
      const control = controls.find((c) => c.property === 'exaggeration')
      expect(control).toBeDefined()
      if (control) nudge(control)
      expect(calls.rebuildRelief ?? 0).toBe(0)
    })

    it('rebuilds the rivers for every tunable but the colour', () => {
      // Everything else is baked into the layer when it is built, which is the exact hole the inert
      // river sliders went through.
      const { calls, controls } = build()
      const reveal = controls.find((c) => c.property === 'revealStart')
      if (reveal) nudge(reveal)
      expect(calls.rebuildRivers).toBe(1)
    })

    it('writes the vassals’ reveal into the live object the frame reads, with no rebuild', () => {
      const { dev, calls, controls } = build()
      const vassals = controls.filter((c) => c.object === dev.vassals)
      expect(vassals.map((c) => c.property)).toEqual([
        'enabled',
        'revealStart',
        'revealEnd',
        'fade',
      ])
      for (const control of vassals) nudge(control)
      expect(dev.vassals.enabled).toBe(false)
      expect(dev.vassals.revealStart).not.toBe(0.45)
      expect(total(calls)).toBe(0)
    })

    it('writes the tribes’ fade into the live object the frame reads, with no rebuild', () => {
      const { dev, calls, controls } = build()
      const tribes = controls.filter((c) => c.object === dev.tribes)
      expect(tribes.map((c) => c.property)).toEqual(['mode', 'widthKm'])
      const [mode, width] = tribes
      if (mode) nudge(mode, 'outset')
      if (width) nudge(width, 30)
      expect(dev.tribes).toEqual({ mode: 'outset', widthKm: 30 })
      expect(total(calls)).toBe(0)
    })

    it('starts the tribes’ fade from core’s default, the one the Cartographer draws', () => {
      expect(build().dev.tribes).toEqual(TRIBE_FEATHER)
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
      dev.vassals.revealStart = 0.9
      dev.vassals.enabled = false
      dev.tribes.mode = 'outset'
      const reset = controls.find((c) => c.property === 'resetToDefaults')
      ;(reset?.object as { resetToDefaults: () => void }).resetToDefaults()
      expect(dev.texture.seaLevel).toBe(before)
      expect(dev.vassals).toEqual(createDevState().vassals)
      expect(dev.tribes).toEqual(createDevState().tribes)
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
