// @vitest-environment jsdom
import { PerspectiveCamera } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { createMapControls } from './mapControls'

import type { MapControls, MapControlsOptions } from './mapControls'

/**
 * Fresh, fully-specified options for a controls instance under test.
 * @returns default options (bounds ±5 X / ±4 Z, zoom-in closer than zoom-out)
 */
function baseOptions(): MapControlsOptions {
  return {
    bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: 4 },
    minDistance: 2,
    maxDistance: 16,
    minPitchDeg: 45,
    maxPitchDeg: 72,
    panSpeed: 8,
    zoomSpeed: 0.1,
    smoothingTau: 0.12,
    initialZoom: 0.2,
  }
}

const created: MapControls[] = []

/**
 * Build a controls instance wired to a fresh camera, DOM element and isolated key target, tracked for
 * teardown. The isolated `EventTarget` keeps concurrent instances from sharing a global key stream.
 * @param options - options (defaults to {@link baseOptions})
 * @returns the camera, dom element, key target and controls
 */
function setup(options: MapControlsOptions = baseOptions()): {
  camera: PerspectiveCamera
  dom: HTMLElement
  keyTarget: EventTarget
  controls: MapControls
} {
  const camera = new PerspectiveCamera(50, 1, 0.1, 200)
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
/** Advance the controls by `steps` frames of `dt` seconds (converge the smoothing). */
function run(controls: MapControls, steps: number, dt = 1 / 60): void {
  for (let i = 0; i < steps; i++) controls.update(dt)
}

afterEach(() => {
  while (created.length > 0) created.pop()?.dispose()
  document.body.innerHTML = ''
})

describe('MapControls', () => {
  describe('happy path', () => {
    it('places the camera above and south of the target centre, looking at it', () => {
      const { camera, controls } = setup()
      expect(controls.target.x).toBeCloseTo(0)
      expect(controls.target.z).toBeCloseTo(0)
      // Yaw locked north (north = −Z): camera is elevated (+Y) and to the south (+Z) of the target.
      expect(camera.position.y).toBeGreaterThan(0)
      expect(camera.position.z).toBeGreaterThan(0)
      expect(camera.position.x).toBeCloseTo(0)
    })

    it('reports its state for persistence', () => {
      const { controls } = setup()
      expect(controls.getState()).toEqual({ target: [0, 0, 0], zoom: 0.2 })
    })
  })

  describe('variants', () => {
    it('pans east/west and north/south with the arrow keys', () => {
      const a = setup()
      keyDown(a.keyTarget, 'ArrowRight')
      a.controls.update(0.5)
      keyUp(a.keyTarget, 'ArrowRight')
      expect(a.controls.target.x).toBeGreaterThan(0)

      const b = setup()
      keyDown(b.keyTarget, 'ArrowUp')
      b.controls.update(0.5)
      keyUp(b.keyTarget, 'ArrowUp')
      expect(b.controls.target.z).toBeLessThan(0) // north is −Z
    })

    it('zooms in on wheel-up and out on wheel-down', () => {
      const { dom, controls } = setup()
      wheel(dom, -100) // up → in
      expect(controls.zoom).toBeCloseTo(0.3)
      wheel(dom, 100) // down → out
      expect(controls.zoom).toBeCloseTo(0.2)
    })

    it('moves the camera closer to the target as zoom increases', () => {
      const { camera, controls } = setup()
      run(controls, 120)
      const far = camera.position.distanceTo(controls.target)
      controls.zoom = 0.9
      run(controls, 120)
      const near = camera.position.distanceTo(controls.target)
      expect(near).toBeLessThan(far)
    })

    it('does not pan while a form field has focus (keeps arrow keys for lil-gui)', () => {
      const { keyTarget, controls } = setup()
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      keyDown(keyTarget, 'ArrowRight')
      controls.update(0.5)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(0)
    })

    it('round-trips getState → setState', () => {
      const { controls } = setup()
      controls.setState({ target: [2, 0, 1], zoom: 0.5 })
      expect(controls.target.x).toBeCloseTo(2)
      expect(controls.target.z).toBeCloseTo(1)
      expect(controls.getState()).toEqual({ target: [2, 0, 1], zoom: 0.5 })
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

    it('clamps a restored target outside the bounds', () => {
      const { controls } = setup()
      controls.setState({ target: [999, 0, -999], zoom: 0.5 })
      expect(controls.target.x).toBe(5)
      expect(controls.target.z).toBe(-4)
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
    it('clamps the pan at the bounds however long a key is held', () => {
      const { keyTarget, controls } = setup()
      keyDown(keyTarget, 'ArrowRight')
      run(controls, 600, 0.1)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(5) // bounds.maxX
    })

    it('clamps zoom to [0, 1] on repeated wheel notches', () => {
      const { dom, controls } = setup()
      for (let i = 0; i < 20; i++) wheel(dom, -100)
      expect(controls.zoom).toBe(1)
      for (let i = 0; i < 40; i++) wheel(dom, 100)
      expect(controls.zoom).toBe(0)
    })

    it('does not pan when update is called with delta 0', () => {
      const { keyTarget, controls } = setup()
      keyDown(keyTarget, 'ArrowRight')
      controls.update(0)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(0)
    })

    it('stops responding to input after dispose (no leak)', () => {
      const { keyTarget, controls } = setup()
      controls.dispose()
      keyDown(keyTarget, 'ArrowRight')
      controls.update(0.5)
      keyUp(keyTarget, 'ArrowRight')
      expect(controls.target.x).toBe(0)
    })
  })
})
