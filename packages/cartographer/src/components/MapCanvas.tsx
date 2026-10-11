import { useId, useRef } from 'react'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'

import { startCanvasController } from '../canvas/controller'
import { trackFocusOrigin } from '../canvas/focusOrigin'

import type { CanvasControllerDeps } from '../canvas/controller'
import type { PaintStyle } from '../canvas/painter'
import type { CartographerStoreHook } from '../state/store'
import type { VectorLayers } from '../vectorLayers'
import type { BackdropFrame } from '../view/projection'

/**
 * The component that owns the drawing surface.
 *
 * **Three lines of body, and that is the measure of whether this is right.** Everything that can go
 * wrong — a listener left behind, a repaint that misses a change, a wheel handler the browser ignores —
 * lives in `canvas/controller.ts`, where a test can dispatch events at it. A component is a bad place for
 * any of that, because exercising it would mean rendering it.
 *
 * **The canvas is owned by a `ref` callback that returns its own cleanup.** Verified in the installed
 * types: React 19's `RefCallback<T>` returns `void | (() => …)`. So the painter's life is exactly the
 * node's life — no `useEffect`, and no dependency array to get wrong. `StrictMode` double-invokes it in
 * development, which is why it is kept (`main.tsx`): a teardown that leaves something behind shows up as
 * a doubled repaint rather than as an error.
 *
 * **The store is handed in, never imported.** `createCartographerStore` is a factory, so there is no
 * module-level hook to reach for — which is what makes this component mountable against a stub.
 */
export interface MapCanvasProps {
  /** The store to draw from and navigate. */
  store: CartographerStoreHook
  /** The backdrop's coordinate system, as the DEM declared it. */
  frame: BackdropFrame
  /** The baked terrain to draw under everything else. */
  backdropImage: CanvasImageSource
  /** The coastline and the rivers, in backdrop pixels — what the Pen will snap to. */
  vectorLayers: VectorLayers
  /** Where the pointer is, in degrees, or `null` off the map — written by the status bar. */
  onHover: (lonLat: [number, number] | null) => void
  /** The action and its subject, or `null` — written by the status bar's other zone. */
  onAction: (sentence: string | null) => void
  /** The colours and sizes, from `design/chrome.css`. */
  style: PaintStyle
  /** What to call the editorial zone on screen. */
  zoneLabel: string
  /** What a screen reader is told this surface is. */
  label: string
}

/**
 * What a keyboard reader is told the surface can do.
 *
 * **It names only the keys `controller.ts` actually binds**, which is what keeps it from going stale:
 * the arrows, `+`/`−` and PageUp/PageDown, ‹P› and ‹A›, and the Pen's three keys. Promising a gesture
 * before it is wired is the defect this repository keeps finding in its own comments.
 */
const CANVAS_INSTRUCTIONS =
  'Arrow keys to pan the map, plus and minus or Page Up and Page Down to zoom. ' +
  'P takes the Pen and A the white arrow. With the Pen, Backspace removes the last point, ' +
  'Escape abandons the outline and Enter closes it.'

/** Off-screen but in the accessibility tree — the instruction text has nothing to show visually. */
const offScreen = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/** The overlay sits exactly over the surface and lets every pointer event through to it. */
const OVERLAY_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
} as const

/**
 * Start the surface's controller once both canvases exist, and hand back its teardown.
 *
 * **A missing overlay throws rather than leaving the map inert.** The overlay comes first in the tree, so
 * its ref is attached before this runs; finding it `null` means that order was broken, a wiring fault.
 * Returning quietly would leave a canvas that never paints and never answers, with nothing said — the
 * same reasoning as the controller's own throw on a missing 2D context.
 * @param node - the drawing surface
 * @param overlay - the overlay canvas, or `null` if the tree order was broken
 * @param deps - everything the controller needs but the overlay
 * @returns the teardown
 */
function startSurface(
  node: HTMLCanvasElement,
  overlay: HTMLCanvasElement | null,
  deps: Omit<CanvasControllerDeps, 'overlay'>
): () => void {
  if (overlay === null) {
    throw new Error('Cartographer: the overlay canvas was not mounted before the drawing surface.')
  }
  const forgetFocusOrigin = trackFocusOrigin(node)
  const stopController = startCanvasController(node, { ...deps, overlay })
  return () => {
    stopController()
    forgetFocusOrigin()
  }
}

/**
 * The drawing surface.
 *
 * **Accessibility, stated rather than implied, and corrected on 2026-10-07.** This comment used to say
 * the canvas *"has no keyboard equivalent"* — which stopped being true in the same step that wrote it:
 * `controller.ts` binds the arrows and the zoom keys, and the element carries `tabIndex` so they can fire.
 * A comment contradicting the code three lines below it is worse than no comment, and a review caught
 * exactly that.
 *
 * **What it now carries**: a name, and a description of the keys — because a focusable, named element
 * that answers to arrow keys tells a reader nothing about them otherwise. **No `role`**, deliberately:
 * `role="application"` is the obvious candidate and is contested, since several screen readers switch
 * into a mode that suppresses their own navigation commands for the whole page — trading this gap for a
 * larger one. A described, focusable surface is the part that is uncontested, so it is the part shipped.
 *
 * **The real remaining gap is narrower than it was**: there is no DOM shadow of the document itself, so a
 * screen-reader user can move the view but cannot reach an anchor or hear what is under it. That waits on
 * the tools and `{Polities}`, which is what will give a keyboard reader a list to walk.
 * @param props - the store, the frame, the style and the names
 * @returns the canvas element
 */
export function MapCanvas({
  store,
  frame,
  backdropImage,
  vectorLayers,
  onHover,
  onAction,
  style,
  zoneLabel,
  label,
}: MapCanvasProps) {
  const instructionsId = useId()
  // The overlay comes first in the tree so its ref is set before the drawing surface's callback reads it
  // (refs attach in tree order). Being positioned, it still paints above the static canvas, and it lets
  // every pointer event through to the element that owns them.
  const overlay = useRef<HTMLCanvasElement | null>(null)
  return (
    <>
      <span id={instructionsId} style={offScreen}>
        {CANVAS_INSTRUCTIONS}
      </span>
      <canvas ref={overlay} aria-hidden="true" style={OVERLAY_STYLE} />
      <canvas
        aria-label={label}
        aria-describedby={instructionsId}
        // `<canvas>` is not natively focusable, so without this the keyboard pan and zoom bound in
        // `controller.ts` could never fire — nothing would ever focus the element. The two ship together or
        // neither works. Zero and not a positive value: a positive `tabIndex` jumps the document's own
        // order, which is the defect `jsx-a11y` has a rule against.
        tabIndex={0}
        style={{ display: 'block', width: '100%', height: '100%' }}
        ref={(node) => {
          if (node === null) return undefined
          return startSurface(node, overlay.current, {
            store,
            frame,
            backdropImage,
            vectorLayers,
            onHover,
            onAction,
            style,
            zoneLabel,
            palette: AUTOMATIC_PALETTE,
          })
        }}
      />
    </>
  )
}
