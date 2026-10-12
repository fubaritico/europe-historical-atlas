// @vitest-environment jsdom
import { PerspectiveCamera } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { createMapControls, driveOrGlide, easeOutDecay } from './mapControls'

import type { MapControls, MapControlsOptions } from './mapControls'

/**
 * Fresh, fully-specified options for a controls instance under test.
 * @returns default options (extent ±6, zoom-in closer than zoom-out)
 */
function baseOptions(): MapControlsOptions {
  return {
    extent: { minX: -6, maxX: 6, minZ: -6, maxZ: 6 },
    minDistance: 2,
    maxDistance: 10,
    minPitchDeg: 45,
    maxPitchDeg: 70,
    panSpeed: 8,
    zoomSpeed: 0.1,
    smoothingTau: 0.12,
    initialZoom: 0.5,
    enableDrag: true,
    enableEdgeScroll: false,
    edgeScrollMargin: 24,
    edgeScrollSpeed: 10,
    flyDurationMs: 700,
    flyFocusZoom: 1,
    flyArcZoom: 0,
  }
}

const created: MapControls[] = []

/**
 * Build a controls instance wired to a fresh camera (aspect 1), DOM element and isolated key target.
 * @param options - options (defaults to {@link baseOptions})
 * @returns the camera, dom element, key target and controls
 */
function setup(options: MapControlsOptions = baseOptions()): {
  camera: PerspectiveCamera
  dom: HTMLElement
  keyTarget: EventTarget
  controls: MapControls
} {
  const camera = new PerspectiveCamera(50, 1, 0.1, 300)
  const dom = document.createElement('div')
  const keyTarget = new EventTarget()
  const controls = createMapControls(camera, dom, options, keyTarget)
  created.push(controls)
  return { camera, dom, keyTarget, controls }
}

/** Dispatch a held arrow key to a target. */
function keyDown(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }))
}
/** Release an arrow key on a target. */
function keyUp(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keyup', { key }))
}
/** Dispatch a wheel notch (negative deltaY = up = zoom in). */
function wheel(dom: HTMLElement, deltaY: number): void {
  dom.dispatchEvent(new WheelEvent('wheel', { deltaY, cancelable: true }))
}
/** Advance the controls by `steps` frames of `dt` seconds. */
function run(controls: MapControls, steps: number, dt = 1 / 60): void {
  for (let i = 0; i < steps; i++) controls.update(dt)
}
/** Build a mouse/pointer event with guaranteed client coordinates (jsdom drops them otherwise). */
function makeMouse(type: string, x: number, y: number, button = 0): MouseEvent {
  const e = new MouseEvent(type, { button, cancelable: true, bubbles: true })
  Object.defineProperty(e, 'clientX', { value: x })
  Object.defineProperty(e, 'clientY', { value: y })
  return e
}
/** Whether the current frustum footprint sits within the extent (± eps) — the core "no void" invariant. */
function footprintInExtent(controls: MapControls, eps = 1e-3): boolean {
  const e = controls.getExtent()
  const f = controls.getFootprint()
  return (
    f.minX >= e.minX - eps &&
    f.maxX <= e.maxX + eps &&
    f.minZ >= e.minZ - eps &&
    f.maxZ <= e.maxZ + eps
  )
}

afterEach(() => {
  while (created.length > 0) created.pop()?.dispose()
  document.body.innerHTML = ''
})

describe('inertia helpers', () => {
  it('easeOutDecay: no decay at dt 0, monotonically smaller for larger dt, always in [0, 1]', () => {
    expect(easeOutDecay(0, 0.1)).toBe(1)
    expect(easeOutDecay(0.1, 0.1)).toBeCloseTo(Math.exp(-1))
    expect(easeOutDecay(1, 0.1)).toBeLessThan(easeOutDecay(0.05, 0.1))
    expect(easeOutDecay(1, 0.1)).toBeGreaterThanOrEqual(0)
  })

  it('driveOrGlide: snaps to the drive when driven, glides toward zero when released', () => {
    expect(driveOrGlide(2, 5, 0.9)).toBe(5) // input → snap to full speed
    expect(driveOrGlide(2, 0, 0.9)).toBeCloseTo(1.8) // no input → decelerate
  })
})

