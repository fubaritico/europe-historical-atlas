import { paintRanks } from '@europe-historical-atlas/core/data/paintOrder'
import { handFor } from '@europe-historical-atlas/core/editor/borderHands'
import {
  asSeenAcrossTribes,
  isTribeEdge,
  tribeIds,
} from '@europe-historical-atlas/core/editor/tribes'

import { remapToScreen } from '../../viewport/projection'
import { backdropToScreen } from '../../viewport/viewport'

import type { CanvasScene } from './painter'
import type { PolityRings } from '../../geometry/fillHit'
import type { Rect } from '../../geometry/marquee'
import type { VectorLayers } from '../../loaders/vectorLayers'
import type { LayerSettings } from '../../state/layersSlice'
import type { BackdropFrame } from '../../viewport/projection'
import type { Point, Viewport } from '../../viewport/viewport'
import type { DerivedBorder } from '@europe-historical-atlas/core/editor/derivedBorders'
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
  /** The backdrop's coordinate system — the reference frame. */
  frame: BackdropFrame
  /** The current view. */
  viewport: Viewport
  /** Which anchors are selected, by index into the document's table. */
  selected: ReadonlySet<number>
  /** Which anchors get a handle, by index — see {@link CanvasScene.handles}. */
  handles: readonly number[]
  /** Which anchors get a snap dot, by index — see {@link CanvasScene.snapAnchors}. */
  snapAnchors: readonly number[]
  /** The aimed polity's extent outline, as runs of anchor indices — see {@link CanvasScene.extentOutline}. */
  extentOutline: readonly (readonly number[])[]
  /** The document's borders, derived from its shared anchors (`core/editor/derivedBorders`). */
  borders: readonly DerivedBorder[]
  /** What `{Layers}` shows, and how opaque. */
  layers: LayerSettings
  /** Each polity's colour, by id — see `core/editor/polityColours`. */
  colours: ReadonlyMap<string, string>
  /**
   * Each tribe's fading colour as an image over its box **in backdrop pixels**, back to front — made once per
   * version of the document by the caller (`canvas/tribeFeatherCache`), remapped through the view here.
   */
  tribeFeathers: readonly { image: CanvasImageSource; box: Rect }[]
  /** The baked terrain, or `null` while it is still being baked. */
  backdropImage: CanvasImageSource | null
  /**
   * The coastline and the rivers, **already in backdrop pixels**, or `null` before they have loaded.
   *
   * Passed straight through rather than remapped like the anchors, and `painter.ts`'s `CanvasScene`
   * header says why: at 125 000 points the affine belongs in the canvas's transform, not in a `map()`
   * that allocates on every pointer move.
   */
  vectorLayers: VectorLayers | null
}

/**
 * Where the whole backdrop sits on screen.
 *
 * The backdrop *is* the coordinate system, so its rectangle is simply its own grid through the view —
 * corner (0, 0) to corner (width, height). Nothing projects, because nothing needs to: this is the one
 * object whose pixels the viewport is defined against.
 * @param frame - the backdrop's coordinate system
 * @param inputs - the view
 * @returns the rectangle in screen pixels
 */
