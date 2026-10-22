import type { CanvasWords } from './canvasWords'
import type { HistoryRelay } from './history/historyRelay'
import type { PaintStyle } from './paint/painter'
import type { RasterToImage } from './tribeFeatherCache'
import type { VectorLayers } from '../loaders/vectorLayers'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { BackdropFrame } from '../viewport/projection'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'

/**
 * What `startCanvasController` is handed by its caller — every collaborator injected, none imported.
 *
 * Out of `liveCanvas.ts` on 2026-10-18, when the tribes' image maker pushed it past the 400-line budget: the
 * contract at the seam is its own module, read by the controller, the live canvas and `MapCanvas` alike.
 */

/** Everything the wiring needs from its caller. */
export interface CanvasControllerDeps {
  /** The store: the document to draw, and the viewport to draw it through. */
  store: CartographerStoreHook
  /**
   * The backdrop's coordinate system.
   *
   * It arrives with the picture below, from the DEM's own metadata, so the box projected against and the
   * box painted are the same object rather than two that agree today.
   */
  frame: BackdropFrame
  /** The baked terrain to blit under everything else. */
  backdropImage: CanvasImageSource
  /**
   * The coastline and the rivers, in backdrop pixels.
   *
   * Held here rather than in the store because they never change: they are loaded once and the view is
   * applied at paint time. Putting them in a slice would invite a selector on an object of 125 000
   * points, which is the shape `zustand-react-pattern` warns about.
   */
  vectorLayers: VectorLayers
  /**
   * Where the pointer is, in degrees — `null` when it is off the backdrop.
   *
   * Reported raw rather than formatted: turning a position into `2°21′E` is a presentation choice, and
   * the wiring has no business holding one. `null` for the vellum around the map, which is not a place.
   */
  onHover: (lonLat: [number, number] | null) => void
  /** The colours and sizes, from the design. */
  style: PaintStyle
  /**
   * The second canvas, stacked over this one, for what moves with the pointer — the outline in progress,
   * the rubber band, an anchor being dragged. Decided for step 4: the static canvas is redrawn when the
   * document or the view changes, this one on every pointer move.
   */
  overlay: HTMLCanvasElement
  /**
   * The status bar's action sentence — *"Drawing in Reaume de France"* — or `null` when no action has a
   * subject. Reported only when it changes; raw like `onHover`, the bar decides how to show it.
   */
  onAction: (sentence: string | null) => void
  /** Where the polities' colours come from — the same source `{Polities}` and the layer read. */
  colours: PolityColourSource
  /**
   * The status bar's result zone — what a gesture did, *"inserted 412 vertices from the coastline"* —
   * or `null` to clear it. Beside the action, never in its place (`s02`, the dev's call of 2026-10-08).
   */
  onResult: (message: string | null) => void
  /**
   * How far the snap may reach on the ground, in kilometres, for the drawing tools to act (`H-34`) —
   * `MAX_SNAP_REACH_KM` in the application. Injected rather than imported so a suite about another
   * gesture can lift it, and the threshold's own suite can set it.
   */
  maxSnapReachKm: number
  /** Where the controller installs its undo and redo, for the document bar's buttons. */
  history: HistoryRelay
  /** Which ground is dry — what tells a frontier against unclaimed land from a coast. */
  landMask: LandMask
  /** What is under the pointer — a border, or a polity's fill — for the status bar; `null` for nothing. */
  onFeature: (feature: string | null) => void
  /** How a tribe's fade becomes a drawable image — `rasterToCanvas` in the application, a stand-in in a test. */
  tribeImage: RasterToImage
  /**
   * Everything the canvas says, in the language of the moment (ATLAS-159) — `canvasWords` over the page's
   * language, **asked at each gesture** rather than once: the canvas is mounted once, and the language can
   * change under it (ATLAS-266).
   */
  words: () => CanvasWords
}
