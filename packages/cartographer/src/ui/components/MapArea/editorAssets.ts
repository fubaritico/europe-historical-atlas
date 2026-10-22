import type { Backdrop } from '../../../loaders/backdropSource'
import type { VectorLayers } from '../../../loaders/vectorLayers'
import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * How to fetch and bake the backdrop.
 *
 * A function rather than a ready promise, so the area can supply its own progress sink and show a
 * real wait instead of a guessed one. It is still called **once** — see `MapArea`.
 * @param onProgress - announced before each phase of the bake
 * @returns the drawable backdrop and the frame it defines
 */
export type BackdropLoad = (onProgress: ProgressReport) => Promise<EditorAssets>

/**
 * Everything the canvas needs before it can draw.
 *
 * **Declared here, structurally, rather than imported from whichever module produces it** — the shape
 * the area needs, provided by the caller, as `rules/modular-architecture.md` prescribes. It is
 * also what keeps a test able to hand over a literal.
 */
export interface EditorAssets {
  /** The baked terrain and the frame it defines. */
  backdrop: Backdrop
  /** The coastline and the rivers, in backdrop pixels. */
  vectors: VectorLayers
}