export function backdropRect(frame: BackdropFrame, inputs: SceneInputs): Rect {
  const [left, top] = backdropToScreen(inputs.viewport, [0, 0])
  const [right, bottom] = backdropToScreen(inputs.viewport, [frame.size.width, frame.size.height])
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
 * The claims back to front — the polities' `paintOrder`, the same function the atlas paints by
 * (`s16`), so the Cartographer and the atlas show one map. A claim naming a polity the registry lacks is
 * left out: it is not painted, and `documentFaults` reports it once per version.
 * @param document - the document to read
 * @returns the claims, back to front
 */
export function claimsInPaintOrder(document: YearDocument): YearDocument['claims'] {
  const rank = paintRanks(document.polities)
  return (
    document.claims
      .filter((claim) => rank.has(claim.polity))
      // Every claim left has a rank (the filter above); `?? 0` only satisfies the indexed lookup.
      .sort((a, b) => (rank.get(a.polity) ?? 0) - (rank.get(b.polity) ?? 0))
  )
}

/**
 * Each claim's rings in its polity's colour, in painting order — the claims of one kind only: the
 * polities that are filled, or the tribes, which are not (`core/editor/tribes`).
 *
 * A claim whose polity has no colour in the map is skipped: `polityColours` gives one to every polity of
 * the registry, so that is a claim naming a polity the registry lacks — which the file could not have been
 * opened with, and which painting in an invented colour would hide.
 * @param document - the document to read
 * @param anchors - the projected anchor table, parallel to `document.anchors`
 * @param colours - each polity's colour, by id
 * @param tribal - the ids of the year's tribes
 * @param tribes - `true` for the tribes' claims, `false` for everyone else's
 * @returns one entry per claim of that kind
 */
function colouredClaims(
  document: YearDocument,
  anchors: readonly Point[],
  colours: ReadonlyMap<string, string>,
  tribal: ReadonlySet<string>,
  tribes: boolean
): { rings: Point[][]; colour: string }[] {
  const out: { rings: Point[][]; colour: string }[] = []
  for (const claim of claimsInPaintOrder(document)) {
    const colour = colours.get(claim.polity)
    if (colour === undefined || tribal.has(claim.polity) !== tribes) continue
    out.push({ rings: projectedRings({ ...document, claims: [claim] }, anchors), colour })
  }
  return out
}

/**
 * Each claim's rings as one fill in its polity's colour — **a tribe's excepted**: a tribe is not yet
 * sovereign, and a fill is the mark of sovereignty (the dev, 2026-10-15).
 * @param document - the document to read
 * @param anchors - the projected anchor table, parallel to `document.anchors`
 * @param colours - each polity's colour, by id
 * @param tribes - the ids of the year's tribes (`tribeIds`), built once per scene
 * @returns one fill per claim of a polity that is not a tribe
 */
export function projectedFills(
  document: YearDocument,
  anchors: readonly Point[],
  colours: ReadonlyMap<string, string>,
  tribes: ReadonlySet<string>
): { rings: Point[][]; colour: string }[] {
  return colouredClaims(document, anchors, colours, tribes, false)
}

/**
 * Each tribe's fade on screen — its image, where its box lands through the view. The images are made once
 * per version of the document (`canvas/tribeFeatherCache`); only this cheap remap runs per repaint.
 * @param feathers - each tribe's image and its box, in backdrop pixels
 * @param viewport - the current view
 * @returns each image with its rectangle in screen pixels
 */
export function projectedTribeFeathers(
  feathers: SceneInputs['tribeFeathers'],
  viewport: Viewport
): CanvasScene['tribeFeathers'] {
  return feathers.map(({ image, box }) => {
    const [left, top] = backdropToScreen(viewport, [box.x, box.y])
    const [right, bottom] = backdropToScreen(viewport, [box.x + box.width, box.y + box.height])
    return { image, rect: { x: left, y: top, width: right - left, height: bottom - top } }
  })
}

/**
 * Each claim's rings with the polity that holds them, in painting order — what the white arrow's click
 * in a fill is tested against (`geometry/fillHit`).
 * @param document - the document to read
 * @param anchors - the projected anchor table, parallel to `document.anchors`
 * @returns one entry per claim
 */
export function projectedTerritories(
  document: YearDocument,
  anchors: readonly Point[]
): PolityRings[] {
  // A claim naming a polity the registry lacks is not painted (`projectedFills`), so it is not
  // selectable either (QUAL-002); and the order is the paint order, so a click lands on the fill seen.
  // A tribe is listed too, though it has no fill: a click inside its outline selects it, which is the only
  // way to select one with the white arrow (review QUAL-004, 2026-10-16).
  return claimsInPaintOrder(document).map((claim) => ({
    polity: claim.polity,
    rings: projectedRings({ ...document, claims: [claim] }, anchors),
  }))
}

/**
 * Each border as the painter takes it: its run on screen, and the hand it is drawn in. A border with a
 * tribe's edge alone — two tribes, or a tribe against the sea or unclaimed ground — is left out: the tribe's
 * fading colour is its limit there. One between a tribe and a state is drawn, the state's (`core/editor/tribes`).
 * @param borders - the derived borders
 * @param anchors - every anchor, projected
 * @param tribes - the ids of the year's tribes
 * @returns the borders to paint
 */
export function projectedBorders(
  borders: readonly DerivedBorder[],
  anchors: readonly Point[],
  tribes: ReadonlySet<string>
): CanvasScene['borders'] {
  return (
    borders
      .filter((border) => !isTribeEdge(border, tribes))
      // Across a tribe a state shows its frontier, never a border between two states.
      .map((border) => asSeenAcrossTribes(border, tribes))
      .map((border) => ({
        points: border.run
          .map((index) => anchors[index])
          .filter((point): point is Point => point !== undefined),
        hand: handFor(border),
        layer: border.relation === 'unclaimed' ? ('unclaimed' as const) : ('borders' as const),
      }))
  )
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
  const tribes = tribeIds(document.polities)
  return {
    backdrop:
      inputs.backdropImage === null
        ? null
        : { image: inputs.backdropImage, rect: backdropRect(inputs.frame, inputs) },
    rings: projectedRings(document, anchors),
    fills: projectedFills(document, anchors, inputs.colours, tribes),
    tribeFeathers: projectedTribeFeathers(inputs.tribeFeathers, inputs.viewport),
    anchors,
    borders: projectedBorders(inputs.borders, anchors, tribes),
    layers: inputs.layers,
    handles: inputs.handles,
    snapAnchors: inputs.snapAnchors,
    extentOutline: inputs.extentOutline.map((run) =>
      run.flatMap((index) => {
        const point = anchors[index]
        return point === undefined ? [] : [point]
      })
    ),
    selected: inputs.selected,
    vectors:
      inputs.vectorLayers === null
        ? null
        : {
            coast: inputs.vectorLayers.coast,
            rivers: inputs.vectorLayers.rivers,
            scale: inputs.viewport.scale,
            originX: inputs.viewport.originX,
            originY: inputs.viewport.originY,
          },
  }
}