describe('MapControls', () => {
  describe('happy path', () => {
    it('places the camera above and south of the target, view inside the extent', () => {
      const { camera, controls } = setup()
      run(controls, 60)
      expect(camera.position.y).toBeGreaterThan(0)
      expect(camera.position.z).toBeGreaterThan(controls.target.z) // south of the target
      expect(camera.position.x).toBeCloseTo(controls.target.x) // yaw locked north → no X offset
      expect(footprintInExtent(controls)).toBe(true)
    })

    it('reports the zoom for persistence', () => {
      const { controls } = setup()
      expect(controls.getState().zoom).toBe(0.5)
    })
  })

  describe('variants', () => {
    it('pans east/west and north/south with the arrow keys', () => {
      const { keyTarget, controls } = setup()
      const x0 = controls.target.x
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 30)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBeGreaterThan(x0)

      const z0 = controls.target.z
      keyDown(keyTarget, 'ArrowUp')
      run(controls, 30)
      keyUp(keyTarget, 'ArrowUp')
      expect(controls.target.z).toBeLessThan(z0) // north is −Z
    })

    it('zooms in on wheel-up and out on wheel-down (glides with inertia)', () => {
      const { dom, controls } = setup()
      const z0 = controls.zoom
      wheel(dom, -100)
      run(controls, 40)
      expect(controls.zoom).toBeGreaterThan(z0)
      const zIn = controls.zoom
      wheel(dom, 100)
      wheel(dom, 100)
      run(controls, 40)
      expect(controls.zoom).toBeLessThan(zIn)
    })

    it('zooms with the keyboard (+ / - keys) as a wheel equivalent', () => {
      const { keyTarget, controls } = setup()
      const z0 = controls.zoom
      keyDown(keyTarget, '+')
      run(controls, 40)
      expect(controls.zoom).toBeGreaterThan(z0)
      const zIn = controls.zoom
      keyDown(keyTarget, '-')
      keyDown(keyTarget, '-')
      run(controls, 40)
      expect(controls.zoom).toBeLessThan(zIn)
    })

    it('ignores ctrl+wheel so the browser native page zoom passes through', () => {
      const { dom, controls } = setup()
      const z0 = controls.zoom
      dom.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true }))
      run(controls, 20)
      expect(controls.zoom).toBe(z0)
    })

    it('moves the camera closer to the target as zoom increases', () => {
      const { camera, controls } = setup()
      run(controls, 120)
      const far = camera.position.distanceTo(controls.target)
      controls.zoom = 1
      run(controls, 120)
      const near = camera.position.distanceTo(controls.target)
      expect(near).toBeLessThan(far)
    })

    it('lets the target reach further when zoomed in (smaller footprint)', () => {
      const out = setup()
      out.controls.zoom = 0
      run(out.controls, 200)
      keyDown(out.keyTarget, 'ArrowRight')
      run(out.controls, 200)
      keyUp(out.keyTarget, 'ArrowRight')
      const xOut = out.controls.target.x

      const inn = setup()
      inn.controls.zoom = 1
      run(inn.controls, 200)
      keyDown(inn.keyTarget, 'ArrowRight')
      run(inn.controls, 200)
      keyUp(inn.keyTarget, 'ArrowRight')
      const xIn = inn.controls.target.x

      expect(xIn).toBeGreaterThan(xOut)
    })

    it('does not pan while a form field has focus (keeps arrow keys for lil-gui)', () => {
      const { keyTarget, controls } = setup()
      const x0 = controls.target.x
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 30)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(x0)
    })

    it('round-trips getState → setState, keeping the view inside the extent', () => {
      const { controls } = setup()
      controls.setState({ target: [1, 0, 1], zoom: 0.6 })
      expect(controls.getState().zoom).toBe(0.6)
      expect(footprintInExtent(controls)).toBe(true)
    })

    it('keeps gliding after a pan key is released (inertia)', () => {
      const { keyTarget, controls } = setup()
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 12)
      keyUp(keyTarget, 'ArrowRight')
      const xRelease = controls.target.x
      run(controls, 15) // no input → momentum carries the target further east before settling
      expect(controls.target.x).toBeGreaterThan(xRelease)
    })

    it('pans by grabbing and dragging the pointer (grab-the-map)', () => {
      const { dom, controls } = setup()
      run(controls, 10)
      const x0 = controls.target.x
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100))
      window.dispatchEvent(makeMouse('pointermove', 160, 100)) // drag east 60px
      window.dispatchEvent(makeMouse('pointerup', 160, 100))
      expect(controls.target.x).toBeLessThan(x0) // grab-drag east → the view moves west
    })

    it('edge-scrolls when the pointer nears a screen edge', () => {
      const options = baseOptions()
      options.enableEdgeScroll = true
      const { controls } = setup(options)
      run(controls, 10)
      const x0 = controls.target.x
      window.dispatchEvent(makeMouse('pointermove', 3, 400)) // near the left edge
      run(controls, 40)
      expect(controls.target.x).toBeLessThan(x0) // left edge → pan west
    })
  })

  describe('managed errors', () => {
    it('clamps an out-of-range restored zoom into [0, 1]', () => {
      const { controls } = setup()
      controls.setState({ target: [0, 0, 0], zoom: 5 })
      expect(controls.zoom).toBe(1)
      controls.setState({ target: [0, 0, 0], zoom: -3 })
      expect(controls.zoom).toBe(0)
    })

    it('pulls a restored target far outside back so the view stays inside the extent', () => {
      const { controls } = setup()
      controls.setState({ target: [999, 0, -999], zoom: 0.5 })
      expect(footprintInExtent(controls)).toBe(true)
    })
  })

  describe('unmanaged errors', () => {
    it('keeps a finite camera pose when update gets a negative delta', () => {
      const { camera, controls } = setup()
      controls.update(-1)
      expect(Number.isFinite(camera.position.x)).toBe(true)
      expect(Number.isFinite(camera.position.y)).toBe(true)
      expect(Number.isFinite(camera.position.z)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('never lets the footprint leave the extent, however long a key is held', () => {
      const { keyTarget, controls } = setup()
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 400)
      keyUp(keyTarget, 'ArrowRight')
      expect(footprintInExtent(controls)).toBe(true)
    })

    it('clamps zoom to [0, 1] on repeated wheel notches', () => {
      const { dom, controls } = setup()
      for (let i = 0; i < 20; i++) wheel(dom, -100)
      run(controls, 60)
      expect(controls.zoom).toBe(1)
      for (let i = 0; i < 40; i++) wheel(dom, 100)
      run(controls, 60)
      expect(controls.zoom).toBe(0)
    })

    it('does not pan when update is called with delta 0', () => {
      const { keyTarget, controls } = setup()
      const x0 = controls.target.x
      keyDown(keyTarget, 'ArrowRight')
      controls.update(0)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(x0)
    })

    it('stops responding to key/drag input after dispose (no leak)', () => {
      const { dom, keyTarget, controls } = setup()
      const x0 = controls.target.x
      controls.dispose()
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 30)
      keyUp(keyTarget, 'ArrowRight')
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100))
      window.dispatchEvent(makeMouse('pointermove', 220, 100))
      window.dispatchEvent(makeMouse('pointerup', 220, 100))
      expect(controls.target.x).toBe(x0)
    })
  })
})

