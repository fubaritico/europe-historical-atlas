import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

import type { WorldPoint } from './drapeProjection'

/** What the pins look like, in world units — the map is 12 wide. */
export interface EventMarkerStyle {
  /** The pin's colour, as a CSS colour. */
  color: string
  /** The stem's height above the ground. */
  height: number
  /** The head's radius. */
  radius: number
}

/** The default look: a dark red pin, a little taller than the highest relief. */
export const EVENT_MARKER_STYLE: EventMarkerStyle = {
  color: '#8b1a1a',
  height: 0.12,
  radius: 0.018,
}

/** The events pinned on the relief, plus what keeps them on it. */
export interface EventMarkers {
  /** The pins, to add to the scene. */
  readonly object: Group
  /**
   * Follow the relief's live exaggeration: the pins stay planted on the scaled ground, and keep their own height.
   * @param scale - the relief's `scale.y`
   * @returns nothing
   */
  setReliefScale: (scale: number) => void
  /** Free the GPU resources. */
  dispose(): void
}

/**
 * Build one pin per ground position: a stem and a head, sharing one geometry and one material.
 * @param grounds - where each pin stands, on the relief before exaggeration
 * @param style - its look
 * @returns the pins
 */
export function createEventMarkers(
  grounds: readonly WorldPoint[],
  style: EventMarkerStyle = EVENT_MARKER_STYLE
): EventMarkers {
  const stem = new CylinderGeometry(style.radius / 4, style.radius / 4, style.height, 6)
  stem.translate(0, style.height / 2, 0)
  const head = new SphereGeometry(style.radius, 12, 8)
  head.translate(0, style.height, 0)
  const material = new MeshBasicMaterial({ color: style.color })
  const object = new Group()
  const pins = grounds.map(([x, y, z]) => {
    const pin = new Group()
    pin.add(new Mesh(stem, material), new Mesh(head, material))
    pin.position.set(x, y, z)
    object.add(pin)
    return { pin, ground: y }
  })
  return {
    object,
    setReliefScale(scale: number): void {
      for (const { pin, ground } of pins) pin.position.setY(ground * scale)
    },
    dispose(): void {
      stem.dispose()
      head.dispose()
      material.dispose()
    },
  }
}
