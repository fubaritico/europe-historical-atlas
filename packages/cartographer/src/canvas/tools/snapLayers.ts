import type { SnapLayer } from './toolSession'
import type { SnapLine } from '../../geometry/lineSnap'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/**
 * What the Pen needs of a snap layer, in one record — the lines it follows, what they were drawn from,
 * and how a sentence names them. **One table, not one switch per question** (session review ARCH-001):
 * a third layer is one more entry here, and nothing else learns its name.
 */
export interface SnapLayerSpec {
  /** Its lines, in backdrop pixels. */
  lines: readonly SnapLine[]
  /** What they were drawn from, recorded on every anchor snapped onto one. */
  provenance: Provenance
  /** The layer in the console's sentences, which speak English whatever the page — *"no coastline within reach"*. */
  noun: string
  /**
   * One line's own name — a river's, verbatim (*"Maas"*) — by its index, or `null` when it has none: the
   * coast, an unnamed river. The status bar words it in the page's language (`canvasMessages`, `water`).
   * @param line - the line's index in `lines`
   * @returns its name, or `null`
   */
  name: (line: number) => string | null
}

/** A river centreline, as the Pen follows it: a line of the layer, and the name the bar reads. */
export interface RiverLine extends SnapLine {
  /** The river's name as the dataset holds it — `Maas`, not *Meuse* (`H-02`) — or `null`. */
  name: string | null
}

/** What the table is built from — the vector layers' shape, declared here so a test needs no rank. */
export interface SnapSources {
  /** The coast's contours. */
  coast: readonly SnapLine[]
  /** What the coast was traced from. */
  coastProvenance: Provenance
  /** The rivers' centrelines. */
  rivers: readonly RiverLine[]
  /** What the rivers were drawn from. */
  riverProvenance: Provenance
}

/** Every snap layer, by name. */
export type SnapLayers = Record<SnapLayer, SnapLayerSpec>

/**
 * The snap layers of the vector layers the backdrop loaded.
 *
 * **A river's name as the dataset holds it** (`H-02`): `Maas` for the Meuse — `s02` writes *"Following
 * the Maas"*, so no alias table stands in front of it. A river the dataset leaves unnamed is ordinary
 * (25 of its 591 lines); a line index from the same array always resolves, so the `?.` only satisfies
 * the indexed lookup — and this runs on every pointer move, where a log would drown the console.
 * @param vectors - the coast and the rivers, with their provenance
 * @returns the table
 */
export function snapLayersOf(vectors: SnapSources): SnapLayers {
  return {
    coast: {
      lines: vectors.coast,
      provenance: vectors.coastProvenance,
      noun: 'coastline',
      name: () => null,
    },
    river: {
      lines: vectors.rivers,
      provenance: vectors.riverProvenance,
      noun: 'river',
      name: (line) => vectors.rivers[line]?.name ?? null,
    },
  }
}