describe('MapControls focus', () => {
  describe('happy path', () => {
    it('reaches the point it was sent to', () => {
      const { controls } = setup()
      controls.focusOn(3, -2)
      controls.update(1) // longer than the flight
      expect(controls.target.x).toBeCloseTo(3)
      expect(controls.target.z).toBeCloseTo(-2)
    })

    it('settles at the focus zoom, not a step from where it started', () => {
      const { controls } = setup()
      controls.focusOn(0, 0)
      controls.update(1)
      expect(controls.zoom).toBe(1)
    })

    it('enters the focus, and reports it', () => {
      const { controls } = setup()
      expect(controls.focused).toBe(false)
      controls.focusOn(0, 0)
      expect(controls.focused).toBe(true)
    })
  })

  describe('variants', () => {
    it('reports that it is flying, and stops reporting once it lands', () => {
      const { controls } = setup()
      controls.focusOn(3, -2)
      expect(controls.flying).toBe(true)
      controls.update(1)
      expect(controls.flying).toBe(false)
    })

    it('takes several frames rather than jumping', () => {
      const { controls } = setup()
      controls.focusOn(5, 0)
      controls.update(0.1)
      expect(controls.target.x).toBeLessThan(5)
      expect(controls.flying).toBe(true)
    })

    it('places the camera along the way, not only at the end', () => {
      const { camera, controls } = setup()
      controls.focusOn(5, 0)
      const before = camera.position.x
      controls.update(0.2)
      expect(camera.position.x).not.toBeCloseTo(before)
    })
  })

  describe('managed errors', () => {
    it('is cancelled by an arrow key, the reader taking the camera back', () => {
      const { controls, keyTarget } = setup()
      controls.focusOn(5, 0)
      keyDown(keyTarget, 'ArrowLeft')
      expect(controls.flying).toBe(false)
    })

    it('keeps the focus when the reader drives, so looking around does not cost the way back', () => {
      const { controls, keyTarget, dom } = setup()
      controls.focusOn(5, 0)
      keyDown(keyTarget, 'ArrowLeft')
      wheel(dom, -100)
      dom.dispatchEvent(makeMouse('pointerdown', 10, 10))
      expect(controls.focused).toBe(true)
    })

    it('is cancelled by the wheel', () => {
      const { controls, dom } = setup()
      controls.focusOn(5, 0)
      wheel(dom, -100)
      expect(controls.flying).toBe(false)
    })

    it('is cancelled by a drag', () => {
      const { controls, dom } = setup()
      controls.focusOn(5, 0)
      dom.dispatchEvent(makeMouse('pointerdown', 10, 10))
      expect(controls.flying).toBe(false)
    })

    it('is cancelled by restoring a persisted viewpoint, focus and all', () => {
      // Flying back afterwards would undo the restore: the remembered viewpoint belongs to a session
      // the reader has just been taken away from.
      const { controls } = setup()
      controls.focusOn(5, 0)
      controls.setState({ target: [0, 0, 0], zoom: 0.5 })
      expect(controls.flying).toBe(false)
      expect(controls.focused).toBe(false)
    })

    it('stays inside the extent, however far it was sent', () => {
      // The clamp runs every frame, so a flight cannot carry the view off the map.
      const { controls } = setup()
      controls.focusOn(9999, 9999)
      controls.update(1)
      const extent = controls.getExtent()
      expect(controls.target.x).toBeLessThanOrEqual(extent.maxX)
      expect(controls.target.z).toBeLessThanOrEqual(extent.maxZ)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the camera where the flight had reached when it is cancelled', () => {
      const { controls, dom } = setup()
      controls.focusOn(5, 0)
      controls.update(0.2)
      const partway = controls.target.x
      wheel(dom, -100)
      controls.update(0.016)
      expect(controls.target.x).toBeCloseTo(partway, 1)
    })
  })

  describe('edge cases', () => {
    it('arrives at once when the duration is zero, which is what reduced motion asks', () => {
      const { controls } = setup({ ...baseOptions(), flyDurationMs: 0 })
      controls.focusOn(3, -2)
      expect(controls.flying).toBe(false)
      expect(controls.target.x).toBeCloseTo(3)
    })
  })
})

