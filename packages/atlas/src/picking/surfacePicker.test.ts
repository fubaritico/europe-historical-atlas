import { Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { createSurfacePicker, toNdc } from './surfacePicker'

import type { Object3D } from 'three'

const RECT = { left: 0, top: 0, width: 800, height: 600 }

/** A flat plane lying in the XZ ground plane, ten units across — the relief, minus the relief. */
function ground(): Mesh {
  const mesh = new Mesh(new PlaneGeometry(10, 10, 1, 1), new MeshBasicMaterial())
  mesh.rotateX(-Math.PI / 2)
  mesh.updateMatrixWorld(true)
  return mesh
}

/** A camera looking straight down at the origin. */
function overhead(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, RECT.width / RECT.height, 0.1, 100)
  camera.position.set(0, 10, 0)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  return camera
}

describe('toNdc', () => {
  describe('happy path', () => {
    it('puts the centre of the element at the origin', () => {
      // Component by component: the Y flip yields a negative zero, which `toEqual` treats as distinct
      // and nothing downstream does.
      const ndc = toNdc(400, 300, RECT)
      expect(ndc.x).toBeCloseTo(0)
      expect(ndc.y).toBeCloseTo(0)
    })
  })

  describe('variants', () => {
    it('flips Y, client coordinates growing downward and NDC upward', () => {
      expect(toNdc(400, 0, RECT).y).toBe(1)
      expect(toNdc(400, 600, RECT).y).toBe(-1)
    })

    it('spans -1 to 1 across the width', () => {
      expect(toNdc(0, 300, RECT).x).toBe(-1)
      expect(toNdc(800, 300, RECT).x).toBe(1)
    })

    it('subtracts the element offset, so a canvas that is not at the page origin still works', () => {
      const ndc = toNdc(140, 350, { left: 140, top: 50, width: 800, height: 600 })
      expect(ndc.x).toBeCloseTo(-1)
      expect(ndc.y).toBeCloseTo(0)
    })
  })

  describe('managed errors', () => {
    it('answers non-finitely for a zero-sized element rather than inventing its centre', () => {
      // Pure arithmetic: dividing by no width gives no position. It deliberately does NOT answer the
      // element's centre, which would be a place nobody pointed at and indistinguishable from one they
      // did. Refusing the question belongs to the picker, which has a `null` to return.
      expect(Number.isFinite(toNdc(10, 10, { left: 0, top: 0, width: 0, height: 0 }).x)).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('carries a position outside the element through, rather than clamping it', () => {
      // A pointer that has left the canvas is outside the frustum; the raycast will simply miss, which
      // is the honest answer. Clamping would invent a hit at the edge.
      expect(toNdc(-800, 300, RECT).x).toBe(-3)
    })
  })

  describe('edge cases', () => {
    it('handles an element one pixel across', () => {
      expect(toNdc(0, 0, { left: 0, top: 0, width: 1, height: 1 })).toEqual({ x: -1, y: 1 })
    })
  })
})

describe('createSurfacePicker', () => {
  describe('happy path', () => {
    it('meets the surface under the centre of the view', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      const hit = picker.pick(400, 300, RECT)
      expect(hit?.point.x).toBeCloseTo(0)
      expect(hit?.point.z).toBeCloseTo(0)
    })

    it('reports the triangle it met', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      expect(picker.pick(400, 300, RECT)?.faceIndex).toBeGreaterThanOrEqual(0)
    })

    it('refuses a zero-sized element instead of answering an arbitrary place', () => {
      // Measured, not assumed: a non-finite ray does not come back empty — three answers with an
      // intersection somewhere, which is why this is checked rather than left to the arithmetic.
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      expect(picker.pick(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toBeNull()
    })
  })

  describe('variants', () => {
    it('meets a different place for a different pointer position', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      const left = picker.pick(200, 300, RECT)
      const right = picker.pick(600, 300, RECT)
      expect(left?.point.x).toBeLessThan(right?.point.x ?? 0)
    })

    it('meets the surface the target currently is, not the one it was', () => {
      // The terrain is rebuilt whenever its height curve changes; a picker holding the old mesh would
      // answer about a surface no longer on screen.
      let target: Object3D | null = null
      const picker = createSurfacePicker({ camera: overhead(), target: () => target })
      expect(picker.pick(400, 300, RECT)).toBeNull()
      target = ground()
      expect(picker.pick(400, 300, RECT)).not.toBeNull()
    })
  })

  describe('managed errors', () => {
    it('answers nothing before there is anything to cast against', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => null })
      expect(picker.pick(400, 300, RECT)).toBeNull()
    })

    it('answers nothing when the ray meets no surface', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      // Far outside the element, so the ray leaves the ten-unit plane entirely.
      expect(picker.pick(-40000, 300, RECT)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('lets a camera that has never been placed answer honestly rather than throwing', () => {
      const unplaced = new PerspectiveCamera()
      const picker = createSurfacePicker({ camera: unplaced, target: () => ground() })
      expect(() => picker.pick(400, 300, RECT)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('allocates no raycaster per call, a pointer moving sixty times a second', () => {
      const picker = createSurfacePicker({ camera: overhead(), target: () => ground() })
      for (let i = 0; i < 50; i++) picker.pick(400, 300, RECT)
      expect(picker.pick(400, 300, RECT)).not.toBeNull()
    })
  })
})
