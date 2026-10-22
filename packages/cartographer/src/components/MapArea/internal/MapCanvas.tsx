import { useId, useRef } from 'react'

import { canvasWords } from '../../../canvas/canvasWords'
import { rasterToCanvas } from '../../../canvas/tribeFeatherCache'
import { useLocaleStore } from '../../../hooks/useLocaleStore'
import { useTranslation } from '../../../hooks/useTranslation'
import { MAX_SNAP_REACH_KM } from '../../../viewport/toolReach'
import { MAP_AREA_MESSAGES } from '../i18n'
import { startSurface } from '../utils/startSurface'

import type { HistoryRelay } from '../../../canvas/history/historyRelay'
import type { PaintStyle } from '../../../canvas/paint/painter'
import type { VectorLayers } from '../../../loaders/vectorLayers'
import type { PolityColourSource } from '../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../state/store'
import type { BackdropFrame } from '../../../viewport/projection'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'

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
  /** What a gesture did, or `null` to clear it — the status bar's result zone. */
  onResult: (message: string | null) => void
  /** What is under the pointer — a border or a polity — or `null`; the status bar's feature zone. */
  onFeature: (feature: string | null) => void
  /** The colours and sizes, from `design/chrome.css`. */
  style: PaintStyle
  /** What a screen reader is told this surface is. */
  label: string
  /** Where the polities' colours come from — shared with the panels. */
  colours: PolityColourSource
  /** Where the controller installs its undo and redo, for the document bar's buttons. */
  history: HistoryRelay
  /** Which ground is dry — what tells a frontier against unclaimed land from a coast. */
  landMask: LandMask
}

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
 * @param props.label - what a screen reader is told the drawing surface is; the rest goes to the controller
 * @returns the canvas element
 */
export function MapCanvas({ label, ...controller }: MapCanvasProps) {
  // Context
  const t = useTranslation(MAP_AREA_MESSAGES)
  const localeStore = useLocaleStore()

  // Ids
  const instructionsId = useId()

  // Refs
  // The overlay comes first in the tree so its ref is set before the drawing surface's callback reads it
  // (refs attach in tree order). Being positioned, it still paints above the static canvas, and it lets
  // every pointer event through to the element that owns them.
  const overlay = useRef<HTMLCanvasElement | null>(null)

  // Render
  return (
    <>
      <span id={instructionsId} style={offScreen}>
        {t('instructions')}
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
          // The controller's dependencies pass through as they came, gathered rather than named one by
          // one: a prop added to the controller is then one line in `MapCanvasProps`, not three here.
          return startSurface(node, overlay.current, {
            ...controller,
            maxSnapReachKm: MAX_SNAP_REACH_KM,
            tribeImage: rasterToCanvas,
            // Asked at each gesture: the canvas is started once, and the language can change under it.
            words: () => canvasWords(localeStore.get()),
          })
        }}
      />
    </>
  )
}
