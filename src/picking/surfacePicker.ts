/**
 * What is under the pointer, geometrically.
 *
 * This layer answers **where**, never **what**. A raycast returns a triangle and a point; a triangle has
 * no meaning on its own, and giving one a name is the job of whatever knows about polities and dates.
 * Keeping the two apart is what lets a click mean something different later without this changing.
 *
 * The relief is displaced on the CPU precisely so this works: with a GPU `displacementMap` the geometry
 * stays flat and the ray would meet a plane where the reader sees a mountain.
 */

import { Raycaster, Vector2 } from 'three'

import type { Camera, Object3D, Vector3 } from 'three'

/** A rectangle in client coordinates — all the conversion needs of an element. */
export interface ClientRect {
  /** Distance from the viewport's left edge. */
  left: number
  /** Distance from its top edge. */
  top: number
  /** The element's width in CSS pixels. */
  width: number
  /** Its height. */
  height: number
}

/** Where a ray met a surface. */
export interface SurfaceHit {
  /** The meeting point, in world space. */
  point: Vector3
  /**
   * Which triangle it met, where the surface has triangles.
   *
   * Absent rather than `-1` when three does not provide one: a negative index looks like an index, and
   * the one thing it must not do is pass for a real answer. Absence is carried through however three
   * chooses to express it.
   */
  faceIndex: number | null | undefined
}

/** What the picker needs to answer a pointer position. */
export interface SurfacePickerDeps {
  /** The camera the ray is cast from. */
  camera: Camera
  /**
   * What to cast against, or `null` before it exists.
   *
   * A call rather than a value: the terrain is rebuilt whenever its height curve changes, so a picker
   * holding the old mesh would answer about a surface no longer on screen.
   * @returns the object to raycast
   */
  target: () => Object3D | null
}

/** A picker bound to a camera and whatever it is aimed at. */
export interface SurfacePicker {
  /**
   * What the pointer is over.
   * @param clientX - pointer X in client coordinates
   * @param clientY - pointer Y in client coordinates
   * @param rect - the element's rectangle, in the same coordinates
   * @returns the hit, or `null` when the ray met nothing
   */
  pick: (clientX: number, clientY: number, rect: ClientRect) => SurfaceHit | null
}

/**
 * Convert a client position into normalized device coordinates.
 *
 * `(-1, -1)` is the bottom-left of the element and `(1, 1)` the top-right — note the Y flip, since
 * client coordinates grow downward and NDC grows upward.
 *
 * Pure arithmetic, with no guard of its own: a zero-sized element divides to a non-finite result, which
 * is the honest arithmetic answer. Refusing to answer at all is {@link SurfacePicker.pick}'s business,
 * because that is where there is a `null` to return.
 * @param clientX - pointer X in client coordinates
 * @param clientY - pointer Y in client coordinates
 * @param rect - the element's rectangle
 * @returns the position in NDC
 */
export function toNdc(
  clientX: number,
  clientY: number,
  rect: ClientRect
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((clientY - rect.top) / rect.height) * 2 - 1),
  }
}

/**
 * Build a picker.
 *
 * The raycaster and its scratch vector are made once: a picker answers a pointer, and a pointer can move
 * sixty times a second.
 * @param deps - the camera, and what to cast against
 * @returns the picker
 */
export function createSurfacePicker(deps: SurfacePickerDeps): SurfacePicker {
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  return {
    pick(clientX: number, clientY: number, rect: ClientRect): SurfaceHit | null {
      const target = deps.target()
      if (!target) return null
      // An element with no surface cannot be pointed at, so there is no position to report. Checked
      // rather than left to the arithmetic: a non-finite ray does NOT come back empty — three answers
      // with an intersection at an arbitrary place, which is an invented position that looks real.
      if (rect.width === 0 || rect.height === 0) return null
      const ndc = toNdc(clientX, clientY, rect)
      pointer.set(ndc.x, ndc.y)
      raycaster.setFromCamera(pointer, deps.camera)
      // The nearest hit only: a ray through a folded surface meets the far side of a valley too, and
      // the reader pointed at the side they can see.
      const [nearest] = raycaster.intersectObject(target, false)
      if (!nearest) return null
      return { point: nearest.point, faceIndex: nearest.faceIndex }
    },
  }
}
