/**
 * What the reader's pointer does to the map.
 *
 * Its own module rather than a listener in the composition root: deciding that a double-click flies and
 * a single click selects is a rule about the map, not wiring, and rules that land in `bootstrap()` are
 * the ones no test can reach (ARCH-012).
 *
 * The split of gestures is the dev's, settled on 2026-09-17: **click selects, double-click flies**. A
 * click that moved the camera would answer a question nobody asked, and a reader who wants to read a
 * place would lose their framing to it.
 */

import type { MapControls } from './controls/mapControls'
import type { SurfaceHit, SurfacePicker } from './picking/surfacePicker'

/** What the interaction drives. */
export interface MapInteractionDeps {
  /** The element pointer events are read from — normally the canvas. */
  element: HTMLElement
  /** What is under the pointer, geometrically. */
  picker: SurfacePicker
  /** The camera it flies. */
  controls: MapControls
  /**
   * What a single click landed on, or `null` when it met nothing.
   *
   * A seam, not a feature: today nothing listens, and when something does it will be a panel naming a
   * place rather than anything this module has to learn about.
   * @param hit - where the click met the terrain
   */
  onSelect?: (hit: SurfaceHit | null) => void
}

/** A mounted interaction. */
export interface MapInteraction {
  /** Remove every listener. */
  dispose: () => void
}

/**
 * Where a pointer event landed on the terrain.
 * @param deps - the interaction's world
 * @param event - the pointer event
 * @returns the hit, or `null`
 */
function hitOf(deps: MapInteractionDeps, event: MouseEvent): SurfaceHit | null {
  return deps.picker.pick(event.clientX, event.clientY, deps.element.getBoundingClientRect())
}

/**
 * Bind the pointer gestures to the map.
 * @param deps - the element, the picker and the camera
 * @returns the interaction, with the way to unbind it
 */
export function createMapInteraction(deps: MapInteractionDeps): MapInteraction {
  const onDoubleClick = (event: Event): void => {
    const hit = hitOf(deps, event as MouseEvent)
    if (!hit) return // the ray met nothing: the reader double-clicked past the edge of the world
    deps.controls.flyTo(hit.point.x, hit.point.z)
  }
  const onClick = (event: Event): void => {
    deps.onSelect?.(hitOf(deps, event as MouseEvent))
  }
  deps.element.addEventListener('dblclick', onDoubleClick)
  deps.element.addEventListener('click', onClick)
  return {
    dispose(): void {
      deps.element.removeEventListener('dblclick', onDoubleClick)
      deps.element.removeEventListener('click', onClick)
    },
  }
}
