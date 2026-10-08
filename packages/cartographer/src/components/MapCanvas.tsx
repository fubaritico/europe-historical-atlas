import { useId } from 'react'

import { startCanvasController } from '../canvas/controller'

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
 * **It names only the keys `attach.ts` actually binds today**, which is what keeps it from going stale:
 * the arrows, `+`/`−` and PageUp/PageDown exist now, and the tools of step 4d-2 will add their own keys
 * and their own sentence. Promising a gesture before it is wired is the defect this repository keeps
 * finding in its own comments.
 */
const CANVAS_INSTRUCTIONS =
  'Arrow keys to pan the map, plus and minus or Page Up and Page Down to zoom.'

/** Off-screen but in the accessibility tree — the instruction text has nothing to show visually. */
const offScreen = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/**
 * The drawing surface.
 *
 * **Accessibility, stated rather than implied, and corrected on 2026-10-07.** This comment used to say
 * the canvas *"has no keyboard equivalent"* — which stopped being true in the same step that wrote it:
 * `attach.ts` binds the arrows and the zoom keys, and the element carries `tabIndex` so they can fire.
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
  style,
  zoneLabel,
  label,
}: MapCanvasProps) {
  const instructionsId = useId()
  return (
    <>
      <span id={instructionsId} style={offScreen}>
        {CANVAS_INSTRUCTIONS}
      </span>
      <canvas
        aria-label={label}
        aria-describedby={instructionsId}
        // `<canvas>` is not natively focusable, so without this the keyboard pan and zoom bound in
        // `attach.ts` could never fire — nothing would ever focus the element. The two ship together or
        // neither works. Zero and not a positive value: a positive `tabIndex` jumps the document's own
        // order, which is the defect `jsx-a11y` has a rule against.
        tabIndex={0}
        style={{ display: 'block', width: '100%', height: '100%' }}
        ref={(node) =>
          node === null
            ? undefined
            : startCanvasController(node, {
                store,
                frame,
                backdropImage,
                vectorLayers,
                onHover,
                style,
                zoneLabel,
              })
        }
      />
    </>
  )
}