/** Press at one place, release at another — the shape of a grab-and-drag pan. */
function press(dom: HTMLElement, fromX: number, toX: number): void {
  dom.dispatchEvent(makeMouse('pointerdown', fromX, 100))
  window.dispatchEvent(makeMouse('pointermove', toX, 100))
  window.dispatchEvent(makeMouse('pointerup', toX, 100))
}

describe('MapControls pointerDragged', () => {
  describe('happy path', () => {
    it('reports a drag once the pointer has travelled', () => {
      const { controls, dom } = setup()
      press(dom, 100, 220)
      expect(controls.pointerDragged).toBe(true)
    })

    it('reports a click when the pointer barely moved', () => {
      // A hand holding a button down moves a pixel or two; calling that a drag would answer no clicks.
      const { controls, dom } = setup()
      press(dom, 100, 102)
      expect(controls.pointerDragged).toBe(false)
    })
  })

  describe('variants', () => {
    it('is false before the pointer has been used at all', () => {
      expect(setup().controls.pointerDragged).toBe(false)
    })

    it('clears on the next press, so one drag does not shadow the click after it', () => {
      const { controls, dom } = setup()
      press(dom, 100, 220)
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100))
      expect(controls.pointerDragged).toBe(false)
    })

    it('measures the path walked, not the distance between the ends', () => {
      // Out and back is a drag, even though it finishes where it started.
      const { controls, dom } = setup()
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100))
      window.dispatchEvent(makeMouse('pointermove', 200, 100))
      window.dispatchEvent(makeMouse('pointermove', 100, 100))
      window.dispatchEvent(makeMouse('pointerup', 100, 100))
      expect(controls.pointerDragged).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('reports a click when dragging is switched off, whatever the pointer did', () => {
      const { controls, dom } = setup({ ...baseOptions(), enableDrag: false })
      press(dom, 100, 400)
      expect(controls.pointerDragged).toBe(false)
    })

    it('reports a click for a press with the wrong button', () => {
      const { controls, dom } = setup()
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100, 2))
      window.dispatchEvent(makeMouse('pointermove', 400, 100))
      window.dispatchEvent(makeMouse('pointerup', 400, 100))
      expect(controls.pointerDragged).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('reports a click for a release that followed no press', () => {
      const { controls } = setup()
      window.dispatchEvent(makeMouse('pointerup', 400, 100))
      expect(controls.pointerDragged).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('reports a click for a press that never moved', () => {
      const { controls, dom } = setup()
      dom.dispatchEvent(makeMouse('pointerdown', 100, 100))
      window.dispatchEvent(makeMouse('pointerup', 100, 100))
      expect(controls.pointerDragged).toBe(false)
    })
  })
})

