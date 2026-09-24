import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop } from 'three'

import type { BufferAttribute } from 'three'

/** Axis-aligned rectangle in the world ground plane (XZ). Structurally matches the controls' `MapRect`. */
export interface Rect {
  /** Minimum X. */
  minX: number
  /** Maximum X. */
  maxX: number
  /** Minimum Z. */
  minZ: number
  /** Maximum Z. */
  maxZ: number
}

/** A ground-plane debug rectangle: a renderable line loop plus its show/update/dispose controls. */
export interface DebugRect {
  /** The renderable object to add to the scene. */
  readonly object: LineLoop<BufferGeometry, LineBasicMaterial>
  /**
   * Show or hide the rectangle.
   * @param visible - whether to draw it
   */
  setVisible(visible: boolean): void
  /**
   * Move the rectangle to a world XZ rectangle at height `y`.
   * @param rect - the rectangle to draw
   * @param y - ground height for the line
   */
  update(rect: Rect, y: number): void
  /** Free the GPU resources (geometry + material). */
  dispose(): void
}

/**
 * Create a debug rectangle line loop, drawn on top (no depth test) so it stays visible over the relief,
 * hidden by default.
 * @param color - line colour
 * @returns the debug rectangle handle
 */
export function createDebugRect(color: string): DebugRect {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(4 * 3), 3))
  const material = new LineBasicMaterial({ color, depthTest: false })
  const object = new LineLoop(geometry, material)
  object.visible = false
  object.renderOrder = 999
  return {
    object,
    setVisible(visible: boolean): void {
      object.visible = visible
    },
    update(rect: Rect, y: number): void {
      const pos = geometry.getAttribute('position') as BufferAttribute
      pos.setXYZ(0, rect.minX, y, rect.minZ)
      pos.setXYZ(1, rect.maxX, y, rect.minZ)
      pos.setXYZ(2, rect.maxX, y, rect.maxZ)
      pos.setXYZ(3, rect.minX, y, rect.maxZ)
      pos.needsUpdate = true
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
