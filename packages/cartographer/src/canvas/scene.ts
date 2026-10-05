import { lonLatToScreen, remapToScreen } from '../view/projection'

import type { CanvasScene } from './painter'
import type { Rect } from '../geometry/marquee'
import type { BackdropFrame } from '../view/projection'
import type { Point, Viewport } from '../view/viewport'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The adapter from the document to what gets painted.
 *
 * **It exists so that this does not end up in a component.** Turning a document and a viewport into a
 * list of screen positions is data in, data out — the exact shape `rules/modular-architecture.md` says
 * belongs in a module rather than in a closure, and the defect it names ARCH-012 after. A component that
 * projected its own anchors would be a component no test could exercise with a literal.
 *
 * **It is the only place that resolves a ring's indices into coordinates**, which is where the format's
 * whole point lives: an anchor held by two rings is the same *integer* in two lists, so it is projected
 * once and appears in both outlines. Resolving to coordinates earlier — which is what `RegionPayload`
 * does — is what loses the sharing.
 */

/** Everything the scene needs beyond the document. */
export interface SceneInputs {
  /**
   * The anchor table **already in backdrop pixels**, parallel to `document.anchors`.
   *
   * Handed in rather than computed, because this is the expensive half — a `log(tan(…))` per anchor — and
   * it only changes when an anchor does. The caller caches it against the edition's version counter (see
   * `canvas/anchorCache.ts`); what happens here is the cheap affine remap through the view.
   */
  anchorsInBackdrop: readonly (readonly [number, number])[]
  /** The backdrop's coordinate system — the reference frame, never the editorial zone. */
  frame: BackdropFrame
  /** The current view. */
  viewport: Viewport
  /** Which anchors are selected, by index into the document's table. */
  selected: ReadonlySet<number>
  /** What to call the editorial zone on screen. */
  zoneLabel: string
}

/**
 * The editorial zone as a screen rectangle.
 *
 * Both corners go through the projection rather than being derived from one and a size, because the
 * vertical axis is not linear: taking the north-west corner and adding a height computed in degrees
 * would put the southern edge in the wrong place, by more the taller the zone is.
 * @param document - the document, for its declared zone
 * @param inputs - the frame and the view
 * @returns the rectangle in screen pixels
 */
export function editorialZoneRect(document: YearDocument, inputs: SceneInputs): Rect {
  const zone = document.editorialZone
  const [left, top] = lonLatToScreen([zone.west, zone.north], inputs.frame, inputs.viewport)
  const [right, bottom] = lonLatToScreen([zone.east, zone.south], inputs.frame, inputs.viewport)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * The outlines of everything the document claims, as runs of screen positions.
 *
 * Every ring of every claim, flattened: the painter strokes outlines and has no interest in who holds
 * them. Who holds what is `{Polities}`'s question, and it reads the document directly.
 * @param document - the document to read
 * @param anchors - the projected anchor table, parallel to `document.anchors`
 * @returns one run of positions per ring
 */
export function projectedRings(document: YearDocument, anchors: readonly Point[]): Point[][] {
  const rings: Point[][] = []
  for (const claim of document.claims) {
    for (const ring of claim.rings) {
      const run: Point[] = []
      for (const index of ring) {
        const point = anchors[index]
        // An index with no anchor cannot be produced by any operation — `removePolity` drops a claim,
        // never a point — so dropping it here is not a fallback for a case that happens. It keeps a
        // corrupt file from throwing inside a paint, where there is nothing useful to say about it.
        if (point !== undefined) run.push(point)
      }
      rings.push(run)
    }
  }
  return rings
}

/**
 * Everything to paint, for one document and one view.
 *
 * The anchors are remapped **once** and the rings read that result, which is what keeps a shared anchor
 * a single position rather than two that could drift apart.
 * @param document - the document to draw
 * @param inputs - the frame, the view, the selection and the zone's name
 * @returns the scene the painter takes
 */
export function buildScene(document: YearDocument, inputs: SceneInputs): CanvasScene {
  const anchors = remapToScreen(inputs.anchorsInBackdrop, inputs.viewport)
  return {
    editorialZone: editorialZoneRect(document, inputs),
    zoneLabel: inputs.zoneLabel,
    rings: projectedRings(document, anchors),
    anchors,
    selected: inputs.selected,
  }
}
