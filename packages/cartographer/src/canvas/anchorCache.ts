import { projectToBackdrop } from '../viewport/projection'

import type { BackdropFrame } from '../viewport/projection'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The anchor table in backdrop pixels, recomputed only when the anchors change.
 *
 * **It exists because two modules promised it and nothing delivered it** — found in review on
 * 2026-10-06, and the promise was in my own words: `viewport/projection.ts` and `geometry/hitTest.ts` both
 * say the projection *"happens once per viewport change, cached, and the cache belongs to the caller
 * (step 4d)"*. Step 4d's wiring had no cache at all, so every pointer move of a pan reprojected the whole
 * table through a `log(tan(…))` per anchor. At the 16 579 vertices `s01` announces for 1100, that is
 * sixteen thousand transcendental calls a frame. **A documented guard that does not exist is worse than
 * no guard**, which this repository has written down twice already.
 *
 * **Keyed on the edition's version counter and on nothing else.** The document is mutated in place, so
 * its reference never changes and cannot be a key; the counter is the only thing that moves when an
 * anchor does — which is exactly why it exists (see `state/editionSlice.ts`). The viewport is
 * deliberately *not* part of the key: including it would make the cache miss on every move, which is the
 * one operation it is for.
 *
 * **Reference identity is the contract**, and it is what the tests assert: two calls at the same version
 * hand back the *same array*, so "nothing was recomputed" is observable rather than a claim.
 */
export interface AnchorCache {
  /**
   * The anchors in backdrop pixels, parallel to `document.anchors`.
   * @param document - the document to read
   * @param version - the edition's version counter
   * @returns the projected table, recomputed only if the version moved
   */
  anchorsInBackdrop: (document: YearDocument, version: number) => readonly [number, number][]
}

/**
 * Open a cache over one backdrop frame.
 *
 * The frame is fixed for the life of the cache: it is the DEM's grid, which does not change while the
 * editor is open. A new frame means a new cache, which is what step 4d-3 will do when it loads the real
 * asset.
 * @param frame - the backdrop's coordinate system
 * @returns the cache
 */
export function createAnchorCache(frame: BackdropFrame): AnchorCache {
  // `null` rather than an empty array, so the first call is a miss even for a document with no anchors —
  // otherwise an empty document would read as "already computed at version 0" and a first edit at the
  // same version, which cannot happen but need not be relied on, would be missed.
  let projected: readonly [number, number][] | null = null
  let at = Number.NaN
  return {
    anchorsInBackdrop: (document: YearDocument, version: number): readonly [number, number][] => {
      if (projected === null || version !== at) {
        projected = projectToBackdrop(document.anchors, frame)
        at = version
      }
      return projected
    },
  }
}
