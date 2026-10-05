import { attachCanvas } from '../canvas/attach'

import type { PaintStyle } from '../canvas/painter'
import type { CartographerStoreHook } from '../state/store'
import type { BackdropFrame } from '../view/projection'
import type { JSX } from 'react'

/**
 * The component that owns the drawing surface.
 *
 * **Three lines of body, and that is the measure of whether this is right.** Everything that can go
 * wrong — a listener left behind, a repaint that misses a change, a wheel handler the browser ignores —
 * lives in `canvas/attach.ts`, where a test can dispatch events at it. A component is a bad place for
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
  /** The backdrop's coordinate system. */
  frame: BackdropFrame
  /** The colours and sizes, from `design/chrome.css`. */
  style: PaintStyle
  /** What to call the editorial zone on screen. */
  zoneLabel: string
  /** What a screen reader is told this surface is. */
  label: string
}

/**
 * The drawing surface.
 *
 * **Accessibility, stated rather than implied**: the canvas carries a name, and that is all it carries
 * today. It has no keyboard equivalent and no DOM shadow of what it shows — the same gap the atlas
 * records for its own canvas, deferred there to the HTML-overlay milestone. Here it waits on the tools
 * and `{Polities}`, which is what will give a keyboard reader a list of anchors to reach. Noted so that
 * nobody reads the `aria-label` as the job being done.
 * @param props - the store, the frame, the style and the names
 * @returns the canvas element
 */
export function MapCanvas({ store, frame, style, zoneLabel, label }: MapCanvasProps): JSX.Element {
  return (
    <canvas
      aria-label={label}
      // `<canvas>` is not natively focusable, so without this the keyboard pan and zoom bound in
      // `attach.ts` could never fire — nothing would ever focus the element. The two ship together or
      // neither works. Zero and not a positive value: a positive `tabIndex` jumps the document's own
      // order, which is the defect `jsx-a11y` has a rule against.
      tabIndex={0}
      style={{ display: 'block', width: '100%', height: '100%' }}
      ref={(node) =>
        node === null ? undefined : attachCanvas(node, { store, frame, style, zoneLabel })
      }
    />
  )
}
