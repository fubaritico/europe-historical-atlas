/**
 * The plain pin: the marker of an event whose type chose no icon (CMS-224).
 */

import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

import { EVENT_RENDER_ORDER } from './markers'

import type { EventMarkers } from './markers'
import type { WorldPoint } from '../drapeProjection'

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

/**
 * Build one pin per ground position: a stem and a head, sharing one geometry and one material.
 * @param grounds - where each pin stands, on the relief before exaggeration
 * @param style - its look
 * @returns the pins
 */
export function createPinMarkers(
  grounds: readonly WorldPoint[],
  style: EventMarkerStyle = EVENT_MARKER_STYLE
): EventMarkers {
  // One stem, one head and one material, shared by every pin.
  const stem = new CylinderGeometry(style.radius / 4, style.radius / 4, style.height, 6)
  stem.translate(0, style.height / 2, 0)
  const head = new SphereGeometry(style.radius, 12, 8)
  head.translate(0, style.height, 0)
  const material = new MeshBasicMaterial({ color: style.color, transparent: true })

  // A small group per pin, standing at its place, all in one group for the scene.
  const object = new Group()
  const pins = grounds.map(([x, y, z]) => {
    const pin = new Group()
    pin.add(new Mesh(stem, material), new Mesh(head, material))
    pin.position.set(x, y, z)
    pin.renderOrder = EVENT_RENDER_ORDER
    object.add(pin)
    return { pin, ground: y }
  })

  return {
    object,
    setReliefScale(scale: number): void {
      for (const { pin, ground } of pins) pin.position.setY(ground * scale)
    },
    setZoom(): void {
      // A pin has one form at every zoom.
    },
    faceCamera(): void {
      // A pin is round: it faces every way already.
    },
    dispose(): void {
      stem.dispose()
      head.dispose()
      material.dispose()
    },
  }
}