describe('MapControls leaving the focus', () => {
  describe('happy path', () => {
    it('comes back to where the camera stood before the focus', () => {
      const { controls } = setup()
      const before = { x: controls.target.x, z: controls.target.z, zoom: controls.zoom }
      controls.focusOn(3, -2)
      controls.update(1)
      controls.exitFocus()
      controls.update(1)
      expect(controls.target.x).toBeCloseTo(before.x)
      expect(controls.target.z).toBeCloseTo(before.z)
      expect(controls.zoom).toBeCloseTo(before.zoom)
      expect(controls.focused).toBe(false)
    })

    it('pans to a point at the zoom held before the focus', () => {
      const { controls } = setup()
      const before = controls.zoom
      controls.focusOn(3, -2)
      controls.update(1)
      controls.panTo(-1.5, 1)
      controls.update(1)
      expect(controls.target.x).toBeCloseTo(-1.5)
      expect(controls.zoom).toBeCloseTo(before)
      expect(controls.focused).toBe(false)
    })

    it('stops at the edge of what the zoom can frame rather than leaving the map', () => {
      // Coming out of a focus widens the footprint again, so a point reachable at maximum zoom may not
      // be reachable at the zoom being restored. The clamp wins — the view must stay on the sheet.
      const { controls } = setup()
      controls.focusOn(4, 0)
      controls.update(1)
      expect(controls.target.x).toBeCloseTo(4)
      controls.panTo(4, 0)
      controls.update(1)
      expect(controls.target.x).toBeLessThan(4)
      expect(controls.target.x).toBeLessThanOrEqual(controls.getExtent().maxX)
    })
  })

  describe('variants', () => {
    it('re-centres at the current zoom when there is no focus to leave', () => {
      const { controls } = setup()
      const before = controls.zoom
      controls.panTo(2, 2)
      controls.update(1)
      expect(controls.target.x).toBeCloseTo(2)
      expect(controls.zoom).toBeCloseTo(before)
    })

    it('jumps from target to target without leaving the focus', () => {
      const { controls } = setup()
      const before = { x: controls.target.x, zoom: controls.zoom }
      controls.focusOn(3, -2)
      controls.update(1)
      controls.focusOn(-3, 2)
      controls.update(1)
      expect(controls.focused).toBe(true)
      controls.exitFocus()
      controls.update(1)
      expect(controls.target.x).toBeCloseTo(before.x)
      expect(controls.zoom).toBeCloseTo(before.zoom)
    })
  })

  // L3 (managed errors): N/A — an absent focus is a reported state, not an error.

  describe('unmanaged errors', () => {
    it('says there was nothing to leave, and moves nothing', () => {
      const { controls } = setup()
      const before = controls.target.x
      expect(controls.exitFocus()).toBe(false)
      expect(controls.flying).toBe(false)
      expect(controls.target.x).toBe(before)
    })
  })

  describe('edge cases', () => {
    it('pulls the zoom out mid-flight rather than sliding across at ground level', () => {
      // The arc is what makes one target to the next legible: both ends sit at maximum zoom.
      const { controls } = setup()
      controls.focusOn(3, -2)
      controls.update(1)
      controls.focusOn(-3, 2)
      controls.update(baseOptions().flyDurationMs / 2000)
      expect(controls.zoom).toBeCloseTo(0)
    })
  })
})
