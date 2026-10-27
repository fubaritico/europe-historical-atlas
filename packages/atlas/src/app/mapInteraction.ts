/**
 * What the reader's pointer and Escape key do to the map.
 *
 * Its own module rather than a listener in the composition root: deciding that a double-click looks
 * closely and Escape comes back is a rule about the map, not wiring, and rules that land in
 * `bootstrap()` are the ones no test can reach (ARCH-012).
 *
 * The gestures are the dev's, settled on 2026-09-18:
 *
 * - **double-click** enters the focus — the camera arcs over to the point and lands at maximum zoom,
 *   remembering where it came from. Double-clicking again jumps to another target **without leaving**;
 * - **Escape** leaves it, flying back to the remembered viewpoint;
 * - **a single click** leaves it too, but lands on the clicked point at the zoom held before the focus
 *   was entered: the place you pointed at is kept, the close-up is given up. Outside the focus the same
 *   gesture simply re-centres at the current zoom.
 *
 * Panning, dragging and wheeling stay inside the focus — looking around a target must not cost the
 * reader the way back.
 */

import { isEditableFocused } from '../utils/editableFocus'

import type { MapControls } from '../controls/mapControls'
import type { SurfaceHit, SurfacePicker } from '../picking/surfacePicker'

/**
 * How long a single click waits to find out whether it was the first half of a double-click.
 *
 * The browser sends `click, click, dblclick`, so acting on the first one immediately would leave the
 * focus a beat before the double-click entered it — and the remembered viewpoint would be recaptured at
 * ground level, which quietly destroys the only thing Escape is for. The wait is paid on the gesture
 * that then takes more than a second to fly, so it does not read as lag.
 */
const CLICK_SETTLE_MS = 250

/** What the interaction drives. */
export interface MapInteractionDeps {
  /** The element pointer events are read from — normally the canvas. */
  element: HTMLElement
  /** What is under the pointer, geometrically. */
  picker: SurfacePicker
  /**
   * The camera it flies.
   *
   * Narrowed to the four members used, and derived from `MapControls` rather than restated: a
   * hand-written copy of the signatures would be free to drift from them, and nothing would fail until
   * runtime. It also lets a test hand over a stand-in with no cast.
   */
  controls: Pick<MapControls, 'focusOn' | 'panTo' | 'exitFocus' | 'pointerDragged'>
  /**
   * Where keyboard input is read from.
   *
   * `window` by default, and deliberately: Escape has to leave the focus whether or not the canvas
   * happens to hold focus. Injectable so a test can hand it an isolated target rather than leak
   * listeners onto the real window.
   */
  keyTarget?: EventTarget
  /** How long a single click waits for a double-click, in milliseconds. See {@link CLICK_SETTLE_MS}. */
  clickSettleMs?: number
  /**
   * What a single click landed on, or `null` when it met nothing.
   *
   * A seam, not a feature: today nothing listens, and when something does it will be a panel naming a
   * place rather than anything this module has to learn about. Reported once per gesture, after the
   * wait — the two presses of a double-click are one gesture and must not announce two selections.
   * @param hit - where the click met the terrain
   */
  onSelect?: (hit: SurfaceHit | null) => void
}

/** A mounted interaction. */
export interface MapInteraction {
  /** Remove every listener, and drop any click still waiting to find out what it was. */
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
 * What a settled single click does: report it, and re-centre on it.
 * @param deps - the interaction's world
 * @param hit - what the click landed on
 * @returns nothing
 */
function applyClick(deps: MapInteractionDeps, hit: SurfaceHit | null): void {
  deps.onSelect?.(hit)
  // Past the edge of the world there is no point to land on. Leaving the focus anyway would strip the
  // close-up on a click that designated nothing, so the mode is left exactly as it was.
  if (hit) deps.controls.panTo(hit.point.x, hit.point.z)
}

/**
 * Bind the gestures to the map.
 * @param deps - the element, the picker, the camera and where keys are read from
 * @returns the interaction, with the way to unbind it
 */
export function createMapInteraction(deps: MapInteractionDeps): MapInteraction {
  const keyTarget = deps.keyTarget ?? window
  const settleMs = deps.clickSettleMs ?? CLICK_SETTLE_MS
  // The single click waiting out the settle delay, if any, and the way to drop it.
  let pending: ReturnType<typeof setTimeout> | null = null
  const cancelPending = (): void => {
    if (pending === null) return
    clearTimeout(pending)
    pending = null
  }
  const onClick = (event: Event): void => {
    const me = event as MouseEvent
    // The second press of a double-click. The `dblclick` that follows speaks for both of them.
    if (me.detail > 1) return
    // The browser sends a `click` at the end of a drag-pan too, and acting on it would answer every
    // release of the map with a flight nobody asked for. The controls own that distinction.
    if (deps.controls.pointerDragged) return
    // Pick now, while the pointer is where it was clicked, and act only once the wait is over.
    const hit = hitOf(deps, me)
    cancelPending()
    pending = setTimeout(() => {
      pending = null
      applyClick(deps, hit)
    }, settleMs)
  }
  const onDoubleClick = (event: Event): void => {
    // The single click still waiting was the first half of this one: drop it, then fly in.
    cancelPending()
    const hit = hitOf(deps, event as MouseEvent)
    if (!hit) return // the ray met nothing: the reader double-clicked past the edge of the world
    deps.controls.focusOn(hit.point.x, hit.point.z)
  }
  const onKeyDown = (event: Event): void => {
    const ke = event as KeyboardEvent
    // Escape inside a form field cancels the edit, and lil-gui is full of them.
    if (ke.key !== 'Escape' || isEditableFocused()) return
    if (deps.controls.exitFocus()) ke.preventDefault()
  }
  // Pointer gestures on the element, Escape on the key target.
  deps.element.addEventListener('dblclick', onDoubleClick)
  deps.element.addEventListener('click', onClick)
  keyTarget.addEventListener('keydown', onKeyDown)
  return {
    dispose(): void {
      cancelPending() // or a click settles onto a camera nobody is driving any more
      deps.element.removeEventListener('dblclick', onDoubleClick)
      deps.element.removeEventListener('click', onClick)
      keyTarget.removeEventListener('keydown', onKeyDown)
    },
  }
}
